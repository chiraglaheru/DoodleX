import { useEffect, useRef, useState, useCallback } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

// ── Sound engine (Web Audio API, no external deps) ──────────────────────────
const AudioCtx = typeof window !== "undefined"
  ? new (window.AudioContext || window.webkitAudioContext)()
  : null;

function playTone(freq, type = "sine", duration = 0.15, vol = 0.3) {
  if (!AudioCtx) return;
  const osc = AudioCtx.createOscillator();
  const gain = AudioCtx.createGain();
  osc.connect(gain);
  gain.connect(AudioCtx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, AudioCtx.currentTime);
  gain.gain.setValueAtTime(vol, AudioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, AudioCtx.currentTime + duration);
  osc.start(AudioCtx.currentTime);
  osc.stop(AudioCtx.currentTime + duration);
}

const SFX = {
  draw: () => playTone(800, "sine", 0.05, 0.05),
  correct: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => playTone(f, "sine", 0.2, 0.4), i * 80));
  },
  wrong: () => playTone(220, "sawtooth", 0.25, 0.2),
  tick: () => playTone(600, "square", 0.05, 0.15),
  urgentTick: () => playTone(900, "square", 0.08, 0.3),
  wordReveal: () => {
    [400, 500, 600].forEach((f, i) =>
      setTimeout(() => playTone(f, "triangle", 0.15, 0.3), i * 60));
  },
  select: () => playTone(700, "triangle", 0.12, 0.25),
};

// ── CSS injected once ────────────────────────────────────────────────────────
const STYLES = `
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes popIn {
  0%   { transform: scale(0.7); opacity: 0; }
  70%  { transform: scale(1.1); }
  100% { transform: scale(1);   opacity: 1; }
}
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20%     { transform: translateX(-6px); }
  40%     { transform: translateX(6px); }
  60%     { transform: translateX(-4px); }
  80%     { transform: translateX(4px); }
}
@keyframes pulse {
  0%,100% { transform: scale(1); }
  50%     { transform: scale(1.06); }
}
@keyframes timerWarn {
  0%,100% { color: #ef4444; transform: scale(1); }
  50%     { color: #dc2626; transform: scale(1.15); }
}
@keyframes messageSlide {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes lbRowIn {
  from { opacity: 0; transform: translateX(-16px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes barGrow {
  from { width: 0%; }
}
@keyframes overlayIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes cardIn {
  from { opacity: 0; transform: scale(0.88) translateY(20px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

.anim-fade-slide  { animation: fadeSlideIn 0.35s ease forwards; }
.anim-pop         { animation: popIn 0.4s cubic-bezier(.34,1.56,.64,1) forwards; }
.anim-shake       { animation: shake 0.4s ease; }
.anim-pulse       { animation: pulse 0.6s ease infinite; }
.anim-msg         { animation: messageSlide 0.3s ease forwards; }
.anim-timer-warn  { animation: timerWarn 0.5s ease infinite; }
.anim-hint-pop    { animation: popIn 0.35s cubic-bezier(.34,1.56,.64,1) forwards; }

.word-btn {
  padding: 10px 22px;
  border-radius: 10px;
  border: none;
  background: #3b82f6;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, background 0.15s, box-shadow 0.15s;
  box-shadow: 0 3px 8px rgba(59,130,246,0.35);
}
.word-btn:hover {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59,130,246,0.45);
}
.word-btn:active { transform: scale(0.96); }

.guess-btn {
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  background: #3b82f6;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}
.guess-btn:hover  { background: #2563eb; }
.guess-btn:active { transform: scale(0.96); }

.chat-input {
  border: 1.5px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  width: 100%;
  box-sizing: border-box;
}
.chat-input:focus { border-color: #3b82f6; }

.canvas-wrap {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(0,0,0,0.10);
  transition: box-shadow 0.3s;
}
.canvas-wrap.drawing { box-shadow: 0 6px 32px rgba(59,130,246,0.25); }

.player-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 14px;
  transition: background 0.2s;
}
.player-row.active {
  background: #dcfce7;
  font-weight: 700;
  color: #16a34a;
}

.dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #22c55e;
  animation: pulse 1.2s ease infinite;
}

/* ── Leaderboard styles ── */
.lb-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: overlayIn 0.3s ease forwards;
}
.lb-card {
  background: #fff;
  border-radius: 20px;
  width: 460px;
  max-width: calc(100vw - 32px);
  overflow: hidden;
  box-shadow: 0 32px 80px rgba(0,0,0,0.45);
  animation: cardIn 0.4s cubic-bezier(.34,1.2,.64,1) forwards;
}
.lb-header {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  padding: 28px 28px 22px;
  text-align: center;
}
.lb-header-title {
  color: #fff;
  font-size: 24px;
  font-weight: 800;
  margin: 0 0 4px;
  letter-spacing: -0.5px;
}
.lb-header-sub {
  color: #93c5fd;
  font-size: 13px;
  margin: 0;
}
.lb-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  border-bottom: 1px solid #f1f5f9;
  opacity: 0;
  animation: lbRowIn 0.4s ease forwards;
}
.lb-row:last-of-type { border-bottom: none; }
.lb-rank {
  min-width: 30px;
  text-align: center;
  font-size: 18px;
}
.lb-rank-num {
  font-size: 15px;
  font-weight: 700;
  color: #94a3b8;
}
.lb-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}
.lb-info { flex: 1; min-width: 0; }
.lb-name {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lb-sub {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 2px;
}
.lb-bar-track {
  height: 5px;
  background: #e2e8f0;
  border-radius: 99px;
  overflow: hidden;
  margin-top: 6px;
}
.lb-bar-fill {
  height: 100%;
  border-radius: 99px;
  animation: barGrow 0.9s cubic-bezier(.22,1,.36,1) forwards;
}
.lb-score {
  text-align: right;
  flex-shrink: 0;
}
.lb-score-num {
  font-size: 22px;
  font-weight: 800;
  color: #1d4ed8;
  line-height: 1;
}
.lb-score-label {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}
.lb-footer {
  padding: 16px 24px;
  text-align: center;
  border-top: 1px solid #f1f5f9;
  background: #f8fafc;
}
.lb-play-btn {
  padding: 11px 36px;
  font-size: 15px;
  font-weight: 700;
  border-radius: 10px;
  border: none;
  background: #3b82f6;
  color: #fff;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  box-shadow: 0 4px 12px rgba(59,130,246,0.4);
}
.lb-play-btn:hover  { background: #2563eb; }
.lb-play-btn:active { transform: scale(0.97); }
`;

