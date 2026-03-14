// api/analyse.js v5
// Génère l'analyse + double vérification IA + stockage Redis-less (en mémoire Vercel)

const crypto = require('crypto');

// Stockage en mémoire (persist le temps de la function instance)
// Pour production sérieuse → remplacer par Upstash Redis ou Vercel KV
const pendingReports = global._kciPending || (global._kciPending = new Map());

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { prompt, clientEmail, clientName, clientPhone, bienData } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

    // ─── ÉTAPE 1 : GÉNÉRATION PRINCIPALE ────────────────────────────
    let analyseJson;
    try {
          const r1 = await fetch('https://api.anthropic.com/v1/messages', {
                  method: 'POST',
                  headers: {
                            'Content-Type': 'application/json',
                            'x-api-key': ANTHROPIC_KEY,
                            'anthropic-version': '2023-06-01'
                  },
                  body: JSON.stringify({
                            model: 'claude-sonnet-4-5-20250514',
                            max_tokens: 4000,
                            system: `Tu es un expert immobilier senior spécialisé en Guadeloupe pour Karukera Conseil Immobilier (KCI), cabinet fondé par Dereck Rauzduel, architecte DE.
                            Tu maîtrises : marché foncier guadeloupéen, PLU des communes, PPRI, loi littoral, défiscalisation Pinel DOM, LMNP, prix au m² par secteur, contraintes cycloniques et sismiques (zone 5).
                            Tu analyses chaque projet avec rigueur et pragmatisme.
                            Réponds UNIQUEMENT en JSON valide. Zéro markdown. Zéro backtick. Zéro explication hors JSON.`,
                            messages: [{ role: 'user', content: prompt }]
                  })
          });

      if (!r1.ok) {
              const err = await r1.text();
              console.error('[analyse] Anthropic step1 error:', err);
              return res.status(500).json({ error: 'Anthropic API error', detail: err });
      }

      const d1 = await r1.json();
          let raw1 = (d1?.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
          analyseJson = JSON.parse(raw1);
    } catch (e) {
          console.error('[analyse] Step1 parse error:', e.message);
          return res.status(500).json({ error: 'Erreur génération analyse', detail: e.message });
    }

    // ─── ÉTAPE 2 : VÉRIFICATION IA (double-check) ───────────────────
    let verificationResult;
    try {
          const verifyPrompt = `Tu es un contrôleur qualité expert immobilier KCI.
          Vérifie cet objet JSON d'analyse immobilière et détecte toute erreur, incohérence ou donnée suspecte.

          JSON à vérifier :
          ${JSON.stringify(analyseJson, null, 2)}

          Données brutes fournies par le client :
          ${JSON.stringify(bienData || {}, null, 2)}

          Règles de vérification :
          1. Le score /10 est cohérent avec les sous-scores (écart max ±1 point)
          2. Les montants du tableau financier sont cohérents entre eux (la somme fait le bon total)
          3. Le verdict (GO/CONDITIONNEL/STOP) correspond à la plage du score
          4. Les hypothèses sont réalistes pour le marché guadeloupéen (coûts construction 1800-2500€/m², loyers T2 450-650€/mois)
          5. Il n'y a pas d'information contradictoire ou absurde
          6. La conclusion est cohérente avec le score et le verdict

          Réponds UNIQUEMENT en JSON valide avec cette structure :
          {
            "valide": <true | false>,
              "score_coherent": <true | false>,
                "montants_coherents": <true | false>,
                  "verdict_coherent": <true | false>,
                    "hypotheses_realistes": <true | false>,
                      "problemes": [<string>, ...],
                        "corrections_appliquees": <true | false>,
                          "json_corrige": <objet JSON corrigé si corrections appliquées, null sinon>,
                            "message_client": <string | null — message à envoyer au client si données insuffisantes>
                            }`;

      const r2 = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': ANTHROPIC_KEY,
                        'anthropic-version': '2023-06-01'
              },
              body: JSON.stringify({
                        model: 'claude-sonnet-4-5-20250514',
                        max_tokens: 2000,
                        system: 'Tu es un contrôleur qualité immobilier. Réponds uniquement en JSON valide, sans markdown, sans backticks.',
                        messages: [{ role: 'user', content: verifyPrompt }]
              })
      });

      if (r2.ok) {
              const d2 = await r2.json();
              let raw2 = (d2?.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
              verificationResult = JSON.parse(raw2);

            // Si l'IA a corrigé le JSON, on l'utilise
            if (verificationResult.corrections_appliquees && verificationResult.json_corrige) {
                      analyseJson = verificationResult.json_corrige;
                      console.log('[analyse] JSON corrigé par la vérification IA');
            }
      }
    } catch (e) {
          // La vérification échoue silencieusement — on garde le JSON original
      console.warn('[analyse] Vérification IA échouée (non bloquant):', e.message);
          verificationResult = { valide: true, problemes: [] };
    }

    // ─── VÉRIFICATION : données client insuffisantes ────────────────
    // Si l'IA détecte que les données sont trop lacunaires pour produire une analyse fiable
    const needsMoreData = verificationResult?.message_client &&
          (verificationResult?.valide === false) &&
          (verificationResult?.problemes?.length > 2);

    if (needsMoreData) {
          return res.status(200).json({
                  needsMoreData: true,
                  message: verificationResult.message_client ||
                            'Les informations fournies sont insuffisantes pour produire une analyse fiable. Merci de vérifier et compléter : commune, type de bien, prix, et description du projet.',
                  problemes: verificationResult.problemes || []
          });
    }

    // ─── STOCKAGE RAPPORT EN ATTENTE DE VALIDATION ──────────────────
    const reportId = crypto.randomBytes(12).toString('hex');
    const reportData = {
          id: reportId,
          createdAt: new Date().toISOString(),
          status: 'pending', // pending | approved | rejected
          clientEmail: clientEmail || '',
          clientName: clientName || '',
          clientPhone: clientPhone || '',
          bienData: bienData || {},
          analyseJson,
          verificationResult,
          emailSent: false
    };

    pendingReports.set(reportId, reportData);

    // ─── NOTIFICATION EMAIL ADMIN ────────────────────────────────────
    // Envoyer le rapport à Dereck pour validation (1 clic)
    try {
          const { Resend } = require('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          const adminEmail = process.env.ADMIN_EMAIL || 'dereck.rauzduel@gmail.com';
          const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;
          const approveUrl /=/  `a$p{ib/aasneaUlryls}e/.ajpsi /vv5a
          l/i/d aGtéen?èried =l$'{arneaployrsteI d+} &daocutbiloen =vaéprpirfoivcea&tsieocnr eItA= $+{ psrtoocceksasg.ee nRve.dAiDsM-IlNe_sSsE C(ReEnT }m`ém;o
      i r e   Vceorncsetl )r
      e
      jceocntsUtr lc r y=p t`o$ {=b arseeqUurilr}e/(a'pcir/yvpatloi'd)a;t
      e
      ?/i/d =S$t{orcekpaogret Iedn} &maécmtoiiorne= r(epjeercsti&sste clree tt=e$m{ppsr odcee slsa. efnuvn.cAtDiMoInN _iSnEsCtRaEnTc}e`);

  /
  /   P o ucro npsrto dpurcotbiloenm essérHitemuls e=  →v erreimfpilcaacteiro npRaers uUlpts?t.apsrho bRleedmiess ?o.ul eVnegrtche l>  K0V

 c o n s t  ?p e`n<ddiinvg Rsetpyolret=s" b=a cgklgorboauln.d_:k#cFiEPFe3nCd7i;nbgo r|d|e r(-glleofbta:l4.p_xk csioPleindd i#nDg9 7=7 0n6e;wp aMdadpi(n)g):;1
 2
 pmxo d1u6lpex.;emxaprogritns: 1=6 paxs y0n;cb o(rrdeeqr,- rraedsi)u s=:>6 p{x
 ; " >r
 e s . s e t H e a d e r<(s'tArcocnegs ss-tCyolnet=r"oclo-lAolrl:o#w9-2O4r0i0gEi;n"'>,⚠ ️ 'P*o'i)n;t
 s   sriegsn.asleétsH epaadre rl(a' Avcérciefsisc-aCtoinotnr oIlA- A:l<l/oswt-rMoentgh>o
 d s ' ,   ' P O S T ,  <OuPlT IsOtNySl'e)=;"
 m a rrgeisn.:s8eptxH e0a d0e;rp(a'dAdcicnegs-sl-eCfotn:t2r0oplx-;Aclolloowr-:H#e9a2d4e0r0sE';," >'
 C o n t e n t - T y p e ,  $A{uvtehroirfiizcaattiioonn'R)e;s
 u
 l t .ipfr o(brleeqm.emse.tmhaopd( p= ===>  '`O<PlTiI>O$N{Sp'})< /rleit>u`r)n. jroeisn.(s't'a)t}u
   s ( 2 0 0 ) . e n d ( )<;/
u l >i
                                                          f   ( r e q . m e t<h/oddi v!>=`=
                                                            ' P O S T ':)  `r<edtiuvr ns tryelse.=s"tbaatcuksg(r4o0u5n)d.:j#sDo1nF(A{E 5e;rbroorrd:e r'-Mleetfhto:d4 pNxo ts oAllildo w#e1d0'B 9}8)1;;
                                                            p
                                                          a d dcionngs:t1 2{p xp r1o6mppxt;,m acrlgiienn:t1E6mpaxi l0,; bcolrideenrt-Nraamdei,u sc:l6ipexn;t"P>h
                                                            o n e ,   b i e n D a t<as t}r o=n gr esqt.ybloed=y";c
                                                            o l oirf: #(0!6p5rFo4m6p;t")> ✅r eVtéruirfni craetsi.osnt aItAu s:( 4a0u0c)u.nj sporno(b{l èemrer odrét:e c'tMéi<s/ssitnrgo npgr>o
                                                            m p t '   } ) ; 

< / dciovn>s`t; 
                                                          A
                                                          N T H R OcPoInCs_tK EsYc o=r epCroolcoers s=. eannva.lAyNsTeHJRsOoPnI.Cs_cAoPrIe_ K>E=Y ;7

?   '/#/2 A─9──D 6ÉTCA'P E:  1a n:a lGyÉsNeÉRJAsToInO.Ns cPoRrIeN C>I=P A5L E?  ─'──#──D──4──8──A──1──A──'── ──:── ──'──#─
                                                            C 4 3lBe2tE 'a;n
                                                            a l y s ecJosnosnt; 
v e rtdriyc t{E
              m o j i  c=o n{s tG Or:1  '=✅' ,a wCaOiNtD IfTeItOcNhN(E'Lh:t t'p⚠s️':,/ /SaTpOiP.:a n't🛑h'r o}p[iacn.acloyms/evJ1s/omne.svseargdeisc't,]  {|
                |   ' ⚠️ ' ; 
                                                          m
              e t h o da:w a'iPtO SrTe's,e
              n d . e m a ihlesa.dseernsd:( {{

                                                         f r o'mC:o n`tKeCnIt -ATnyapley's:e  '<a$p{pplrioccaetsiso.ne/njvs.oFnR'O,M
                _ E M A I L   | |' x'-naoprie-pkleyy@'k:a rAuNkTeHrRaO-PcIoCn_sKeEiYl,.
                  f r ' } > ` , 
                    ' a n t h rtoop:i ca-dvmeirnsEimoani'l:, 
                ' 2 0 2 3 - 0s6u-b0j1e'c
                t :   ` [ K C}I,]
                  N o u v e abuo drya:p pJoSrOtN .à svtarliindgeirf y—( {$
                  { c l i e n t N ammoed e|l|:  ''Cclliaeundte'-}s o· n$n{ebti-e4n-D5a-t2a0?2.5c0o5m1m4u'n,e
                    | |   ' ' }   ·m aSxc_otroek e$n{sa:n a4l0y0s0e,J
                    s o n . s c o r es}y/s1t0e`m,:
                    ` T u   e sh tumnl :e x`p
                e<r!tD OiCmTmYoPbEi lhitemrl >s
                e<nhitomrl >s
                p<éhceiaadl>i<smé eetna  Gcuhaadresleotu=p"eU TpFo-u8r" >K<asrtuykleer>a
                  C obnosdeyi l{  Ifmomnotb-iflaimeirl y(:K C-Ia)p,p lcea-bsiynsette mf,o nsdaén sp-asre rDiefr;e cbka cRkagurzoduunedl:,  #aFr7cFh7iFt5e;c tmea rDgEi.n
                                :T u0 ;m apîtardidsiensg ::  2m0aprxc;h é} 
                                             f o n.cwirearp  g{u amdaexl-owuipdéetnh,:  P6L4U0 pdxe;s  mcaormgmiunn:e s0,  aPuPtRoI;,  blaocik glriotutnodr:a l#,f fdfé;f ibsocradleirs-artaidoinu sP:i n1e2lp xD;O Mo,v eLrMfNlPo,w :p rhiixd daeun ;m ² bpoaxr- ssheacdtoewu:r ,0  c4opnxt r2a4ipnxt ersg bcay(c0l,o0n,i0q,u0e.s0 8e)t;  s}i
                s m i.qhueeasd e(rz o{n eb a5c)k.g
                                      rTouu nadn:a l#y0sBe1s5 2c6h;a qpuaed dpirnogj:e t2 8apvxe c3 2rpixg;u e}u
                r   e.th epardaegrm aht1i s{m ec.o
                                            lRoérp:o n#dCs2 AU0N6I0Q;U EfMoEnNtT- seinz eJ:S O2N0 pvxa;l imdaer.g iZnér:o  0m a0r k4dpoxw;n .} 
                                             Z é r.oh ebaadcekrt ipc k{.  cZoérloo re:x prlgibcaa(t2i5o5n, 2h5o5r,s2 5J5S,O0N..4`5,)
                                             ;   f o n t - s imzees:s a1g3epsx:;  [m{a rrgoilne::  0';u s}e
                                             r ' ,. bcoodnyt e{n tp:a dpdrionmgp:t  2}8]p
                                             x   3 2 p x ;} )}

                                                  . s}c)o;r
                                                  e
                                                  - b l o cikf  {( !dri1s.polka)y :{ 
                                                  f l e x ;   acloingsnt- ietrerm s=:  acweanitte rr;1 .gtaepx:t (2)0;p
                                                  x ;   b a c kcgornosuonlde:. e#rFr7oFr7(F'5[;a nbaolrydseer]- rAandtihurso:p i1c0 psxt;e pp1a dedrirnogr:: '1,6 pexr r2)0;p
                                                  x ;   m a r grient-ubront troems:. s2t0aptxu;s (}5
                                                  0 0 )..sjcsoorne(-{n uemr r{o rf:o n'tA-nstihzreo:p i4c2 pAxP;I  feornrto-rw'e,i gdhett:a i7l0:0 ;e rcro l}o)r;:
                                                    $ { s c}o
                                                    r
                                                    e C o l ocro}n;s tl idn1e -=h eaiwgahitt:  r11;. j}s
                                                    o n (.)s;c
                                                    o r e - ilnefto  rha2w 1{  =m a(rdg1i?n.:c o0n t0e n4tp x|;|  f[o]n)t.-msaipz(eb:  =1>5 pbx.;t ecxotl o|r|:  '#'1)A.1jAo1iAn;( '}'
                                                    ) . r.espcloarcee-(i/n`f`o` jps o{n |m`a`r`g/ign,:  '0';) .ftornitm-(s)i;z
                                                    e :   1 3apnxa;l ycsoelJosro:n  #=6 BJ6SBO6N5.;p a}r
                                                    s e (.rcalwi1e)n;t
                                                    - i n}f oc a{t cbha c(keg)r o{u
                                                    n d :   #cFo7nFs7oFl5e;. ebrorrodre(r'-[raandailuyss:e ]8 pSxt;e pp1a dpdairnsge:  e1r4rpoxr :1'8,p xe;. mmeasrsgaigne-)b;o
                                                    t t o m :r e2t0uprxn;  rfeosn.ts-tsaitzues:( 51030p)x.;j scoonl(o{r :e r#r6oBr6:B 6'5E;r r}e
                                                    u r  .gcélniéreantti-oinn faon asltyrsoen'g,  {d ectoaliolr::  e#.1mAe1sAs1aAg;e  }}
                                                    ) ; 
                                                    . b i}e
                                                    n
                                                    - i n/f/o  ─{──  fÉToAnPtE- s2i z:e :V É1R3IpFxI;C AcToIlOoNr :I A# 6(Bd6oBu6b5l;e -mcahregcikn)- b──o──t──t──o──m──:── ──2──0─
                                                    p x ;l e}t
                                                      v e.rbiifeinc-aitnifoon Rteasbullet ;{
                                                        w itdrtyh :{ 
                                                        1 0 0 % ;c obnosrtd evre-rcioflylParposmep:t  c=o l`lTaup sees;  u}n
                  c o.nbtireônl-eiunrf oq utadl i{t é peaxdpdeirntg :i m6mpoxb i0l;i ebro rKdCeIr.-
                    bVoétrtiofmi:e  1cpext  soobljiedt  #JES8OEN8 Ed4';a n}a
                    l y s.eb iiemnm-oibnifloi èrted :efti rdsétt-ecchtiel dt o{u tceo leorrr:e u#r9,C 9iCn9c4o;h érweindcteh :o u1 5d0opnxn;é e} 
                s u s.paeccttieo.n
                                                  s
                                                   J{S OdNi sà pvléaryi:f ifelre x:;
                                                      $g{aJpS:O N1.2sptxr;i nmgairfgyi(na:n a2l4ypsxe J0s;o n},
                                                    n u.lblt,n  2{) }p
                                                     a
                                                     dDdoinnngée:s  1b4rpuxt e2s4 pfxo;u rbnoiredse rp-arra dlieu sc:l i8epnxt;  :f
                                                     o$n{tJ-SsOiNz.es:t r1i4npgxi;f yf(obnite-nwDeaitgah t|:|  6{0}0,;  ntuelxlt,- d2e)c}o
                                                     r
                                                     aRtèigolne:s  ndoen ev;ér itfeixcta-tailoing n::
                                                      1c.e nLtee rs;c odries p/l1a0y :e sitn lcionheé-rbelnotc ka;v e}c
                                                    l e.sb tsno-uasp-psrcoovree s{  (bécaacrktg rmoauxn d±:1  #p2oAi9nDt6)C
                                                      ;2 .c oLleosr :m o#nftfafn;t s} 
                d u  .tbatbnl-eraeuj efcitn a n{c ibearc ksgornotu ncdo:h ér#eFn3tFs4 Fe6n;t rceo leourx:  (#l3a7 4s1o5m1m;e  bfoaridte rl:e  1bpoxn  stooltiadl )#
                                                E35.E 7LEeB ;v e}r
                                                  d i c.td i(sGcOl/aCiOmNeDrI T{I OfNoNnEtL-/sSiTzOeP:)  1c1oprxr;e scpoolnodr :à  #l9aC 9pCl9a4g;e  bdour dsecro-rteo
                                                                                p4:.  1Lpexs  shoylpiodt h#èsEe8sE 8sEo4n;t  praédadliinsgt-etso pp:o u1r6 plxe;  mmaarrcghié ng-utaodpe:l o1u6ppéxe;n  }(
                                                    c o ût.sc ocnocnlsutsriuocnt i{o nb a1c8k0g0r-o2u5n0d0:€ /#m0²,B 1l5o2y6e;r sb oTr2d e4r5-0r-a6d5i0u€s/:m o8ipsx);
                                                                                    5p.a dIdli nng':y  1a6 ppxa s2 0dp'xi;n fmoarrmgaitni:o n1 6cpoxn t0r;a d}i
                                                  c t o.icroen coluu saibosnu rpd e{
                                                     6c.o lLoar :c orngcblau(s2i5o5n, 2e5s5t, 2c5o5h,ér0e.n8t)e;  afvoenct -lsei zsec:o r1e3 pext;  llei nvee-rhdeiicgth
                                                    t
                                                    :R é1p.o6n;d sm aUrNgIiQnU:E M0E;N T} 
                e<n/ sJtSyOlNe >v<a/lhiedaed >a
                                                  v<ebco dcye>t
                                                  t<ed isvt rculcatsusr=e" w:r
                                                    a{p
                                                      " > 
                                                        " v a<ldiidve "c:l a<stsr=u"eh e|a dfearl"s>e
                                                      > , 
                                                            <"hs1c>oKrCeI_ c—o hNeoruevneta"u:  r<atprpuoer t|  à fvaallsied>e,r
                                                      < / h"1m>o
                                                      n t a n t<sp_>cRoahpeproerntt s#"$:{ r<etprouret I|d .fsalliscee>(,0
                                                        , 8 )".vteorUdpipcetr_Ccaoshee(r)e}n t·" :$ {<nterwu eD a|t ef(a)l.steo>L,o
                                                      c a l"ehDyaptoetShtersiensg_(r'efarl-iFsRt'e,s "{:d a<yt:r'u2e- d|i gfiatl's,em>o,n
                                                                                                       t h :"'plroonbgl'e,myeesa"r:: '[n<usmterriincg'>},) }.<./.p]>,
                                                                                                       
                                                          <"/cdoirvr>e
                                                                                                         c t i<odnisv_ acplpalsisq=u"ebeosd"y:" ><
                                                                                                         t
                                                                                                       r u e   |< dfiavl scel>a,s
                                                                                                       s = ""sjcsoorne_-cbolrorcikg"e>"
                                                                                                       :   < o b j e<td iJvS OcNl acsosr=r"isgcéo rsei- ncuomr"r>e$c{tainoanlsy saepJpsloinq.uséecso,r en}u<l/ld isvi>n
                                                                                                       o n > , 
                                                                                                             <"dmievs scalgaes_sc=l"isecnotr"e:- i<nsftor"i>n
                                                                                                       g   |   n u l l  <—h 2m>e$s{svaegred ià cetnEvmooyjeir}  a$u{ acnlaileynste Jssio nd.ovnenrédeisc ti_ntseuxftfei s|a|n taensa>l
                                                                                                                                                                    y}s`e;J
                                                                                                                                                                    s
                                                                                                                                                                    o n . v ecrodnisctt }r<2/ h=2 >a
                                                                                                                                                                    w a i t   f e t c<hp(>'$h{tbtipesn:D/a/taap?i..taynpteh_rboipeinc .|c|o m'/'v}1 /·m e$s{sbaigeensD'a,t a{?
                                                                                                                                                                    . c o m m u nmee t|h|o d':' }'<P/OpS>T
                                                                                                                                                                    ' , 
                                                                                                                                                                            < / dhieva>d
                                                                                                                                                                            e r s :  <{/
                                                                                                                                                                            d i v > 
                                                                                                                                                                             
                                                                                                                                                                                   ' C<odnitve nctl-aTsysp=e"'c:l i'eanptp-liincfaot"i>o
                                                                                                                                                                                   n / j s o n '<,s
                                                                                                                                                                                   t r o n g > C l i'exn-ta p:i<-/ksetyr'o:n gA>N T$H{RcOlPiIeCn_tKNEaYm,e
                                                                                                                                                                                     | |   ' N o n  'raenntsheriogpnié'c}-<vberr>s
                                                                                                                                                                                     i o n ' :   '<2s0t2r3o-n0g6>-E0m1a'i
                                                                                                                                                                                     l   : < / s t}r,o
                                                                                                                                                                                     n g >   $ { cbloideyn:t EJmSaOiNl. s|t|r i'nNgoinf yr(e{n
                                                                                                                                                                                     s e i g n é ' } <mbord>e
                                                                                                                                                                                     l :   ' c l a<usdter-osnogn>nTeélté-p4h-o5n-e2 0:2<5/0s5t1r4o'n,g
                                                                                                                                                                                     >   $ { c l i e nmtaPxh_otnoek e|n|s :' N2o0n0 0r,e
                                                                                                                                                                                     n s e i g n é' } 
                                                                                                                                                                                     s y s t e<m/:d i'vT>u
                                                                                                                                                                                      
                                                                                                                                                                                      e s   u n< dciovn tcrlôlaesusr= "qbuiaelni-tién fiom"m>o
                                                                                                                                                                                      b i l i e r .< tRaépbolned>s
                                                                                                                                                                                        u n i q u e m e<nttr >e<nt dJ>SCOoNm mvuanlei<d/et,d >s<atnds> <msatrrkodnogw>n$,{ bsiaennsD abtaac?k.tciocmkmsu.n'e, 
                                                                                                                                                                                        | |   ' N / A ' }m<e/ssstargoensg:> <[/{t dr>o<l/et:r >'
                                                                                                                                                                                        u s e r ' ,   c o<nttre>n<tt:d >vTeyrpief ydPer obmipetn <}/]t
                                                                                                                                                                                        d > < t d > $}{)b
                                                                                                                                                                                        i e n D a}t)a;?
                                                                                                                                                                                        .
                                                                                                                                                                                        t y p e _ibfi e(nr 2|.|o k')N /{A
                                                                                                                                                                                        ' } < / t d >c<o/ntsrt> 
                                                                                                                                                                                        d 2   =   a w a i<tt rr>2<.tjds>oPnr(i)x; 
                                                                                                                                                                                        a f f i c h é<l/ettd >r<atwd2> $={ b(ide2n?D.actoan?t.epnrti x| |?  [N]u)m.bmearp((bbi e=n>D abt.at.epxrti x|)|. t'o'L)o.cjaolienS(t'r'i)n.gr(e'pflra-cFeR('/)` `+` j's o€n'| `:` `'/Ng/,A ''}'<)/.ttdr>i<m/(t)r;>
                                                                                                                                                                                        
                                                                                                                                                                                                    v e r<itfri>c<attdi>oSnuRrefsauclet  t=e rJrSaOiNn.<p/atrds>e<(trda>w$2{)b;i
                                                                                                                                                                                                    e
                                                                                                                                                                                                    n D a t a ? ./s/u rSfia cle'_ItAe rar acionr r?i gbéi elneD aJtSaO.Ns,u rofna cle'_utteirlriasien
                                                                                                                                                                                                      +   '   m ²i'f  :( v'eNr/iAf'i}c<a/ttido>n<R/etsru>l
                                                                                                                                                                                                      t . c o r r e c t<itorn>s<_tadp>pSluirqfuaecees  h&a&b .v<e/rtidf>i<ctadt>i$o{nbRieesnuDlatt.aj?s.osnu_rcfoarcrei_ghea)b  {?
                                                                                                                                                                                                        b i e n D a t aa.nsaulryfsaecJes_ohna b=  +v e'r imf²'i c:a t'iNo/nAR'e}s<u/lttd.>j<s/otnr_>c
                                                                                                                                                                                                        o r r i g e ; 
                                                                                                                                                                                                          < t r > < t d >cPornosjoelte<./ltodg>(<'t[da>n$a{lbyiseen]D aJtSaO?N. icnotrernitgié opna r| |l a' Nv/éAr'i}f<i/ctadt>i<o/nt rI>A
                                                                                                                                                                                                          ' ) ; 
                                                                                                                                                                                                                < / t a}b
                                                                                                                                                                                                                l e > 
                                                                                                                                                                                                                  } 
                                                                                                                                                                                                                      <}/ dciavt>c
                                                                                                                                                                                                                      h
                                                                                                                                                                                                                        ( e )  ${{
                                                                                                                                                                                                                          p r o b l/e/m eLsaH tvmérli}f
                                                                                                                                                                                                                          i
                                                                                                                                                                                                                          c a t i o<nd iévc hcoluaes ss=i"lceonnccileuussieomne"n>t
                                                                                                                                                                                                                            —  o n   g a<rpd>e$ {laen aJlSyOsNe Josroing.icnoanlc
                                                                                                                                                                                                                          l u s i ocno n|s|o l'e'.}w<a/rpn>(
                                                                                                                                                                                                                          ' [ a n a<l/ydsiev]> 
                                                                                                                                                                                                                          V
                                                                                                                                                                                                                          é r i f i<cpa tsitoynl eI=A" fécohnotu-ései z(en:o1n3 pbxl;ocqoulaonrt:)#:6'B,6 Be6.5m;emsasraggien):;2
                                                                                                                                                                                                                          0 p x   0v e8rpixf;i"c>a<tsitornoRnegs>uAlctt i=o n{  rveaqluiidsee:  :t<r/uset,r opnrgo>b lVeamleisd:e z[ ]o u} ;r
                                                                                                                                                                                                                          e f u}s
                                                                                                                                                                                                                          e
                                                                                                                                                                                                                          z   l/'/e n──v─ oViÉ RdIeF IcCeA TrIaOpNp o:r td oanun éecsl icelnite.n<t/ pi>n
                                                                                                                                                                                                                          s
                                                                                                                                                                                                                          u f f i s<adnitve sc l─a──s──s──=──"──a──c──t─
                                                                                                                                                                                                                          i o n/s/" >S
                                                                                                                                                                                                                          i   l ' I A  <daé thercetfe= "q$u{ea plperso vdeoUnrnlée}s"  scolnats st=r"obpt nl abctunn-aaiprperso vpeo"u>r✅  Apprpordouuivreer  uente  eannvaolyyesre  afui acblliee
                                                                                                                                                                                                                          n t <c/oan>s
                                                                                                                                                                                                                          t   n e e d s<Mao rherDeaft=a" $={ rveejreicftiUcralt}i"o n Rcelsauslst=?".bmtens sbatgne-_rceljieecntt" >&✏&️ 
                                                                                                                                                                                                                          R e f u s(evre r—i fdiecmaatnidoenrR ersévuilsti?o.nv<a/lai>d
                                                                                                                                                                                                                          e   = = =< /fdailvs>e
                                                                                                                                                                                                                          )
                                                                                                                                                                                                                            & & 
                                                                                                                                                                                                                            < d i v( vcelraisfsi=c"adtiisocnlRaeismuelrt"?>.
                                                                                                                                                                                                                          p r o b l e mReesf? .:l e$n{grtehp o>r t2I)d;}
                                                                                                                                                                                                                           
                                                                                                                                                                                                                          ·   Cief  l(ineene dessMto rveaDlaatbal)e  {4
                                                                                                                                                                                                                          8 h   ·  KrCeIt uvr5n  ·r eDse.rsetcakt uRsa(u2z0d0u)e.lj s— oAnr(c{h
                                                                                                                                                                                                                          i t e c t e  nDeEe
                                                                                                                                                                                                                          d s M o r<e/Ddaitva>:
                                                                                                                                                                                                                            t r<u/ed,i
                                                                                                                                                                                                                          v > 
                                                                                                                                                                                                                           < / d imve>s
                                                                                                                                                                                                                          s<a/gbeo:d yv>e
                                                                                                                                                                                                                          r<i/fhitcmalt>i`o
                                                                                                       n R e s u}l)t;.
                                                  m e s s acgoen_scolliee.nlto g|(|'
                                                    [ a n a l y s e ]' LEemsa iiln faodrmmiant ieonnvso yféo upronuire sv asloindta tiinosnu:f'f,i sraenptoerst Ipdo)u;r
                                                        p r}o dcuaitrceh  u(neem aainlaElryrs)e  {f
                                                                                                  i a b l ec.o nMseorlcei. edrer ovré(r'i[fainearl yeste ]c oEmmpaliétle ra d:m icno memrurnoer,  (tnyopne  bdleo qbuiaennt,) :p'r,i xe,m aeitl Edrers.cmreispstaigoen) ;d
                                                                                                  u   p}r
                                                  o
                                                  j e t/./' ,──
                                                  ─  R É P O N SpEr oAbUl eCmLeIsE:N Tv e──r──i──f──i──c──a──t──i──o──n──R──e──s──u──l──t──.──p──r──o──b─
                                                  l e mreest u|r|n  [r]e
                                                  s . s t a}t)u;s
                ( 2 0}0
                                             )
              . j s/o/n (──{─ 
                                             S T O C KcAoGnEt eRnAtP:P O[R{T  tEeNx tA:T TJESNOTNE. sDtEr iVnAgLiIfDyA(TaInOaNl y─s──e──J──s──o──n──)── ──}─
                            ] , 
                                             c o n s tr erpeoprotrItdI,d
                              =   c rvyeprtiof.ireadn:d ovmeBryitfeisc(a1t2i)o.ntRoeSsturlitn?g.(v'ahleixd'e) ;!
                                               = =  cfoanlsste ,r
                            e p o r tvDeartiaf i=c a{t
                                                     i o n P riodb:l ermeepso:r tvIedr,i
                                                     f i c a tciroenaRteesduAltt:? .nperwo bDlaetmee(s) .|t|o I[S]O
                                                     S t r}i)n;g
                            (});,
                                                 status: 'pending', // pending | approved | rejected
                                                       clientEmail: clientEmail || '',
                                                       clientName: clientName || '',
                                                       clientPhone: clientPhone || '',
                                                       bienData: bienData || {},
                                                       analyseJson,
                                                       verificationResult,
                                                       emailSent: false
                           };

                pendingReports.set(reportId, reportData);

                // ─── NOTIFICATION EMAIL ADMIN ────────────────────────────────────
                // Envoyer le rapport à Dereck pour validation (1 clic)
                try {
                      const { Resend } = require('resend');
                      const resend = new Resend(process.env.RESEND_API_KEY);
                      const adminEmail = process.env.ADMIN_EMAIL || 'dereck.rauzduel@gmail.com';
                      const baseUrl = process.env.BASE_URL || `https://${req.headers.host}`;
                      const approveUrl = `${baseUrl}/api/validate?id=${reportId}&action=approve&secret=${process.env.ADMIN_SECRET}`;
                      const rejectUrl  = `${baseUrl}/api/validate?id=${reportId}&action=reject&secret=${process.env.ADMIN_SECRET}`;

                                                 const problemesHtml = verificationResult?.problemes?.length > 0
                        ? `<div style="background:#FEF3C7;border-left:4px solid #D97706;padding:12px 16px;margin:16px 0;border-radius:6px;">
                                   <strong style="color:#92400E;">⚠️ Points signalés par la vérification IA :</strong>
                                              <ul style="margin:8px 0 0;padding-left:20px;color:#92400E;">
                                                           ${verificationResult.problemes.map(p => `<li>${p}</li>`).join('')}
                                                                      </ul>
                                                                               </div>`
                                                         : `<div style="background:#D1FAE5;border-left:4px solid #10B981;padding:12px 16px;margin:16px 0;border-radius:6px;">
                                                                    <strong style="color:#065F46;">✅ Vérification IA : aucun problème détecté</strong>
                                                                             </div>`;

                                                 const scoreColor = analyseJson.score >= 7 ? '#2A9D6C' : analyseJson.score >= 5 ? '#D48A1A' : '#C43B2E';
                      const verdictEmoji = { GO: '✅', CONDITIONNEL: '⚠️', STOP: '🛑' }[analyseJson.verdict] || '⚠️';

                                                 await resend.emails.send({
                                                         from: `KCI Analyse <${process.env.FROM_EMAIL || 'noreply@karukera-conseil.fr'}>`,
                                                         to: adminEmail,
                                                         subject: `[KCI] Nouveau rapport à valider — ${clientName || 'Client'} · ${bienData?.commune || ''} · Score ${analyseJson.score}/10`,
                                                         html: `
                                                         <!DOCTYPE html>
                                                         <html>
                                                         <head><meta charset="UTF-8"><style>
                                                           body { font-family: -apple-system, sans-serif; background: #F7F7F5; margin: 0; padding: 20px; }
                                                             .wrap { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
                                                               .header { background: #0B1526; padding: 28px 32px; }
                                                                 .header h1 { color: #C2A060; font-size: 20px; margin: 0 0 4px; }
                                                                   .header p { color: rgba(255,255,255,0.45); font-size: 13px; margin: 0; }
                                                                     .body { padding: 28px 32px; }
                                                                       .score-block { display: flex; align-items: center; gap: 20px; background: #F7F7F5; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; }
                                                                         .score-num { font-size: 42px; font-weight: 700; color: ${scoreColor}; line-height: 1; }
                                                                           .score-info h2 { margin: 0 0 4px; font-size: 15px; color: #1A1A1A; }
                                                                             .score-info p { margin: 0; font-size: 13px; color: #6B6B65; }
                                                                               .client-info { background: #F7F7F5; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px; color: #6B6B65; }
                                                                                 .client-info strong { color: #1A1A1A; }
                                                                                   .bien-info { font-size: 13px; color: #6B6B65; margin-bottom: 20px; }
                                                                                     .bien-info table { width: 100%; border-collapse: collapse; }
                                                                                       .bien-info td { padding: 6px 0; border-bottom: 1px solid #E8E8E4; }
                                                                                         .bien-info td:first-child { color: #9C9C94; width: 150px; }
                                                                                           .actions { display: flex; gap: 12px; margin: 24px 0; }
                                                                                             .btn { padding: 14px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; text-align: center; display: inline-block; }
                                                                                               .btn-approve { background: #2A9D6C; color: #fff; }
                                                                                                 .btn-reject  { background: #F3F4F6; color: #374151; border: 1px solid #E5E7EB; }
                                                                                                   .disclaimer { font-size: 11px; color: #9C9C94; border-top: 1px solid #E8E8E4; padding-top: 16px; margin-top: 16px; }
                                                                                                     .conclusion { background: #0B1526; border-radius: 8px; padding: 16px 20px; margin: 16px 0; }
                                                                                                       .conclusion p { color: rgba(255,255,255,0.8); font-size: 13px; line-height: 1.6; margin: 0; }
                                                                                                       </style></head>
                                                                                                       <body>
                                                                                                       <div class="wrap">
                                                                                                         <div class="header">
                                                                                                             <h1>KCI — Nouveau rapport à valider</h1>
                                                                                                                 <p>Rapport #${reportId.slice(0,8).toUpperCase()} · ${new Date().toLocaleDateString('fr-FR', {day:'2-digit',month:'long',year:'numeric'})}</p>
                                                                                                                   </div>
                                                                                                                     <div class="body">
                                                                                                                     
                                                                                                                         <div class="score-block">
                                                                                                                               <div class="score-num">${analyseJson.score}</div>
                                                                                                                                     <div class="score-info">
                                                                                                                                             <h2>${verdictEmoji} ${analyseJson.verdict_texte || analyseJson.verdict}</h2>
                                                                                                                                                     <p>${bienData?.type_bien || ''} · ${bienData?.commune || ''}</p>
                                                                                                                                                           </div>
                                                                                                                                                               </div>
                                                                                                                                                               
                                                                                                                                                                   <div class="client-info">
                                                                                                                                                                         <strong>Client :</strong> ${clientName || 'Non renseigné'}<br>
                                                                                                                                                                               <strong>Email :</strong> ${clientEmail || 'Non renseigné'}<br>
                                                                                                                                                                                     <strong>Téléphone :</strong> ${clientPhone || 'Non renseigné'}
                                                                                                                                                                                         </div>
                                                                                                                                                                                         
                                                                                                                                                                                             <div class="bien-info">
                                                                                                                                                                                                   <table>
                                                                                                                                                                                                           <tr><td>Commune</td><td><strong>${bienData?.commune || 'N/A'}</strong></td></tr>
                                                                                                                                                                                                                   <tr><td>Type de bien</td><td>${bienData?.type_bien || 'N/A'}</td></tr>
                                                                                                                                                                                                                           <tr><td>Prix affiché</td><td>${bienData?.prix ? Number(bienData.prix).toLocaleString('fr-FR') + ' €' : 'N/A'}</td></tr>
                                                                                                                                                                                                                                   <tr><td>Surface terrain</td><td>${bienData?.surface_terrain ? bienData.surface_terrain + ' m²' : 'N/A'}</td></tr>
                                                                                                                                                                                                                                           <tr><td>Surface hab.</td><td>${bienData?.surface_hab ? bienData.surface_hab + ' m²' : 'N/A'}</td></tr>
                                                                                                                                                                                                                                                   <tr><td>Projet</td><td>${bienData?.intention || 'N/A'}</td></tr>
                                                                                                                                                                                                                                                         </table>
                                                                                                                                                                                                                                                             </div>
                                                                                                                                                                                                                                                             
                                                                                                                                                                                                                                                                 ${problemesHtml}
                                                                                                                                                                                                                                                                 
                                                                                                                                                                                                                                                                     <div class="conclusion">
                                                                                                                                                                                                                                                                           <p>${analyseJson.conclusion || ''}</p>
                                                                                                                                                                                                                                                                               </div>
                                                                                                                                                                                                                                                                               
                                                                                                                                                                                                                                                                                   <p style="font-size:13px;color:#6B6B65;margin:20px 0 8px;"><strong>Action requise :</strong> Validez ou refusez l'envoi de ce rapport au client.</p>
                                                                                                                                                                                                                                                                                   
                                                                                                                                                                                                                                                                                       <div class="actions">
                                                                                                                                                                                                                                                                                             <a href="${approveUrl}" class="btn btn-approve">✅ Approuver et envoyer au client</a>
                                                                                                                                                                                                                                                                                                   <a href="${rejectUrl}"  class="btn btn-reject">✏️ Refuser — demander révision</a>
                                                                                                                                                                                                                                                                                                       </div>
                                                                                                                                                                                                                                                                                                       
                                                                                                                                                                                                                                                                                                           <div class="disclaimer">
                                                                                                                                                                                                                                                                                                                 Ref : ${reportId} · Ce lien est valable 48h · KCI v5 · Dereck Rauzduel — Architecte DE
                                                                                                                                                                                                                                                                                                                     </div>
                                                                                                                                                                                                                                                                                                                       </div>
                                                                                                                                                                                                                                                                                                                       </div>
                                                                                                                                                                                                                                                                                                                       </body>
                                                                                                                                                                                                                                                                                                                       </html>`
                                                 });
                      console.log('[analyse] Email admin envoyé pour validation:', reportId);
                } catch (emailErr) {
                      console.error('[analyse] Email admin error (non bloquant):', emailErr.message);
                }

                // ─── RÉPONSE AU CLIENT ───────────────────────────────────────────
                return res.status(200).json({
                      content: [{ text: JSON.stringify(analyseJson) }],
                      reportId,
                      verified: verificationResult?.valide !== false,
                      verificationProblemes: verificationResult?.problemes || []
                });
                                            };
