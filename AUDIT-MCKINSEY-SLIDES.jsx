import { useState } from "react";

const COLORS = {
  navy: "#1E2761", navyLight: "#2A3575", gold: "#C9A84C", goldLight: "#E8D9A0",
  forest: "#2C5F2D", forestLight: "#E8F5E9", red: "#DC2626", redLight: "#FEE2E2",
  orange: "#EA580C", orangeLight: "#FFF7ED", blue: "#2563EB", blueLight: "#EFF6FF",
  gray50: "#F8FAFC", gray100: "#F1F5F9", gray200: "#E2E8F0", gray400: "#94A3B8",
  gray500: "#64748B", gray700: "#334155", gray800: "#1E293B",
};

const ScoreBar = ({ score, max = 10 }) => {
  const pct = (score / max) * 100;
  const color = score >= 7.5 ? COLORS.forest : score >= 6 ? COLORS.gold : COLORS.red;
  return (
    <div className="flex items-center gap-2">
      <div className="w-32 h-2.5 rounded-full" style={{ background: COLORS.gray200 }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-sm font-bold" style={{ color }}>{score}</span>
    </div>
  );
};

const slides = [
  // SLIDE 0: COVER
  () => (
    <div className="h-full flex flex-col justify-center items-center text-center text-white relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${COLORS.navy} 0%, #0F1A3A 100%)` }}>
      <div className="absolute top-0 right-0 w-2/5 h-full" style={{ background: "linear-gradient(135deg, transparent 50%, rgba(201,168,76,0.08) 100%)" }} />
      <div className="px-4 py-1.5 rounded text-xs font-bold tracking-widest uppercase mb-10"
        style={{ background: COLORS.gold, color: COLORS.navy }}>Confidentiel</div>
      <h1 className="text-5xl font-black leading-tight mb-3">Audit Strategique</h1>
      <p className="text-2xl font-light mb-8" style={{ color: COLORS.gold }}>Ecosysteme Immobilier Guadeloupe</p>
      <div className="w-24 h-0.5 mb-8" style={{ background: COLORS.gold }} />
      <p className="text-base opacity-80">Analyse type McKinsey — 8 dimensions x 4 entites</p>
      <p className="text-sm opacity-60 mt-1">Mars 2026</p>
      <p className="mt-8 text-base" style={{ color: COLORS.gold }}>Dereck Rauzduel — Architecte EPFL</p>
      <p className="text-xs opacity-40 absolute bottom-6 tracking-widest uppercase">
        Document confidentiel — Ne pas diffuser
      </p>
    </div>
  ),

  // SLIDE 1: EXECUTIVE SUMMARY
  () => (
    <div className="h-full p-8 overflow-auto" style={{ background: COLORS.gray50 }}>
      <h2 className="text-3xl font-extrabold mb-6" style={{ color: COLORS.navy }}>Vue d'ensemble</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { name: "KCI", score: "7.2", ca: "22 000", phase: "Pre-lancement 85%", color: COLORS.navy, bg: "white" },
          { name: "Topo3D", score: "7.1", ca: "52 713", phase: "MVP livre", color: COLORS.navy, bg: COLORS.goldLight },
          { name: "BatiGwada", score: "5.7", ca: "10 180", phase: "Lancement 1er avril", color: "white", bg: COLORS.forest },
        ].map((e, i) => (
          <div key={i} className="rounded-xl p-5 shadow-sm" style={{ background: e.bg, borderTop: `4px solid ${i === 0 ? COLORS.navy : i === 1 ? COLORS.gold : COLORS.forest}` }}>
            <div className="text-xs font-bold tracking-wider uppercase mb-2" style={{ color: COLORS.gray400 }}>{e.name}</div>
            <div className="text-4xl font-black" style={{ color: e.color === "white" ? "white" : COLORS.navy }}>
              {e.score}<span className="text-lg font-normal opacity-50">/10</span>
            </div>
            <div className="text-sm mt-1" style={{ color: e.color === "white" ? "rgba(255,255,255,0.8)" : COLORS.gray500 }}>{e.phase}</div>
            <div className="text-sm font-semibold mt-1" style={{ color: e.color === "white" ? COLORS.goldLight : COLORS.gray700 }}>CA: {e.ca} EUR</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyLight})`, borderLeft: `4px solid ${COLORS.gold}` }}>
        <div className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: COLORS.gold }}>Ecosysteme An 1</div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black" style={{ color: COLORS.gold }}>84 893 EUR</span>
          <span className="text-sm opacity-60">CA realiste + 25-67K EUR d'aides</span>
        </div>
      </div>
      <div className="mt-4 text-xs text-center" style={{ color: COLORS.gray400 }}>Score ecosysteme global : 6.7/10 — Potentiel eleve, execution a prouver</div>
    </div>
  ),

  // SLIDE 2: KCI AUDIT
  () => (
    <div className="h-full p-8 overflow-auto" style={{ background: COLORS.gray50 }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black" style={{ background: COLORS.navy }}>K</div>
        <div>
          <h2 className="text-2xl font-extrabold" style={{ color: COLORS.navy }}>KCI — Karukera Conseil Immobilier</h2>
          <p className="text-sm" style={{ color: COLORS.gray500 }}>Conseil en faisabilite immobiliere par IA — Score 7.2/10</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-bold tracking-wider uppercase mb-3" style={{ color: COLORS.gray400 }}>Scoring 8 dimensions</h3>
          <div className="space-y-2.5">
            {[
              ["Produit", 8.0], ["Marche", 7.0], ["Juridique", 6.5], ["Technologie", 8.5],
              ["Marketing", 5.0], ["Finance", 7.0], ["Scalabilite", 7.5], ["Equipe", 8.0]
            ].map(([dim, sc]) => (
              <div key={dim} className="flex items-center justify-between">
                <span className="text-sm font-medium w-24">{dim}</span>
                <ScoreBar score={sc} />
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg text-center" style={{ background: COLORS.navy }}>
            <span className="text-white text-sm">Score global: </span>
            <span className="text-xl font-black" style={{ color: COLORS.gold }}>7.2/10</span>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold tracking-wider uppercase mb-3" style={{ color: COLORS.gray400 }}>SWOT</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { title: "Forces", items: ["IA + EPFL", "24h livraison", "Prix 5-20x inf."], bg: COLORS.forestLight, color: "#1B5E20" },
              { title: "Faiblesses", items: ["1 personne", "0 EUR CA", "SIRET pending"], bg: COLORS.redLight, color: "#991B1B" },
              { title: "Opportunites", items: ["Marche vierge IA", "Fiscal DOM", "Cross-sell"], bg: COLORS.blueLight, color: "#1E40AF" },
              { title: "Menaces", items: ["Copie facile", "Prix sensibilite", "Regulation"], bg: COLORS.orangeLight, color: "#9A3412" },
            ].map((s) => (
              <div key={s.title} className="p-3 rounded-lg" style={{ background: s.bg }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: s.color }}>{s.title}</div>
                {s.items.map((item, i) => (
                  <div key={i} className="text-xs leading-relaxed" style={{ color: s.color }}>{item}</div>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 rounded-lg" style={{ background: COLORS.blueLight }}>
            <div className="text-xs font-bold mb-1" style={{ color: COLORS.navy }}>Marche</div>
            <div className="flex justify-between text-xs">
              <span>TAM: 50K trans./an</span>
              <span>SAM: 2 500 invest.</span>
              <span>SOM: 100 clients</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),

  // SLIDE 3: TOPO3D AUDIT
  () => (
    <div className="h-full p-8 overflow-auto" style={{ background: COLORS.gray50 }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black" style={{ background: COLORS.gold, color: COLORS.navy }}>T</div>
        <div>
          <h2 className="text-2xl font-extrabold" style={{ color: COLORS.navy }}>Topo3D Antilles — SaaS Topographie 3D</h2>
          <p className="text-sm" style={{ color: COLORS.gray500 }}>Generation fichiers 3D par parcelle cadastrale — Score 7.1/10</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-bold tracking-wider uppercase mb-3" style={{ color: COLORS.gray400 }}>Scoring 8 dimensions</h3>
          <div className="space-y-2.5">
            {[
              ["Prop. valeur", 8.5], ["Unit economics", 8.2], ["Marche", 6.5], ["Defensibilite", 5.5],
              ["Scalabilite", 7.5], ["ROI", 9.0], ["Technologie", 7.0], ["Execution", 6.0]
            ].map(([dim, sc]) => (
              <div key={dim} className="flex items-center justify-between">
                <span className="text-sm font-medium w-28">{dim}</span>
                <ScoreBar score={sc} />
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg text-center" style={{ background: COLORS.navy }}>
            <span className="text-white text-sm">Score global: </span>
            <span className="text-xl font-black" style={{ color: COLORS.gold }}>7.1/10</span>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold tracking-wider uppercase mb-3" style={{ color: COLORS.gray400 }}>Metriques cles</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: "485", label: "Prospects", sub: "971 + 972" },
              { val: "285K", label: "SAM", sub: "EUR/an" },
              { val: "98%", label: "Marge", sub: "Cout marginal" },
              { val: "36.4x", label: "ROI", sub: "sur 16K CAPEX" },
              { val: "0", label: "Concurrent", sub: "SaaS aux Antilles" },
              { val: "48.6x", label: "LTV:CAC", sub: "Exceptionnel" },
            ].map((m) => (
              <div key={m.label} className="bg-white rounded-lg p-3 text-center shadow-sm">
                <div className="text-2xl font-black" style={{ color: COLORS.navy }}>{m.val}</div>
                <div className="text-xs font-semibold" style={{ color: COLORS.gray700 }}>{m.label}</div>
                <div className="text-xs" style={{ color: COLORS.gray400 }}>{m.sub}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 rounded-lg" style={{ background: COLORS.forestLight }}>
            <div className="text-xs font-bold mb-1" style={{ color: COLORS.forest }}>Verdict</div>
            <div className="text-xs" style={{ color: COLORS.forest }}>Go avec urgence. Meilleur ROI ecosysteme. Deployer Vercel + Stripe cette semaine.</div>
          </div>
        </div>
      </div>
    </div>
  ),

  // SLIDE 4: BATIGWADA AUDIT
  () => (
    <div className="h-full p-8 overflow-auto" style={{ background: COLORS.gray50 }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black" style={{ background: COLORS.forest }}>B</div>
        <div>
          <h2 className="text-2xl font-extrabold" style={{ color: COLORS.navy }}>BatiGwadaServices — Portail BTP</h2>
          <p className="text-sm" style={{ color: COLORS.gray500 }}>Annuaire artisans + Blog SEO + Chatbot — Score 5.7/10</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-bold tracking-wider uppercase mb-3" style={{ color: COLORS.gray400 }}>Scoring 8 dimensions</h3>
          <div className="space-y-2.5">
            {[
              ["Base donnees", 5.2], ["Site web", 6.8], ["Monetisation", 4.0], ["Contenu", 7.0],
              ["UX/Design", 7.5], ["SEO", 5.0], ["Communaute", 3.0], ["Evolutivite", 7.0]
            ].map(([dim, sc]) => (
              <div key={dim} className="flex items-center justify-between">
                <span className="text-sm font-medium w-28">{dim}</span>
                <ScoreBar score={sc} />
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg text-center" style={{ background: COLORS.navy }}>
            <span className="text-white text-sm">Score global: </span>
            <span className="text-xl font-black" style={{ color: COLORS.gold }}>5.7/10</span>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold tracking-wider uppercase mb-3" style={{ color: COLORS.gray400 }}>Alertes critiques</h3>
          <div className="space-y-2">
            {[
              { val: "1%", label: "Emails artisans", desc: "1/175 — impossible de contacter", sev: "critique" },
              { val: "1%", label: "SIRET artisans", desc: "2/175 — fiches non verifiables", sev: "critique" },
              { val: "0 EUR", label: "Stripe", desc: "Paiement non connecte", sev: "critique" },
              { val: "13j", label: "Deadline", desc: "Lancement 1er avril", sev: "warn" },
            ].map((a) => (
              <div key={a.label} className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: a.sev === "critique" ? COLORS.redLight : COLORS.orangeLight }}>
                <div className="text-2xl font-black" style={{ color: a.sev === "critique" ? COLORS.red : COLORS.orange }}>{a.val}</div>
                <div>
                  <div className="text-xs font-bold" style={{ color: a.sev === "critique" ? "#991B1B" : "#9A3412" }}>{a.label}</div>
                  <div className="text-xs" style={{ color: a.sev === "critique" ? "#B91C1C" : "#C2410C" }}>{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 rounded-lg" style={{ background: COLORS.orangeLight }}>
            <div className="text-xs font-bold mb-1" style={{ color: COLORS.orange }}>Verdict</div>
            <div className="text-xs" style={{ color: "#9A3412" }}>Go minimal. Valeur = SEO pour KCI + base artisans pour rapports. Ne pas sur-investir avant CA KCI/Topo3D.</div>
          </div>
        </div>
      </div>
    </div>
  ),

  // SLIDE 5: SYNERGIES
  () => (
    <div className="h-full p-8 overflow-auto" style={{ background: COLORS.gray50 }}>
      <h2 className="text-3xl font-extrabold mb-6" style={{ color: COLORS.navy }}>Synergies et Dependances</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl p-4 text-center text-white" style={{ background: COLORS.navy }}>
          <div className="text-xl font-black">KCI</div>
          <div className="text-xs opacity-70">7.2/10 | 22K EUR</div>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: COLORS.gold, color: COLORS.navy }}>
          <div className="text-xl font-black">Topo3D</div>
          <div className="text-xs">7.1/10 | 52K EUR</div>
        </div>
        <div className="rounded-xl p-4 text-center text-white" style={{ background: COLORS.forest }}>
          <div className="text-xl font-black">BatiGwada</div>
          <div className="text-xs opacity-70">5.7/10 | 10K EUR</div>
        </div>
      </div>
      <div className="space-y-2">
        {[
          { from: "KCI Premium 299 EUR", to: "inclut extrait Topo3D", impact: "+30% valeur percue", color: COLORS.navy },
          { from: "BatiGwada chatbot", to: "recommande pre-etude KCI", impact: "Lead gen gratuit", color: COLORS.forest },
          { from: "BatiGwada blog SEO", to: "trafic organique vers KCI", impact: "50-200 visites/mois a M+6", color: COLORS.forest },
          { from: "BatiGwada artisans", to: "enrichit rapports KCI", impact: "Valeur ajoutee unique", color: COLORS.forest },
          { from: "Un seul Stripe", to: "sert KCI + Topo3D", impact: "Simplification operationnelle", color: COLORS.gold },
          { from: "Chaque client", to: "prospect pour les 2 autres", impact: "Volant d'inertie", color: COLORS.blue },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm">
            <div className="w-2 h-8 rounded-full" style={{ background: s.color }} />
            <div className="flex-1 text-sm"><span className="font-semibold">{s.from}</span> &rarr; {s.to}</div>
            <div className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: COLORS.blueLight, color: COLORS.blue }}>{s.impact}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 p-4 rounded-xl text-center" style={{ background: COLORS.redLight }}>
        <div className="text-sm font-bold" style={{ color: COLORS.red }}>Blocker central : SIRET &rarr; Stripe &rarr; 100% du revenue de l'ecosysteme</div>
        <div className="text-xs mt-1" style={{ color: "#991B1B" }}>Validation Greffe attendue ~21/03/2026 (24-48h)</div>
      </div>
    </div>
  ),

  // SLIDE 6: PROJECTIONS
  () => (
    <div className="h-full p-8 overflow-auto" style={{ background: COLORS.gray50 }}>
      <h2 className="text-3xl font-extrabold mb-2" style={{ color: COLORS.navy }}>Projections Financieres</h2>
      <p className="text-sm mb-6" style={{ color: COLORS.gray500 }}>Scenario realiste — Subventions non incluses</p>
      <div className="space-y-4">
        {[
          { year: "An 1", kci: 22, topo: 52.7, bati: 10.2, total: "84 893" },
          { year: "An 2", kci: 45, topo: 95, bati: 35, total: "175 000" },
          { year: "An 3", kci: 80, topo: 150, bati: 60, total: "290 000" },
        ].map((y) => (
          <div key={y.year}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-bold w-10" style={{ color: COLORS.gray700 }}>{y.year}</span>
              <span className="text-lg font-black" style={{ color: COLORS.navy }}>{y.total} EUR</span>
            </div>
            <div className="flex gap-1 h-8 rounded-lg overflow-hidden">
              <div className="flex items-center justify-center text-xs font-bold text-white" style={{ background: COLORS.navy, width: `${(y.kci / (y.kci + y.topo + y.bati)) * 100}%` }}>
                KCI {y.kci}K
              </div>
              <div className="flex items-center justify-center text-xs font-bold" style={{ background: COLORS.gold, color: COLORS.navy, width: `${(y.topo / (y.kci + y.topo + y.bati)) * 100}%` }}>
                Topo3D {y.topo}K
              </div>
              <div className="flex items-center justify-center text-xs font-bold text-white" style={{ background: COLORS.forest, width: `${(y.bati / (y.kci + y.topo + y.bati)) * 100}%` }}>
                Bati {y.bati}K
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 p-4 rounded-xl" style={{ background: COLORS.blueLight }}>
        <div className="text-sm font-bold mb-2" style={{ color: COLORS.blue }}>Subventions potentielles (en plus du CA)</div>
        <div className="grid grid-cols-4 gap-3 text-center">
          {[
            { name: "PIJ", val: "9 378 EUR", status: "Demande" },
            { name: "ARDDA", val: "10 000 EUR", status: "A verifier" },
            { name: "Exo. DOM", val: "5 000 EUR/an", status: "Auto" },
            { name: "Total pot.", val: "25-67K EUR", status: "" },
          ].map((s) => (
            <div key={s.name}>
              <div className="text-lg font-black" style={{ color: COLORS.navy }}>{s.val}</div>
              <div className="text-xs font-semibold" style={{ color: COLORS.gray700 }}>{s.name}</div>
              {s.status && <div className="text-xs" style={{ color: COLORS.gray400 }}>{s.status}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  ),

  // SLIDE 7: PRIORITIES
  () => (
    <div className="h-full p-8 overflow-auto" style={{ background: COLORS.gray50 }}>
      <h2 className="text-3xl font-extrabold mb-6" style={{ color: COLORS.navy }}>Actions Prioritaires — ROI decroissant</h2>
      <div className="space-y-3">
        {[
          { n: 1, title: "Validation Greffe + Stripe", entity: "KCI + Topo3D", impact: "Debloque 100% du revenue", score: 9.5, color: COLORS.red },
          { n: 2, title: "Deployer Topo3D Vercel + Payment Links", entity: "Topo3D", impact: "2e source CA, MVP pret, 2h de travail", score: 8.5, color: COLORS.gold },
          { n: 3, title: "Transfert siege 74 vers 971", entity: "Toutes", impact: "5 000+ EUR/an d'aides DOM", score: 8.0, color: COLORS.forest },
          { n: 4, title: "Campagne email 150 architectes Antilles", entity: "Topo3D", impact: "5-10 premiers clients, CAC ~15 EUR", score: 7.5, color: COLORS.blue },
          { n: 5, title: "Lancer BatiGwada version minimale", entity: "BatiGwada", impact: "3e source CA + SEO pour KCI", score: 7.0, color: COLORS.forest },
        ].map((p) => (
          <div key={p.n} className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg flex-shrink-0" style={{ background: COLORS.navy }}>{p.n}</div>
            <div className="flex-1">
              <div className="font-bold text-base" style={{ color: COLORS.gray800 }}>{p.title}</div>
              <div className="text-xs mt-0.5" style={{ color: COLORS.gray500 }}>{p.entity} — {p.impact}</div>
            </div>
            <div className="px-3 py-1.5 rounded-full font-bold text-sm" style={{ background: COLORS.gold, color: COLORS.navy }}>{p.score}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 p-4 rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${COLORS.navy}, ${COLORS.navyLight})` }}>
        <div className="text-xs font-bold tracking-wider uppercase mb-1" style={{ color: COLORS.gold }}>Timeline critique</div>
        <div className="text-sm">
          <strong style={{ color: COLORS.gold }}>19-21 mars:</strong> Greffe + Stripe &rarr;
          <strong style={{ color: COLORS.gold }}> 22-31 mars:</strong> Deploy + Email archis &rarr;
          <strong style={{ color: COLORS.gold }}> 1er avril:</strong> 3 entites live &rarr;
          <strong style={{ color: COLORS.gold }}> Avril:</strong> Premier EUR de CA
        </div>
      </div>
    </div>
  ),

  // SLIDE 8: CLOSING
  () => (
    <div className="h-full flex flex-col justify-center items-center text-center text-white px-8"
      style={{ background: `linear-gradient(135deg, ${COLORS.navy} 0%, #0F1A3A 100%)` }}>
      <div className="text-sm tracking-widest uppercase opacity-50 mb-8">Score Ecosysteme Global</div>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-7xl font-black" style={{ color: COLORS.gold }}>6.7</span>
        <span className="text-3xl font-light opacity-50">/10</span>
      </div>
      <div className="w-24 h-0.5 mb-8" style={{ background: COLORS.gold }} />
      <div className="text-xl mb-2">
        Potentiel An 1: <span className="font-bold" style={{ color: COLORS.gold }}>84 893 EUR CA</span> + <span style={{ color: COLORS.goldLight }}>67 000 EUR d'aides</span>
      </div>
      <div className="text-base opacity-70 mb-8">Croissance An 3: 290 000 EUR (x3.4)</div>
      <div className="p-4 rounded-xl mb-8" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="text-sm opacity-60">Next milestone</div>
        <div className="text-lg font-bold" style={{ color: COLORS.gold }}>Validation Greffe ~21/03/2026</div>
        <div className="text-sm opacity-60">Premier EUR de CA en avril 2026</div>
      </div>
      <div className="text-xs opacity-30 tracking-widest uppercase">
        Confidentiel — Dereck Rauzduel — Architecte EPFL — Mars 2026
      </div>
    </div>
  ),
];

export default function AuditMcKinsey() {
  const [current, setCurrent] = useState(0);
  const Slide = slides[current];
  return (
    <div className="w-full h-screen flex flex-col" style={{ background: COLORS.gray800 }}>
      <div className="flex-1 max-w-5xl w-full mx-auto shadow-2xl" style={{ aspectRatio: "16/9" }}>
        <Slide />
      </div>
      <div className="flex items-center justify-center gap-4 py-3">
        <button onClick={() => setCurrent(Math.max(0, current - 1))}
          className="px-4 py-2 rounded-lg text-sm font-bold text-white"
          style={{ background: current > 0 ? COLORS.navy : COLORS.gray500 }}>
          Precedent
        </button>
        <span className="text-sm text-white opacity-60">{current + 1} / {slides.length}</span>
        <button onClick={() => setCurrent(Math.min(slides.length - 1, current + 1))}
          className="px-4 py-2 rounded-lg text-sm font-bold text-white"
          style={{ background: current < slides.length - 1 ? COLORS.gold : COLORS.gray500, color: current < slides.length - 1 ? COLORS.navy : "white" }}>
          Suivant
        </button>
      </div>
    </div>
  );
}