function injectStyles() {
  if (document.getElementById("game-styles")) return;
  const s = document.createElement("style");
  s.id = "game-styles";
  s.textContent = STYLES;
  document.head.appendChild(s);
}

// ── Animated timer bar ───────────────────────────────────────────────────────
function TimerBar({ timeLeft, maxTime = 20 }) {
  const pct = Math.max(0, (timeLeft / maxTime) * 100);
  const urgent = timeLeft <= 5;
  const color = urgent ? "#ef4444" : timeLeft <= 10 ? "#f97316" : "#22c55e";

  return (
    <div style={{ width: "100%", marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "#6b7280" }}>Time</span>
        <span
          style={{ fontSize: 16, fontWeight: 700, minWidth: 28, textAlign: "right" }}
          className={urgent ? "anim-timer-warn" : ""}
        >
          {timeLeft}s
        </span>
      </div>
      <div style={{ height: 8, background: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: 99,
          transition: "width 0.9s linear, background 0.4s",
        }} />
      </div>
    </div>
  );
}

// ── Word hint display ────────────────────────────────────────────────────────
function WordHint({ word, isDrawer, revealedIndices = [] }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
      {word.split("").map((ch, i) => {
        const isSpace    = ch === " ";
        const isRevealed = isDrawer || isSpace || revealedIndices.includes(i);
        return (
          <span
            key={i}
            className={isRevealed && !isDrawer && !isSpace ? "anim-hint-pop" : ""}
            style={{
              display: "inline-block",
              minWidth: isSpace ? 16 : 26,
              height: 32,
              borderBottom: isSpace ? "none" : `2.5px solid ${isRevealed ? "#1d4ed8" : "#374151"}`,
              textAlign: "center",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 1,
              color: isDrawer ? "#1d4ed8" : isRevealed ? "#1d4ed8" : "transparent",
              transition: "color 0.2s",
            }}
          >
            {isRevealed ? ch : (isSpace ? "\u00a0" : "_")}
          </span>
        );
      })}
    </div>
  );
}

