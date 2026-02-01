import React from "react";
import { useState, useEffect, useRef, useCallback } from "react";

/* ══════════════════════════════════════════════════════════════
   FIREBASE CONFIG
   ══════════════════════════════════════════════════════════════ */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBGoh0DV80fhGArMU8rpj2kPteIlETsU9U",
  databaseURL: "https://deutsch-4479a-default-rtdb.firebaseio.com",
};

let firebaseApp = null;
let db = null;
let firebaseReady = null;

function initFirebase() {
  if (firebaseReady) return firebaseReady;
  firebaseReady = new Promise((resolve, reject) => {
    const scripts = [
      "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
      "https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js",
    ];
    let loaded = 0;
    scripts.forEach((src) => {
      if (document.querySelector(`script[src="${src}"]`)) { loaded++; if (loaded === scripts.length) finish(); return; }
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => { loaded++; if (loaded === scripts.length) finish(); };
      s.onerror = () => reject(new Error("No se pudo cargar Firebase SDK"));
      document.head.appendChild(s);
    });
    function finish() {
      try {
        firebaseApp = window.firebase.initializeApp(FIREBASE_CONFIG);
        db = window.firebase.database();
        resolve(db);
      } catch (e) { reject(e); }
    }
  });
  return firebaseReady;
}

function roomRef(code) { return db.ref(`rooms/${code}`); }

/* ══════════════════════════════════════════════
   ESTILOS (CON MEDIA QUERIES PARA MÓVIL)
   ══════════════════════════════════════════════ */
