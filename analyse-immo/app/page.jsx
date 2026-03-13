"use client";
import { useState } from "react";

const STEPS = [
  { id: 1, label: "Vous" },
  { id: 2, label: "Le bien" },
  { id: 3, label: "Le projet" },
  { id: 4, label: "Contexte" },
];

const propertyTypes = ["Terrain nu","Maison individuelle","Immeuble de rapport","Appartement","Local commercial","Autre"];
const projectIntents = ["Achat–revente (marchand de biens)","Location longue durée","Location courte durée / Airbnb","Construction neuve","Division parcellaire","Rénovation + revente"];
const budgetRanges = ["< 100 000 €","100 000 – 250 000 €","250 000 – 500 000 €","500 000 – 1 000 000 €","> 1 000 000 €"];

export default function IntakeForm() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    firstName:"",lastName:"",email:"",phone:"",
    location:"",propertyType:"",landArea:"",livingArea:"",askingPrice:"",
    budgetRange:"",projectIntent:"",urgency:"",context:"",constraints:"",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggle = (k, v) => setForm((f) => ({ ...f, [k]: f[k] === v ? "" : v }));
  const canNext = () => {
    if (step === 1) return form.firstName && form.email;
    if (step === 2) return form.location && form.propertyType;
    if (step === 3) return form.projectIntent;
    return true;
  };
  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  const handleSubmit = async () => {
    setSending(true);
    try {
      await fetch("https://formspree.io/f/REMPLACE_PAR_TON_ID", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          _subject: `Nouvelle demande d'analyse — ${form.firstName} — ${form.location}`
        }),
      });
    } catch (e) { console.error(e); }
    setSending(false);
    setSubmitted(true);
  };

  if (submitted) return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.successIcon}>✓</div>
        <h2 style={s.successTitle}>Demande reçue</h2>
        <p style={s.successText}>
          Votre pré-étude sera livrée sous <strong>24h</strong> à <strong>{form.email}</strong>.
        </p>
        <div style={s.tagRow}>
          {[form.propertyType, form.location, form.projectIntent].filter(Boolean).map(t => (
            <span key={t} style={s.tag}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.logo}>DA</div>
        <div>
          <div style={s.brandName}>Analyse Immobilière</div>
          <div style={s.brandSub}>Pré-étude de faisabilité · 24h</div>
        </div>
      </div>

      <div style={s.progressWrap}>
        <div style={s.progressBar}>
          <div style={{...s.progressFill, width:`${progress}%`}} />
        </div>
        <div style={s.steps}>
          {STEPS.map(st => (
            <div key={st.id} style={s.stepItem}>
              <div style={{...s.stepDot,...(step>st.id?s.stepDone:{}),...(step===st.id?s.stepActive:{})}}>
                {step>st.id?"✓":st.id}
              </div>
              <span style={{...s.stepLabel,...(step===st.id?s.stepLabelActive:{})}}>{st.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={s.card}>
        {step===1 && (
          <div style={s.section}>
            <h2 style={s.stepTitle}>Vos coordonnées</h2>
            <p style={s.stepDesc}>Pour recevoir votre rapport personnalisé.</p>
            <div style={s.row}>
              <div style={s.field}>
                <label style={s.label}>Prénom *</label>
                <input style={s.input} value={form.firstName} onChange={set("firstName")} placeholder="Jean" />
              </div>
              <div style={s.field}>
                <label style={s.label}>Nom</label>
                <input style={s.input} value={form.lastName} onChange={set("lastName")} placeholder="Dupont" />
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Email *</label>
              <input style={s.input} type="email" value={form.email} onChange={set("email")} placeholder="jean@email.com" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Téléphone</label>
              <input style={s.input} value={form.phone} onChange={set("phone")} placeholder="+33 6 00 00 00 00" />
            </div>
          </div>
        )}

        {step===2 && (
          <div style={s.section}>
            <h2 style={s.stepTitle}>Le bien</h2>
            <p style={s.stepDesc}>Décrivez le bien ou terrain à analyser.</p>
            <div style={s.field}>
              <label style={s.label}>Localisation *</label>
              <input style={s.input} value={form.location} onChange={set("location")} placeholder="Commune, quartier ou région" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Type de bien *</label>
              <div style={s.chipGrid}>
                {propertyTypes.map(t => (
                  <button key={t} onClick={()=>toggle("propertyType",t)}
                    style={{...s.chip,...(form.propertyType===t?s.chipActive:{})}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div style={s.row}>
              <div style={s.field}>
                <label style={s.label}>Surface terrain (m²)</label>
                <input style={s.input} value={form.landArea} onChange={set("landArea")} placeholder="ex : 800" />
              </div>
              <div style={s.field}>
                <label style={s.label}>Surface habitable (m²)</label>
                <input style={s.input} value={form.livingArea} onChange={set("livingArea")} placeholder="ex : 120" />
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Prix affiché ou estimé</label>
              <input style={s.input} value={form.askingPrice} onChange={set("askingPrice")} placeholder="ex : 250 000 €" />
            </div>
          </div>
        )}

        {step===3 && (
          <div style={s.section}>
            <h2 style={s.stepTitle}>Votre projet</h2>
            <p style={s.stepDesc}>Quel est l'angle d'investissement envisagé ?</p>
            <div style={s.field}>
              <label style={s.label}>Intention principale *</label>
              <div style={s.chipGrid}>
                {projectIntents.map(t => (
                  <button key={t} onClick={()=>toggle("projectIntent",t)}
                    style={{...s.chip,...(form.projectIntent===t?s.chipActive:{})}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Budget global</label>
              <div style={s.chipGrid}>
                {budgetRanges.map(t => (
                  <button key={t} onClick={()=>toggle("budgetRange",t)}
                    style={{...s.chip,...(form.budgetRange===t?s.chipActive:{})}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Urgence de décision</label>
              <div style={s.chipGrid}>
                {["< 1 semaine","2–4 semaines","1–3 mois","Pas d'urgence"].map(t => (
                  <button key={t} onClick={()=>toggle("urgency",t)}
                    style={{...s.chip,...(form.urgency===t?s.chipActive:{})}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step===4 && (
          <div style={s.section}>
            <h2 style={s.stepTitle}>Contexte & contraintes</h2>
            <p style={s.stepDesc}>Plus vous êtes précis, plus l'analyse est utile.</p>
            <div style={s.field}>
              <label style={s.label}>Description libre</label>
              <textarea style={s.textarea} value={form.context} onChange={set("context")}
                placeholder="Ex : terrain zone Ua, vendeur pressé, lien annonce SeLoger..." rows={4} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Contraintes connues</label>
              <textarea style={s.textarea} value={form.constraints} onChange={set("constraints")}
                placeholder="Ex : ABF, PLU restrictif, pente importante, bail en cours..." rows={3} />
            </div>
            <div style={s.notice}>
              📎 Vous pourrez envoyer vos documents (annonce, PLU, plan) par email après soumission.
            </div>
          </div>
        )}

        <div style={s.nav}>
          {step>1 && (
            <button style={s.btnBack} onClick={()=>setStep(x=>x-1)}>← Retour</button>
          )}
          <div style={{flex:1}} />
          {step<4
            ? <button style={{...s.btnNext,...(!canNext()?s.btnDisabled:{})}}
                onClick={()=>canNext()&&setStep(x=>x+1)} disabled={!canNext()}>
                Suivant →
              </button>
            : <button style={s.btnSubmit} onClick={handleSubmit} disabled={sending}>
                {sending?"Envoi en cours...":"Envoyer ma demande ✓"}
              </button>
          }
        </div>
      </div>
      <p style={s.footer}>Rapport livré sous 24h · Confidentiel · Sans engagement</p>
    </div>
  );
}

const s = {
  container:{minHeight:"100vh",background:"linear-gradient(135deg,#0f0f1a 0%,#1a1a2e 50%,#0f0f1a 100%)",display:"flex",flexDirection:"column",alignItems:"center",padding:"32px 16px",fontFamily:"Georgia,'Times New Roman',serif"},
  header:{display:"flex",alignItems:"center",gap:14,marginBottom:36,maxWidth:600,width:"100%",margin:"0 auto 36px"},
  logo:{width:44,height:44,borderRadius:10,background:"linear-gradient(135deg,#c9a84c,#e8c97a)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:"bold",fontSize:16,color:"#1a1a2e",letterSpacing:1},
  brandName:{color:"#f0e6c8",fontSize:17,fontWeight:"bold",letterSpacing:0.5},
  brandSub:{color:"#8a7a5a",fontSize:12,marginTop:2},
  progressWrap:{maxWidth:600,width:"100%",marginBottom:24},
  progressBar:{height:3,background:"#2a2a3e",borderRadius:2,marginBottom:16},
  progressFill:{height:"100%",background:"linear-gradient(90deg,#c9a84c,#e8c97a)",borderRadius:2,transition:"width 0.4s ease"},
  steps:{display:"flex",justifyContent:"space-between"},
  stepItem:{display:"flex",flexDirection:"column",alignItems:"center",gap:6},
  stepDot:{width:28,height:28,borderRadius:"50%",background:"#2a2a3e",color:"#6a6a8a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,border:"1px solid #3a3a5e"},
  stepActive:{background:"#1a1a2e",border:"2px solid #c9a84c",color:"#c9a84c",fontWeight:"bold"},
  stepDone:{background:"linear-gradient(135deg,#c9a84c,#e8c97a)",color:"#1a1a2e",border:"none",fontWeight:"bold"},
  stepLabel:{fontSize:11,color:"#6a6a8a"},
  stepLabelActive:{color:"#c9a84c"},
  card:{maxWidth:600,width:"100%",background:"rgba(255,255,255,0.04)",backdropFilter:"blur(20px)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:20,padding:"36px 40px",boxShadow:"0 20px 60px rgba(0,0,0,0.4)"},
  section:{display:"flex",flexDirection:"column",gap:20},
  stepTitle:{color:"#f0e6c8",fontSize:24,fontWeight:"bold",margin:0},
  stepDesc:{color:"#8a7a6a",fontSize:14,margin:0,lineHeight:1.6},
  row:{display:"flex",gap:16},
  field:{display:"flex",flexDirection:"column",gap:8,flex:1},
  label:{color:"#b0a080",fontSize:12,letterSpacing:1,textTransform:"uppercase"},
  input:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:10,padding:"12px 16px",color:"#f0e6c8",fontSize:15,outline:"none",fontFamily:"Georgia,serif"},
  textarea:{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:10,padding:"12px 16px",color:"#f0e6c8",fontSize:14,outline:"none",fontFamily:"Georgia,serif",resize:"vertical",lineHeight:1.6},
  chipGrid:{display:"flex",flexWrap:"wrap",gap:8},
  chip:{padding:"8px 16px",borderRadius:30,border:"1px solid rgba(201,168,76,0.25)",background:"rgba(255,255,255,0.04)",color:"#9a8a6a",fontSize:13,cursor:"pointer",fontFamily:"Georgia,serif"},
  chipActive:{background:"rgba(201,168,76,0.15)",border:"1px solid #c9a84c",color:"#e8c97a"},
  notice:{background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.2)",borderRadius:10,padding:"12px 16px",color:"#b0a080",fontSize:13,lineHeight:1.5},
  nav:{display:"flex",alignItems:"center",marginTop:32,paddingTop:24,borderTop:"1px solid rgba(201,168,76,0.1)",gap:12},
  btnBack:{padding:"12px 20px",background:"transparent",border:"1px solid rgba(201,168,76,0.2)",borderRadius:10,color:"#8a7a6a",fontSize:14,cursor:"pointer",fontFamily:"Georgia,serif"},
  btnNext:{padding:"12px 28px",background:"linear-gradient(135deg,#c9a84c,#e8c97a)",border:"none",borderRadius:10,color:"#1a1a2e",fontSize:14,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif"},
  btnDisabled:{opacity:0.4,cursor:"not-allowed"},
  btnSubmit:{padding:"13px 32px",background:"linear-gradient(135deg,#c9a84c,#e8c97a)",border:"none",borderRadius:10,color:"#1a1a2e",fontSize:15,fontWeight:"bold",cursor:"pointer",fontFamily:"Georgia,serif"},
  footer:{marginTop:24,color:"#4a4a6a",fontSize:12,textAlign:"center"},
  successIcon:{width:60,height:60,borderRadius:"50%",background:"linear-gradient(135deg,#c9a84c,#e8c97a)",color:"#1a1a2e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,fontWeight:"bold",margin:"0 auto 24px"},
  successTitle:{color:"#f0e6c8",fontSize:24,textAlign:"center",margin:"0 0 12px"},
  successText:{color:"#8a7a6a",fontSize:15,textAlign:"center",lineHeight:1.6,margin:"0 0 20px"},
  tagRow:{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"},
  tag:{padding:"6px 14px",borderRadius:20,background:"rgba(201,168,76,0.12)",border:"1px solid rgba(201,168,76,0.25)",color:"#c9a84c",fontSize:12},
};