// ── Chat message ─────────────────────────────────────────────────────────────
function ChatMessage({ msg }) {
  const isCorrect = msg.type === "correct";
  return (
    <div
      className="anim-msg"
      style={{
        padding: "5px 8px",
        borderRadius: 8,
        marginBottom: 4,
        fontSize: 13,
        background: isCorrect ? "#dcfce7" : "transparent",
        color: isCorrect ? "#15803d" : "#374151",
        fontWeight: isCorrect ? 700 : 400,
        borderLeft: isCorrect ? "3px solid #22c55e" : "none",
      }}
    >
      {isCorrect && <span style={{ marginRight: 5 }}>✓</span>}
      {msg.text}
    </div>
  );
}

// ── Leaderboard overlay ──────────────────────────────────────────────────────
const MEDALS    = ["🥇", "🥈", "🥉"];
const ROW_BG    = ["#fffbeb", "#f8fafc", "#fff7f3"];
const AV_STYLES = [
  { background: "#fef9c3", color: "#854d0e" },
  { background: "#e2e8f0", color: "#334155" },
  { background: "#ffedd5", color: "#9a3412" },
];
const BAR_COLORS = ["#eab308", "#94a3b8", "#f97316", "#3b82f6"];

function Leaderboard({ players, scores, turnCount }) {
  const sorted = [...players].sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
  const maxScore = Math.max(...sorted.map((p) => scores[p] || 0), 1);

  return (
    <div className="lb-overlay">
      <div className="lb-card">
        {/* Header */}
        <div className="lb-header">
          <p className="lb-header-title">🏆 Leaderboard</p>
          <p className="lb-header-sub">
            Game over &mdash; {turnCount} round{turnCount !== 1 ? "s" : ""} played
          </p>
        </div>

        {/* Rows */}
        {sorted.map((player, i) => {
          const pts      = scores[player] || 0;
          const pct      = Math.round((pts / maxScore) * 100);
          const isTop3   = i < 3;
          const initials = player.slice(0, 2).toUpperCase();
          const avStyle  = AV_STYLES[i] || { background: "#f1f5f9", color: "#64748b" };
          const barColor = BAR_COLORS[i] || BAR_COLORS[BAR_COLORS.length - 1];
          const rowBg    = ROW_BG[i] || "#fff";

          return (
            <div
              key={player}
              className="lb-row"
              style={{
                background: rowBg,
                animationDelay: `${i * 0.08}s`,
              }}
            >
              {/* Rank */}
              <div className="lb-rank">
                {isTop3
                  ? <span style={{ fontSize: 20 }}>{MEDALS[i]}</span>
                  : <span className="lb-rank-num">{i + 1}</span>
                }
              </div>

              {/* Avatar */}
              <div className="lb-avatar" style={avStyle}>
                {initials}
              </div>

              {/* Name + bar */}
              <div className="lb-info">
                <div className="lb-name">{player}</div>
                <div className="lb-bar-track">
                  <div
                    className="lb-bar-fill"
                    style={{ width: `${pct}%`, background: barColor }}
                  />
                </div>
              </div>

              {/* Score */}
              <div className="lb-score">
                <div className="lb-score-num">{pts}</div>
                <div className="lb-score-label">pts</div>
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div className="lb-footer">
          <button className="lb-play-btn" onClick={() => window.location.reload()}>
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main game component ──────────────────────────────────────────────────────
function Game() {
  useEffect(() => { injectStyles(); }, []);

  const canvasRef        = useRef(null);
  const ctxRef           = useRef(null);
  const chatEndRef       = useRef(null);
  const stompClientRef   = useRef(null);
  const playersLengthRef = useRef(0);
  const currentDrawerRef = useRef("");

  const [userId] = useState(() =>
  sessionStorage.getItem("userId")
); 

  const [players,         setPlayers]         = useState([]);
  const [currentDrawer,   setCurrentDrawer]   = useState("");
  const [realWord,        setRealWord]         = useState("");
  const [gameStarted,     setGameStarted]     = useState(false);
  const [messages,        setMessages]         = useState([]);
  const [chatInput,       setChatInput]       = useState("");
  const [timeLeft,        setTimeLeft]         = useState(20);
  const [wordOptions,     setWordOptions]     = useState([]);
  const [selectTime,      setSelectTime]      = useState(10);
  const [customWord,      setCustomWord]      = useState("");
  const [drawing,         setDrawing]         = useState(false);
  const [canvasBounce,    setCanvasBounce]    = useState(false);
  const [shakeCanvas,     setShakeCanvas]     = useState(false);
  const [turnCount,       setTurnCount]       = useState(0);
  const [gameEnded,       setGameEnded]       = useState(false);
  const [revealedIndices, setRevealedIndices] = useState([]);

  // ── Score state: { username: number } ────────────────────────────────────
  const [scores, setScores] = useState({});
  const isDrawer = userId === currentDrawer;

  // Keep refs in sync
  useEffect(() => { playersLengthRef.current = players.length; }, [players]);
  useEffect(() => { currentDrawerRef.current = currentDrawer; }, [currentDrawer]);

  // Callback ref — ctx ready as soon as canvas mounts
  const canvasCallbackRef = useCallback((canvas) => {
    if (!canvas) return;
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth   = 3;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.strokeStyle = "#000";
    ctxRef.current  = ctx;
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Tick sounds
  const prevTimeRef = useRef(timeLeft);
  useEffect(() => {
    if (gameStarted && timeLeft !== prevTimeRef.current) {
      if (timeLeft <= 5 && timeLeft > 0) SFX.urgentTick();
      else if (timeLeft > 0)             SFX.tick();
      prevTimeRef.current = timeLeft;
    }
  }, [timeLeft, gameStarted]);

  // Progressive hint reveal
  useEffect(() => {
    if (!gameStarted || !realWord || isDrawer) return;

    const nonSpaceIndices = realWord
      .split("")
      .map((ch, i) => (ch !== " " ? i : null))
      .filter((i) => i !== null);

    const totalHints = Math.min(Math.floor(nonSpaceIndices.length / 2), 4);
    const hintTimes  = [14, 11, 8, 5].slice(0, totalHints);

    if (hintTimes.includes(timeLeft)) {
      setRevealedIndices((prev) => {
        const unrevealed = nonSpaceIndices.filter((i) => !prev.includes(i));
        if (unrevealed.length === 0) return prev;
        const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)];
        SFX.wordReveal();
        return [...prev, pick];
      });
    }
  }, [timeLeft, gameStarted, realWord,isDrawer]);

  // SOCKET
  useEffect(() => {
    const socket = new SockJS("https://doodlex-backend-590f.onrender.com/chat");
    const client = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        stompClientRef.current = client;

        client.subscribe("/topic/players", (msg) => {
        const data = JSON.parse(msg.body);
        console.log("PLAYERS FROM BACKEND:", data); 
        setPlayers(data);
        });

        client.subscribe("/topic/turn", (msg) => {
          const drawer = msg.body;
          if (!drawer) return;
          setCurrentDrawer(drawer);
          if (drawer === userId) {
            client.publish({ destination: "/app/getWords", body: "get" });
            setSelectTime(10);
          }
        });

        client.subscribe("/topic/words", (msg) => {
          setWordOptions(JSON.parse(msg.body));
          SFX.wordReveal();
        });

        client.subscribe("/topic/game", (msg) => {
          const w = msg.body.trim();
          setRealWord(w);
          setGameStarted(true);
          setMessages([]);
          setWordOptions([]);
          setTimeLeft(20);
          setRevealedIndices([]);
          SFX.wordReveal();
          if (ctxRef.current)
            ctxRef.current.clearRect(0, 0, 500, 350);
        });

        client.subscribe("/topic/draw", (msg) => {
          const data = JSON.parse(msg.body);
          if (data.userId === userId) return;
          const ctx = ctxRef.current;
          if (!ctx) return;
          if (data.type === "start") {
            ctx.beginPath();
            ctx.moveTo(data.x, data.y);
          } else {
            ctx.lineTo(data.x, data.y);
            ctx.stroke();
          }
        });

        client.subscribe("/topic/guess", (msg) => {
          const data = msg.body;

          if (data.startsWith("CORRECT")) {
            const parts        = data.split(":");
            const correctGuesser = parts[1];
            const drawerAtTime   = currentDrawerRef.current;

            SFX.correct();
            setCanvasBounce(true);
            setTimeout(() => setCanvasBounce(false), 600);

            setMessages((prev) => [
              ...prev,
              correctGuesser === userId
                ? { text: "You got it!", type: "correct" }
                : { text: `${correctGuesser} guessed it!`, type: "correct" },
            ]);

            // ── Award points ─────────────────────────────────────────────
            setScores((prev) => {
              const updated = { ...prev };
              // Guesser: 200 pts
              updated[correctGuesser] = (updated[correctGuesser] || 0) + 200;
              // Drawer: 50 pts for a round that gets solved
              if (drawerAtTime) {
                updated[drawerAtTime] = (updated[drawerAtTime] || 0) + 50;
              }
              return updated;
            });

            setGameStarted(false);
            setRealWord("");
            setTimeLeft(20);

            setTimeout(() => {
              stompClientRef.current?.publish({ destination: "/app/nextTurn", body: "" });
            }, 1500);

            setTurnCount((prev) => {
              const next = prev + 1;
              if (playersLengthRef.current > 0 && next >= playersLengthRef.current * 2) {
                setGameEnded(true);
              }
              return next;
            });

            return;
          }

          if (data.startsWith("WRONG")) {
            const parts = data.split(":");
            SFX.wrong();
            setShakeCanvas(true);
            setTimeout(() => setShakeCanvas(false), 450);
            setMessages((prev) => [
              ...prev,
              { text: `${parts[1]}: ${parts[2]}` },
            ]);
          }
        });

       setTimeout(() => {
  client.publish({ destination: "/app/join", body: userId });
}, 200);

setTimeout(() => {
  client.publish({ destination: "/app/getTurn", body: "" });
}, 800);
      },
    });

    client.activate();
    return () => client.deactivate();
  }, [userId]);

  // Draw events
  const startDraw = (e) => {
    if (userId !== currentDrawer || !ctxRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
    setDrawing(true);
    SFX.draw();
    stompClientRef.current?.publish({
      destination: "/app/draw",
      body: JSON.stringify({ x, y, type: "start", userId }),
    });
  };

  const draw = (e) => {
    if (!drawing || userId !== currentDrawer || !ctxRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
    stompClientRef.current?.publish({
      destination: "/app/draw",
      body: JSON.stringify({ x, y, type: "draw", userId }),
    });
  };

  const stopDraw = () => setDrawing(false);

  // Timer
  useEffect(() => {
    if (!gameStarted || gameEnded) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stompClientRef.current?.publish({ destination: "/app/nextTurn", body: "" });
          setGameStarted(false);
          setRealWord("");
          setTurnCount((prevCount) => {
            const next = prevCount + 1;
            if (next >= playersLengthRef.current * 2) {
              setGameEnded(true);
            }
            return next;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameStarted, gameEnded]);

  const sendGuess = () => {
    if (!chatInput.trim() || userId === currentDrawer) return;
    stompClientRef.current?.publish({
      destination: "/app/guess",
      body: `${userId}:${chatInput}`,
    });
    setChatInput("");
  };

  const selectWord = (w) => {
    if (!w.trim()) return;
    SFX.select();
    stompClientRef.current?.publish({ destination: "/app/chooseWord", body: w });
    setWordOptions([]);
  };

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)",
      fontFamily: "system-ui, sans-serif",
    }}>

      {/* Header */}
      <div style={{
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
      }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: "#1d4ed8", letterSpacing: -0.5 }}>
          🎨 DoodleX
        </span>
        {gameStarted && <TimerBar timeLeft={timeLeft} maxTime={20} />}
        <div style={{ width: 80 }} />
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Players sidebar */}
        <div style={{
          width: 180,
          background: "#fff",
          borderRight: "1px solid #e5e7eb",
          padding: "14px 10px",
          overflowY: "auto",
        }}>
          <p style={{
            fontSize: 11, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: 1, color: "#9ca3af", margin: "0 0 10px 4px",
          }}>
            Players
          </p>
          {players.map((p, i) => (
            <div
              key={p}
              className={`player-row${p === currentDrawer ? " active" : ""} anim-fade-slide`}
              style={{ animationDelay: `${i * 0.05}s` }}
              >
              {p === currentDrawer
                ? <span style={{ fontSize: 14 }}>✏️</span>
                : <div className="dot" />}
              <span style={{ fontSize: 14 }}>{p.split("_")[0]}</span>
              {scores[p] !== undefined && (
                <span style={{
                  marginLeft: "auto", fontSize: 12, fontWeight: 700,
                  color: "#3b82f6",
                }}>
                  {scores[p]}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Main game area */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 16px",
          gap: 16,
        }}>

          {/* Word selection */}
          {!gameStarted && isDrawer && wordOptions.length > 0 && (
            <div className="anim-pop" style={{
              background: "#fff",
              borderRadius: 20,
              padding: "32px 40px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
            }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1e293b" }}>
                Choose your word
                <span style={{
                  marginLeft: 10, fontSize: 14, fontWeight: 500,
                  color: "#6b7280", background: "#f3f4f6",
                  padding: "2px 8px", borderRadius: 99,
                }}>{selectTime}s</span>
              </h2>

              <div style={{ display: "flex", gap: 12 }}>
                {wordOptions.map((w, i) => (
                  <button
                    key={i}
                    className="word-btn anim-fade-slide"
                    style={{ animationDelay: `${i * 0.07}s` }}
                    onClick={() => selectWord(w)}
                  >
                    {w}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={customWord}
                  onChange={(e) => setCustomWord(e.target.value)}
                  placeholder="Custom word…"
                  className="chat-input"
                  style={{ width: 180 }}
                  onKeyDown={(e) => e.key === "Enter" && selectWord(customWord)}
                />
                <button
                  className="word-btn"
                  style={{ background: "#16a34a", boxShadow: "0 3px 8px rgba(22,163,74,0.35)" }}
                  onClick={() => selectWord(customWord)}
                >
                  Use
                </button>
              </div>
            </div>
          )}

          {/* Waiting state */}
          {!gameStarted && !isDrawer && wordOptions.length === 0 && (
            <div className="anim-fade-slide" style={{ textAlign: "center", color: "#6b7280" }}>
              <div style={{
                width: 40, height: 40, border: "3px solid #3b82f6",
                borderTopColor: "transparent", borderRadius: "50%",
                margin: "0 auto 12px",
                animation: "spin 0.8s linear infinite",
              }} />
              <p style={{ margin: 0, fontSize: 15 }}>
                {currentDrawer ? `Waiting for ${currentDrawer}…` : "Connecting…"}
              </p>
            </div>
          )}

          {/* Canvas area */}
          <div style={{
            display: gameStarted ? "flex" : "none",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            width: "100%",
          }}>
            <WordHint word={realWord} isDrawer={isDrawer} revealedIndices={revealedIndices} />

            <div className={
              `canvas-wrap${drawing ? " drawing" : ""}${shakeCanvas ? " anim-shake" : ""}${canvasBounce ? " anim-pop" : ""}`
            }>
              <canvas
                ref={canvasCallbackRef}
                width={500}
                height={350}
                style={{
                  display: "block",
                  cursor: isDrawer ? "crosshair" : "default",
                  background: "#fff",
                }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
              />
              {isDrawer && (
                <div style={{
                  position: "absolute", top: 8, right: 8,
                  background: "rgba(59,130,246,0.12)",
                  borderRadius: 8, padding: "3px 10px",
                  fontSize: 12, color: "#1d4ed8", fontWeight: 600,
                }}>
                  You're drawing
                </div>
              )}
            </div>

            {isDrawer && (
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                Draw: <strong style={{ color: "#1e293b" }}>{realWord}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Chat sidebar */}
        <div style={{
          width: 220,
          background: "#fff",
          borderLeft: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          padding: "14px 10px",
        }}>
          <p style={{
            fontSize: 11, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: 1, color: "#9ca3af", margin: "0 0 10px 4px",
          }}>
            Chat
          </p>

          <div style={{ flex: 1, overflowY: "auto", marginBottom: 10 }}>
            {messages.map((m, i) => <ChatMessage key={i} msg={m} />)}
            <div ref={chatEndRef} />
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendGuess()}
              placeholder={isDrawer ? "You're drawing…" : "Guess…"}
              disabled={isDrawer}
              className="chat-input"
              style={{ flex: 1, opacity: isDrawer ? 0.5 : 1 }}
            />
            <button
              onClick={sendGuess}
              disabled={isDrawer}
              className="guess-btn"
              style={{ opacity: isDrawer ? 0.4 : 1 }}
            >
              ↑
            </button>
          </div>
        </div>
      </div>

      {/* ── Leaderboard (replaces old Game Over screen) ── */}
      {gameEnded && (
        <Leaderboard
          players={players}
          scores={scores}
          turnCount={turnCount}
        />
      )}
    </div>
  );
}

export default Game;