(function injectStyles() {
  if (document.getElementById("ds-styles")) return;
  const s = document.createElement("style");
  s.id = "ds-styles";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Nunito:wght@400;600;700;800&display=swap');
    @keyframes fadeUp   { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
    @keyframes scaleIn  { from{opacity:0;transform:scale(0.78)}     to{opacity:1;transform:scale(1)}     }
    @keyframes popIn    { 0%{opacity:0;transform:scale(0.5)} 60%{transform:scale(1.1)} 100%{opacity:1;transform:scale(1)} }
    @keyframes float1   { 0%,100%{transform:translateY(0) scale(1)}        50%{transform:translateY(-28px) scale(1.06)} }
    @keyframes float2   { 0%,100%{transform:translateY(0) rotate(0deg)}   50%{transform:translateY(-20px) rotate(5deg)} }
    @keyframes timerWarn{ 0%,100%{transform:scale(1)} 50%{transform:scale(1.14)} }
    @keyframes confettiFall{ 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 100%{transform:translateY(380px) rotate(740deg);opacity:0} }
    @keyframes podiumRise{ from{transform:scaleY(0);opacity:0} to{transform:scaleY(1);opacity:1} }
    @keyframes slideIn  { from{opacity:0;transform:translateX(36px)} to{opacity:1;transform:translateX(0)} }
    @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.5} }

    /* Ajustes Responsivos Estrictos */
    @media (max-width: 600px) {
      .responsive-grid { grid-template-columns: 1fr !important; }
      .responsive-flex { flex-direction: column !important; }
      .responsive-title { font-size: 38px !important; }
      .responsive-podium { transform: scale(0.8); height: auto !important; margin-top: -20px; }
      .answer-button { padding: 12px 14px !important; font-size: 14px !important; }
      .word-box { padding: 8px 10px !important; font-size: 13px !important; }
    }
  `;
  document.head.appendChild(s);
})();

/* ══════════════════════════════════════════════
   DATOS DE JUEGO (Mantenidos igual)
   ══════════════════════════════════════════════ */
const GAME_DATA = {
  game1: {
    id: "game1", title: "🎯 Dativ oder Akkusativ?", category: 1,
    description: "Elige la preposición correcta según ¿Wo? o ¿Wohin?",
    questions: [
      { q: "Die Katze liegt ___ dem Tisch.", hint: "¿Wo? → Dativ", options: ["auf","unter","in","vor"], answer: 0, explanation: "\"liegt\" → ¿Wo? → Dativ. Die Katze liegt auf dem Tisch (encima de la mesa)." },
      { q: "Er legt das Buch ___ den Tisch.", hint: "¿Wohin? → Akkusativ", options: ["auf","unter","neben","vor"], answer: 0, explanation: "\"legt\" → ¿Wohin? → Akkusativ. Él pone el libro encima de la mesa." },
      { q: "Die Lampe hāngt ___ dem Sofa.", hint: "¿Wo? → Dativ", options: ["über","auf","in","unter"], answer: 0, explanation: "\"hängt\" → ¿Wo? → Dativ. La lámpara está encima del sofá." },
      { q: "Sie stellt die Blume ___ die Fenster.", hint: "¿Wohin? → Akkusativ", options: ["vor","auf","unter","hinter"], answer: 0, explanation: "\"stellt\" → ¿Wohin? → Akkusativ. Ella pone la flor delante de las ventanas." },
      { q: "Das Handy liegt ___ dem Leiter.", hint: "¿Wo? → Dativ", options: ["auf","unter","neben","in"], answer: 2, explanation: "\"liegt\" → ¿Wo? → Dativ. El teléfono está junto al libro." },
      { q: "Er hängt den Mantel ___ die Tür.", hint: "¿Wohin? → Akkusativ", options: ["hinter","auf","unter","vor"], answer: 0, explanation: "\"hängt\" (transitiv) → ¿Wohin? → Akkusativ. Él cuelga el abrigo detrás de la puerta." },
      { q: "Die Sachen liegen ___ dem Tisch.", hint: "¿Wo? → Dativ", options: ["auf","unter","vor","hinter"], answer: 0, explanation: "Como en el ejemplo: \"Die Sachen liegen auf dem Tisch.\" → Dativ." },
      { q: "Sie legt die Sachen ___ den Tisch.", hint: "¿Wohin? → Akkusativ", options: ["auf","unter","vor","hinter"], answer: 0, explanation: "Como en el ejemplo: \"Er legt las Sachen auf den Tisch.\" → Akkusativ." },
    ]
  },
  game2: {
    id: "game2", title: "🧩 Completa la Frase", category: 1,
    description: "Ordena las palabras para formar la frase correcta",
    questions: [
      { words: ["Die","Katze","liegt","auf","dem","Tisch."], answer: "Die Katze liegt auf dem Tisch.", hint: "¿Wo? → Dativ", explanation: "Dativ: auf + dem (m). La gata está encima de la mesa." },
      { words: ["Er","legt","das","Buch","auf","den","Tisch."], answer: "Er legt das Buch auf den Tisch.", hint: "¿Wohin? → Akkusativ", explanation: "Akkusativ: auf + den (m). Él pone el libro encima de la mesa." },
      { words: ["Sie","steht","vor","dem","Haus."], answer: "Sie steht vor dem Haus.", hint: "¿Wo? → Dativ", explanation: "Dativ: vor + dem (n). Ella está delante de la casa." },
      { words: ["Er","stellt","die","Blume","vor","die","Tür."], answer: "Er stellt die Blume vor die Tür.", hint: "¿Wohin? → Akkusativ", explanation: "Akkusativ: vor + die (f). Él pone la flor delante de la puerta." },
      { words: ["Das","Handy","liegt","neben","dem","Leiter."], answer: "Das Handy liegt junto al Leiter.", hint: "¿Wo? → Dativ", explanation: "Dativ: neben + dem (m). El teléfono está junto al libro." },
      { words: ["Die","Lampe","hängt","über","dem","Sofa."], answer: "Die Lampe hängt sobre dem Sofa.", hint: "¿Wo? → Dativ", explanation: "Dativ: über + dem (n). La lámpara está encima del sofá." },
      { words: ["Er","hängt","den","Mantel","hinter","die","Tür."], answer: "Er hängt den Mantel detrás de la puerta.", hint: "¿Wohin? → Akkusativ", explanation: "Akkusativ: hinter + die (f). Él cuelga el abrigo detrás de la puerta." },
      { words: ["Sie","legt","die","Sachen","unter","den","Tisch."], answer: "Sie legt die Sachen debajo del Tisch.", hint: "¿Wohin? → Akkusativ", explanation: "Akkusativ: unter + den (m). Ella pone las cosas debajo de la mesa." },
    ]
  },
  game3: {
    id: "game3", title: "⚡ Verbo Relámpago", category: 2,
    description: "¿Cuál verbo encaja mejor? Posición vs. movimiento",
    questions: [
      { q: "Das Buch ___ auf dem Tisch.", hint: "¿Wo está el libro?", options: ["liegt","legt","stellt","hängt"], answer: 0, explanation: "\"liegt\" = estar (posición horizontal). ¿Wo? → Dativ." },
      { q: "Er ___ das Buch auf den Tisch.", hint: "¿Qué hace él?", options: ["liegt","legt","steht","hängt"], answer: 1, explanation: "\"legt\" = poner (movimiento, horizontal). ¿Wohin? → Akkusativ." },
      { q: "Die Blume ___ vor dem Fenster.", hint: "¿Wo está la flor?", options: ["steht","legt","stellt","hängt"], answer: 0, explanation: "\"steht\" = estar (posición vertical). ¿Wo? → Dativ." },
      { q: "Sie ___ die Blume vor das Fenster.", hint: "¿Qué hace ella?", options: ["steht","liegt","stellt","legt"], answer: 2, explanation: "\"stellt\" = poner (movimiento, vertical). ¿Wohin? → Akkusativ." },
      { q: "Der Mantel ___ hinter der Tür.", hint: "¿Dónde está el abrigo?", options: ["hängt","liegt","steht","stellt"], answer: 0, explanation: "\"hängt\" = estar colgado (posición). ¿Wo? → Dativ." },
      { q: "Er ___ den Mantel hinter die Tür.", hint: "¿Qué hace él?", options: ["hängt","liegt","steht","stellt"], answer: 0, explanation: "\"hängt\" (transitiv) = cuelgar (movimiento). ¿Wohin? → Akkusativ." },
      { q: "Die Glühbirnen ___ neben dem Leiter.", hint: "¿Dónde están las bombillas?", options: ["liegen","stehen","hängen","stellen"], answer: 0, explanation: "\"liegen\" = estar (posición horizontal, plural). ¿Wo? → Dativ." },
      { q: "Sie ___ die Glühbirnen neben den Leiter.", hint: "¿Qué hace ella?", options: ["liegen","stehen","legt","stellt"], answer: 2, explanation: "\"legt\" = poner (movimiento, horizontal). ¿Wohin? → Akkusativ." },
    ]
  },
  game4: {
    id: "game4", title: "🎮 Verbo vs. Caso", category: 2,
    description: "¿Es posición (Dativ) o movimiento (Akkusativ)?",
    questions: [
      { q: "\"Die Sachen liegen auf dem Tisch.\" – ¿Función del verbo?", options: ["Posición (¿Wo? → Dativ)","Movimiento (¿Wohin? → Akkusativ)"], answer: 0, explanation: "\"liegen\" es POSICIÓN. Responde a ¿Wo? → Dativ." },
      { q: "\"Er legt die Sachen auf den Tisch.\" – ¿Función del verbo?", options: ["Posición (¿Wo? → Dativ)","Movimiento (¿Wohin? → Akkusativ)"], answer: 1, explanation: "\"legt\" es MOVIMIENTO. Responde a ¿Wohin? → Akkusativ." },
      { q: "\"Sie steht vor dem Haus.\" – ¿Función del verbo?", options: ["Posición (¿Wo? → Dativ)","Movimiento (¿Wohin? → Akkusativ)"], answer: 0, explanation: "\"steht\" es POSICIÓN. Responde a ¿Wo? → Dativ." },
      { q: "\"Er stellt die Blume vor die Tür.\" – ¿Función del verbo?", options: ["Posición (¿Wo? → Dativ)","Movimiento (¿Wohin? → Akkusativ)"], answer: 1, explanation: "\"stellt\" es MOVIMIENTO. Responde a ¿Wohin? → Akkusativ." },
      { q: "\"Der Mantel hängt hinter der Tür.\" – ¿Función del verbo?", options: ["Posición (¿Wo? → Dativ)","Movimiento (¿Wohin? → Akkusativ)"], answer: 0, explanation: "\"hängt\" (intransitiv) es POSICIÓN. El abrigo está colgado." },
      { q: "\"Er hängt den Mantel hinter die Tür.\" – ¿Función del verbo?", options: ["Posición (¿Wo? → Dativ)","Movimiento (¿Wohin? → Akkusativ)"], answer: 1, explanation: "\"hängt\" (transitiv) es MOVIMIENTO. Él cuelga el abrigo." },
      { q: "\"Die Lampe hängt über dem Sofa.\" – ¿Función del verbo?", options: ["Posición (¿Wo? → Dativ)","Movimiento (¿Wohin? → Akkusativ)"], answer: 0, explanation: "\"hängt\" (intransitiv) es POSICIÓN. La lámpara está colgada." },
      { q: "\"Sie stellt die Lampe über den Tisch.\" – ¿Función del verbo?", options: ["Posición (¿Wo? → Dativ)","Movimiento (¿Wohin? → Akkusativ)"], answer: 1, explanation: "\"stellt\" es MOVIMIENTO. ¿Wohin? → Akkusativ." },
    ]
  }
};

const TIME_PER_Q = 15;
const POINTS_BASE = 1000;
const GAME_COLORS = { game1: "#e040fb", game2: "#00e5ff", game3: "#76ff03", game4: "#ffea00" };

function calcPoints(t) { return Math.max(100, Math.round((t / TIME_PER_Q) * POINTS_BASE)); }
function generateCode() { return Math.floor(100000 + Math.random() * 900000).toString(); }
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

/* ══════════════════════════════════════════════
   DECORACIÓN
   ══════════════════════════════════════════════ */
function FloatingOrbs() {
  const orbs = [
    { w: 200, h: 200, top: "6%", left: "-5%", bg: "radial-gradient(circle,#e040fb2a 0%,transparent 70%)", anim: "float1 7s ease-in-out infinite" },
    { w: 150, h: 150, top: "62%", right: "-3%", bg: "radial-gradient(circle,#00e5ff22 0%,transparent 70%)", anim: "float2 9s ease-in-out infinite" },
    { w: 90, h: 90, top: "28%", left: "74%", bg: "radial-gradient(circle,#ffea0018 0%,transparent 70%)", anim: "float1 5s ease-in-out infinite 1s" },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {orbs.map((o, i) => (
        <div key={i} style={{ position: "absolute", width: o.w, height: o.h, top: o.top, left: o.left, right: o.right, background: o.bg, borderRadius: "50%", animation: o.anim, filter: "blur(7px)" }} />
      ))}
    </div>
  );
}
function GridOverlay() {
  return <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />;
}

function Confetti({ active }) {
  if (!active) return null;
  const colors = ["#e040fb","#00e5ff","#ffea00","#76ff03","#ff5252","#ff9800"];
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 200, overflow: "hidden" }}>
      {Array.from({ length: 40 }, (_, i) => {
        const left = 3 + Math.random() * 94;
        const delay = Math.random() * 0.5;
        const dur = 1.3 + Math.random() * 0.7;
        const size = 5 + Math.random() * 10;
        const color = colors[i % colors.length];
        return <div key={i} style={{ position: "absolute", top: -16, left: `${left}%`, width: size, height: size * 1.5, background: color, borderRadius: i % 2 === 0 ? "50%" : "0", animation: `confettiFall ${dur}s ease-in ${delay}s forwards` }} />;
      })}
    </div>
  );
}

function BackBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ background: "none", border: "1px solid rgba(255,255,255,0.12)", color: "#8a9bb5", borderRadius: 24, padding: "7px 18px", fontSize: 14, fontWeight: 700, fontFamily: "'Nunito',sans-serif", cursor: "pointer" }}>← Atrás</button>
  );
}

const PAGE = { minHeight: "100vh", background: "#0a0e1a", color: "#fff", position: "relative", overflowX: "hidden", fontFamily: "'Nunito',sans-serif" };

/* ══════════════════════════════════════════════
   PANTALLA: HOME
   ══════════════════════════════════════════════ */
function HomeScreen({ onStart }) {
  return (
    <div style={PAGE}>
      <FloatingOrbs /><GridOverlay />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", maxWidth: 680, margin: "0 auto" }}>
        <div style={{ fontSize: 60, marginBottom: 2 }}>🇩🇪</div>
        <h1 className="responsive-title" style={{ fontFamily: "'Bangers',cursive", fontSize: 50, letterSpacing: 3, margin: 0, background: "linear-gradient(135deg,#e040fb,#00e5ff,#ffea00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textAlign: "center" }}>DeutschSpiel</h1>
        <p style={{ fontSize: 15, color: "#6b7a99", textAlign: "center", margin: "10px 0 34px", lineHeight: 1.6, maxWidth: 380 }}>Aprende <strong>Wechselpräpositionen</strong> de forma divertida</p>
        
        <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, width: "100%", marginBottom: 38 }}>
          {Object.values(GAME_DATA).map((g, i) => (
            <div key={g.id} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GAME_COLORS[g.id]}3a`, borderRadius: 16, padding: "18px 16px", animation: `fadeUp 0.5s ease ${i * 0.1}s both` }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: GAME_COLORS[g.id], background: `${GAME_COLORS[g.id]}18`, padding: "3px 10px", borderRadius: 20, display: "inline-block", marginBottom: 8 }}>{g.category === 1 ? "Punto 1" : "Punto 2"}</span>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{g.title}</div>
              <div style={{ fontSize: 12, color: "#5a6680" }}>{g.description}</div>
            </div>
          ))}
        </div>
        <button onClick={onStart} style={{ background: "linear-gradient(135deg,#e040fb,#c020d9)", color: "#fff", border: "none", borderRadius: 50, padding: "16px 44px", fontSize: 18, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 28px #e040fb44" }}>Crear / Unirse a Juego</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PANTALLA: SETUP
   ══════════════════════════════════════════════ */
function SetupScreen({ onHost, onJoin, onBack }) {
  return (
    <div style={PAGE}>
      <FloatingOrbs /><GridOverlay />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 520, margin: "0 auto", padding: "32px 20px" }}>
        <BackBtn onClick={onBack} />
        <h2 style={{ fontFamily: "'Bangers',cursive", fontSize: 36, textAlign: "center", margin: "40px 0", color: "#fff" }}>¿Qué quieres hacer?</h2>
        <div className="responsive-flex" style={{ display: "flex", gap: 18 }}>
          <div onClick={onHost} style={{ flex: 1, background: "rgba(255,255,255,0.045)", border: `1px solid #e040fb30`, borderRadius: 20, padding: "32px 20px", cursor: "pointer", textAlign: "center" }}>
            <div style={{ fontSize: 46, marginBottom: 14 }}>👑</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Crear Juego</div>
            <div style={{ fontSize: 13, color: "#6b7a99" }}>Eres el host. Se genera un código.</div>
          </div>
          <div onClick={onJoin} style={{ flex: 1, background: "rgba(255,255,255,0.045)", border: `1px solid #00e5ff30`, borderRadius: 20, padding: "32px 20px", cursor: "pointer", textAlign: "center" }}>
            <div style={{ fontSize: 46, marginBottom: 14 }}>🎫</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Unirse</div>
            <div style={{ fontSize: 13, color: "#6b7a99" }}>Ingresa el código del profesor.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PANTALLA: JOIN (Mantenida idéntica al original)
   ══════════════════════════════════════════════ */
function JoinScreen({ onJoined, onBack }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!name.trim()) { setError("Por favor ingresa tu nombre"); return; }
    if (code.trim().length !== 6) { setError("El código debe tener 6 dígitos"); return; }
    setLoading(true);
    setError("");
    try {
      await initFirebase();
      const snap = await roomRef(code.trim()).once("value");
      if (!snap.exists()) { setError("No se encontró esa sala."); setLoading(false); return; }
      const roomData = snap.val();
      if (roomData.started) { setError("El juego ya inició."); setLoading(false); return; }
      const playerId = uid();
      await roomRef(code.trim()).child("players").child(playerId).set({
        id: playerId, name: name.trim(), color: `hsl(${Math.floor(Math.random() * 360)},70%,55%)`, score: 0, joined: Date.now()
      });
      onJoined({ code: code.trim(), playerId, playerName: name.trim() });
    } catch (e) { setError("Error al conectar."); setLoading(false); }
  }

  const inp = { width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "13px 16px", color: "#fff", fontSize: 16, boxSizing: "border-box", outline: "none" };

  return (
    <div style={PAGE}>
      <FloatingOrbs /><GridOverlay />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 400, margin: "0 auto", padding: "32px 20px" }}>
        <BackBtn onClick={onBack} />
        <div style={{ marginTop: 56, textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Bangers',cursive", fontSize: 34, color: "#fff", marginBottom: 28 }}>🎮 Unirse</h2>
          <input value={name} onChange={e => { setName(e.target.value); setError(""); }} placeholder="Tu nombre" style={inp} />
          <div style={{ height: 18 }} />
          <input value={code} onChange={e => { setCode(e.target.value); setError(""); }} placeholder="Código (6 dígitos)" maxLength={6} style={inp} />
          {error && <div style={{ color: "#ff5252", fontSize: 13, marginTop: 7 }}>{error}</div>}
          <button onClick={handleJoin} disabled={loading} style={{ width: "100%", marginTop: 28, background: loading ? "#2a2f3e" : "linear-gradient(135deg,#00e5ff,#00bcd4)", color: "#0a0e1a", border: "none", borderRadius: 50, padding: "14px", fontSize: 17, fontWeight: 800, cursor: "pointer" }}>
            {loading ? "Conectando…" : "Unirse →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PANTALLA: LOBBY
   ══════════════════════════════════════════════ */
function LobbyScreen({ gameCode, isHost, players, selectedGames, onStartGame, onGameToggle, onBack }) {
  return (
    <div style={PAGE}>
      <FloatingOrbs /><GridOverlay />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 580, margin: "0 auto", padding: "24px 20px" }}>
        <BackBtn onClick={onBack} />
        <div style={{ background: "rgba(224,64,251,0.05)", border: "1px solid #e040fb3a", borderRadius: 20, padding: "22px 20px", textAlign: "center", marginTop: 28, marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#6b7a99" }}>Código de unión</div>
          <div style={{ fontFamily: "'Bangers',cursive", fontSize: 52, letterSpacing: 10, color: "#e040fb" }}>{gameCode}</div>
        </div>

        {isHost && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 10 }}>Selecciona los juegos</div>
            <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {Object.values(GAME_DATA).map(g => {
                const sel = selectedGames.includes(g.id);
                return (
                  <div key={g.id} onClick={() => onGameToggle(g.id)} style={{ background: sel ? `${GAME_COLORS[g.id]}14` : "rgba(255,255,255,0.04)", border: sel ? `1px solid ${GAME_COLORS[g.id]}55` : "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px", cursor: "pointer", position: "relative" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{g.title}</div>
                    {sel && <div style={{ position: "absolute", top: 8, right: 10, color: GAME_COLORS[g.id] }}>✓</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 10 }}>👥 Jugadores ({players.length})</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {players.map(p => (
              <div key={p.id} style={{ background: p.color, borderRadius: 24, padding: "7px 16px", fontSize: 13, fontWeight: 700 }}>{p.name}</div>
            ))}
          </div>
        </div>

        {isHost ? (
          <button onClick={onStartGame} disabled={selectedGames.length === 0 || players.length < 2} style={{ width: "100%", background: (selectedGames.length === 0 || players.length < 2) ? "#1e2233" : "linear-gradient(135deg,#76ff03,#4caf00)", color: "#0a0e1a", border: "none", borderRadius: 50, padding: "16px", fontSize: 18, fontWeight: 800, cursor: "pointer" }}>🚀 Iniciar</button>
        ) : (
          <div style={{ textAlign: "center", color: "#4a5668", animation: "pulse 2s ease infinite" }}>⏳ Esperando al host…</div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PANTALLA: GAME (Lógica Original Intacta)
   ══════════════════════════════════════════════ */
function GameScreen({ game, players, myId, isHost, roomCode, onFinish }) {
  const [qIndex, setQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [myAnswer, setMyAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [scores, setScores] = useState(() => { const s = {}; players.forEach(p => s[p.id] = p.score || 0); return s; });
  const [placed, setPlaced] = useState([]);
  const [pool, setPool] = useState([]);
  const [dragDone, setDragDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const timerRef = useRef(null);

  const question = game.questions[qIndex];
  const isWordGame = game.id === "game2";
  const isCorrect = showResult && (isWordGame ? myAnswer === 1 : myAnswer === question.answer);

  useEffect(() => {
    setMyAnswer(null); setShowResult(false); setTimeLeft(TIME_PER_Q); setShowConfetti(false); setDragDone(false);
    if (isWordGame) { setPool(shuffleArray(question.words.map((_, i) => i))); setPlaced([]); }
  }, [qIndex, game.id]);

  useEffect(() => {
    if (showResult) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); setShowResult(true); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [showResult, qIndex]);

  useEffect(() => { if (showResult && isCorrect) setShowConfetti(true); }, [showResult, isCorrect]);

  // Sincronización de respuestas (Igual al original)
  useEffect(() => {
    if (!db) return;
    const path = `rooms/${roomCode}/answers/${game.id}_${qIndex}`;
    const ref = db.ref(path);
    const cb = snap => {
      if (!snap.exists()) return;
      const data = snap.val();
      const newScores = { ...scores };
      Object.values(data).forEach(a => { if (a.correct && a.points) newScores[a.playerId] = (newScores[a.playerId] || 0) + a.points; });
      // Nota: Aquí solo actualizamos localmente el visual de la leaderboard mini
    };
    ref.on("value", cb);
    return () => ref.off("value", cb);
  }, [qIndex, game.id]);

  function submitAnswer(answerIdx, isCorrectAnswer) {
    if (!db) return;
    const points = isCorrectAnswer ? calcPoints(timeLeft) : 0;
    db.ref(`rooms/${roomCode}/answers/${game.id}_${qIndex}/${myId}`).set({
      playerId: myId, answer: answerIdx, correct: isCorrectAnswer, points, time: timeLeft
    });
    if (isCorrectAnswer) setScores(s => ({ ...s, [myId]: (s[myId] || 0) + points }));
  }

  function handleMCAnswer(idx) {
    if (showResult || myAnswer !== null) return;
    clearInterval(timerRef.current);
    setMyAnswer(idx);
    submitAnswer(idx, idx === question.answer);
    setShowResult(true);
  }

  function handleWordSubmit() {
    clearInterval(timerRef.current);
    const formed = placed.map(i => question.words[i]).join(" ");
    const correct = formed === question.answer;
    setMyAnswer(correct ? 1 : 0);
    submitAnswer(correct ? 1 : 0, correct);
    setDragDone(true);
    setShowResult(true);
  }

  function handleNextQ() {
    if (qIndex + 1 >= game.questions.length) {
      if (db) {
        const finalScores = {};
        players.forEach(p => { finalScores[p.id] = scores[p.id] || 0; });
        db.ref(`rooms/${roomCode}/scores`).update(finalScores);
      }
      onFinish(players.map(p => ({ ...p, score: scores[p.id] || 0 })));
    } else { setQIndex(q => q + 1); }
  }

  return (
    <div style={{ ...PAGE, display: "flex", flexDirection: "column" }}>
      <Confetti active={showConfetti} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 18px", background: "rgba(10,14,26,0.8)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{qIndex + 1}/{game.questions.length}</div>
        <div style={{ color: timeLeft <= 5 ? "#ff5252" : "#00e5ff", fontWeight: 800, animation: timeLeft <= 5 ? "timerWarn 0.6s infinite" : "none" }}>⏱ {timeLeft}s</div>
        <div style={{ color: "#ffea00", fontWeight: 800 }}>⭐ {scores[myId] || 0}</div>
      </div>

      <div style={{ padding: "20px", textAlign: "center", flex: 1 }}>
        {question.hint && <div style={{ fontSize: 12, color: "#e040fb", background: "#e040fb16", padding: "4px 12px", borderRadius: 20, display: "inline-block", marginBottom: 12 }}>{question.hint}</div>}
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>{isWordGame ? "Ordena la frase:" : question.q}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 500, margin: "0 auto" }}>
          {isWordGame ? (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "14px", background: "rgba(0,229,255,0.05)", border: "2px dashed rgba(0,229,255,0.2)", borderRadius: 16, minHeight: 60 }}>
                {placed.map((wi, i) => (
                  <div key={i} className="word-box" onClick={() => { if(!dragDone){ setPool([...pool, wi]); setPlaced(placed.filter((_, idx) => idx !== i)); }}} style={{ background: "#00e5ff33", padding: "8px 14px", borderRadius: 10, cursor: "pointer" }}>{question.words[wi]}</div>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 20 }}>
                {pool.map(wi => (
                  <div key={wi} className="word-box" onClick={() => { setPlaced([...placed, wi]); setPool(pool.filter(i => i !== wi)); }} style={{ background: "rgba(224,64,251,0.15)", padding: "10px 16px", borderRadius: 10, cursor: "pointer", border: "1px solid rgba(224,64,251,0.3)" }}>{question.words[wi]}</div>
                ))}
              </div>
              {!dragDone && placed.length === question.words.length && <button onClick={handleWordSubmit} style={{ marginTop: 20, background: "#76ff03", color: "#000", padding: "12px", borderRadius: 50, fontWeight: 800, border: "none" }}>Confirmar ✓</button>}
            </>
          ) : (
            question.options.map((opt, i) => (
              <button key={i} onClick={() => handleMCAnswer(i)} className="answer-button" disabled={showResult} style={{ background: showResult ? (i === question.answer ? "rgba(118,255,3,0.2)" : (i === myAnswer ? "rgba(255,82,82,0.2)" : "rgba(255,255,255,0.03)")) : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", padding: "15px", borderRadius: 14, textAlign: "left", cursor: "pointer" }}>
                <span style={{ marginRight: 10, opacity: 0.5 }}>{["A","B","C","D"][i]}</span> {opt}
              </button>
            ))
          )}
        </div>
      </div>

      {showResult && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#111420", padding: "30px", borderRadius: 24, textAlign: "center", maxWidth: 400, width: "100%", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 50 }}>{isCorrect ? "✅" : "❌"}</div>
            <div style={{ fontFamily: "'Bangers',cursive", fontSize: 28, color: isCorrect ? "#76ff03" : "#ff5252", margin: "10px 0" }}>{isCorrect ? "¡Correcto!" : "Incorrecto"}</div>
            {!isCorrect && <div style={{ marginBottom: 15, fontSize: 14, color: "#fff" }}>Respuesta: {isWordGame ? question.answer : question.options[question.answer]}</div>}
            <div style={{ background: "rgba(255,255,255,0.05)", padding: "12px", borderRadius: 12, fontSize: 13, color: "#8a9bb5", marginBottom: 20 }}>{question.explanation}</div>
            <button onClick={handleNextQ} style={{ background: "linear-gradient(135deg,#e040fb,#c020d9)", color: "#fff", border: "none", padding: "12px 30px", borderRadius: 50, fontWeight: 800, cursor: "pointer" }}>{qIndex + 1 >= game.questions.length ? "Resultados 🏆" : "Siguiente →"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   PANTALLA: PODIUM
   ══════════════════════════════════════════════ */
function PodiumScreen({ players, onPlayAgain }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <div style={PAGE}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 500, margin: "0 auto", padding: "40px 20px", textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Bangers',cursive", fontSize: 42, color: "#ffea00" }}>🏆 Resultados</h1>
        <div className="responsive-podium" style={{ marginTop: 30 }}>
          {sorted.slice(0, 5).map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", background: i === 0 ? "rgba(255,234,0,0.1)" : "rgba(255,255,255,0.03)", padding: "12px 20px", borderRadius: 16, marginBottom: 10, border: i === 0 ? "1px solid #ffea0044" : "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize: 20, marginRight: 15 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i+1}`}</span>
              <span style={{ flex: 1, textAlign: "left", fontWeight: 700 }}>{p.name}</span>
              <span style={{ color: "#ffea00", fontWeight: 800 }}>{p.score} pts</span>
            </div>
          ))}
        </div>
        <button onClick={onPlayAgain} style={{ marginTop: 30, background: "linear-gradient(135deg,#e040fb,#c020d9)", color: "#fff", border: "none", padding: "15px 40px", borderRadius: 50, fontWeight: 800, cursor: "pointer" }}>🔄 Jugar de nuevo</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   ROOT APP (Orquestador Original)
   ══════════════════════════════════════════════ */
export default function App() {
  const [screen, setScreen] = useState("home");
  const [firebaseStatus, setFirebaseStatus] = useState("idle");
  const [roomCode, setRoomCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState("");
  const [players, setPlayers] = useState([]);
  const [selectedGames, setSelectedGames] = useState(["game1","game2","game3","game4"]);
  const [gamesToPlay, setGamesToPlay] = useState([]);
  const [currentGameIdx, setCurrentGameIdx] = useState(0);
  const [finalPlayers, setFinalPlayers] = useState([]);

  useEffect(() => {
    if (!db || !roomCode || screen !== "lobby") return;
    const ref = db.ref(`rooms/${roomCode}/players`);
    const cb = snap => { if (snap.exists()) setPlayers(Object.values(snap.val()).sort((a,b) => a.joined - b.joined)); };
    ref.on("value", cb);
    return () => ref.off("value", cb);
  }, [roomCode, screen]);

  useEffect(() => {
    if (!db || !roomCode || isHost || screen !== "lobby") return;
    const ref = db.ref(`rooms/${roomCode}/started`);
    const cb = snap => {
      if (snap.val()) {
        db.ref(`rooms/${roomCode}/gamesToPlay`).once("value", s => {
          if (s.exists()) { setGamesToPlay(s.val()); setCurrentGameIdx(0); setScreen("game"); }
        });
      }
    };
    ref.on("value", cb);
    return () => ref.off("value", cb);
  }, [roomCode, isHost, screen]);

  async function handleHost() {
    try {
      await initFirebase();
      const code = generateCode();
      const hostId = uid();
      await roomRef(code).set({ started: false, gamesToPlay: [], players: { [hostId]: { id: hostId, name: "Profesor (Host)", color: "#00e5ff", score: 0, isHost: true, joined: Date.now() } } });
      setRoomCode(code); setIsHost(true); setMyPlayerId(hostId); setScreen("lobby");
    } catch (e) { setFirebaseStatus("error"); }
  }

  async function handleStartGame() {
    const ordered = Object.keys(GAME_DATA).filter(id => selectedGames.includes(id));
    setGamesToPlay(ordered);
    if (db) await roomRef(roomCode).update({ started: true, gamesToPlay: ordered });
    setScreen("game");
  }

  function handleGameFinish(updatedPlayers) {
    if (currentGameIdx + 1 < gamesToPlay.length) setCurrentGameIdx(i => i + 1);
    else { setFinalPlayers(updatedPlayers); setScreen("podium"); }
  }

  function handlePlayAgain() { if (db && roomCode) roomRef(roomCode).remove(); window.location.reload(); }

  if (screen === "home") return <HomeScreen onStart={() => setScreen("setup")} />;
  if (screen === "setup") return <SetupScreen onHost={handleHost} onJoin={() => setScreen("join")} onBack={() => setScreen("home")} />;
  if (screen === "join") return <JoinScreen onJoined={({code, playerId}) => { setRoomCode(code); setMyPlayerId(playerId); setScreen("lobby"); }} onBack={() => setScreen("setup")} />;
  if (screen === "lobby") return <LobbyScreen gameCode={roomCode} isHost={isHost} players={players} selectedGames={selectedGames} onStartGame={handleStartGame} onGameToggle={id => setSelectedGames(p => p.includes(id) ? p.filter(x => x!==id) : [...p, id])} onBack={handlePlayAgain} />;
  if (screen === "game") return <GameScreen key={gamesToPlay[currentGameIdx]} game={GAME_DATA[gamesToPlay[currentGameIdx]]} players={players} myId={myPlayerId} roomCode={roomCode} onFinish={handleGameFinish} />;
  if (screen === "podium") return <PodiumScreen players={finalPlayers} onPlayAgain={handlePlayAgain} />;
  return null;
}