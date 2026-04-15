import { useState, useEffect, useRef } from "react";

const AVATAR_COLORS = [
  "#f97316", "#ef4444", "#a855f7", "#3b82f6",
  "#10b981", "#f59e0b", "#ec4899", "#06b6d4",
];

const ADJECTIVES = ["Speedy","Sneaky","Wobbly","Mighty","Funky","Cheeky","Zappy","Fuzzy"];
const NOUNS      = ["Penguin","Raccoon","Noodle","Cactus","Muffin","Pickle","Wizard","Panda"];

function randomName() {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a}${n}`;
}

// ── Floating doodle shapes in background ─────────────────────────────────────
const DOODLES = ["✏️","🎨","⭐","🌀","💡","🖌️","🎭","🔮","🌈","✨","🎯","🖍️"];

function FloatingDoodle({ emoji, style }) {
  return (
    <span style={{
      position: "absolute",
      fontSize: style.size,
      opacity: style.opacity,
      top: style.top,
      left: style.left,
      animation: `float-${style.dir} ${style.dur}s ease-in-out infinite`,
      animationDelay: `${style.delay}s`,
      userSelect: "none",
      pointerEvents: "none",
    }}>
      {emoji}
    </span>
  );
}

// ── Main Lobby component ──────────────────────────────────────────────────────
export default function Lobby({ onJoin }) {
  const [name,        setName]        = useState("");
  const [color,       setColor]       = useState(AVATAR_COLORS[0]);
  const [shaking,     setShaking]     = useState(false);
  const [ripple,      setRipple]      = useState(false);
  const [doodles]                     = useState(() =>
    Array.from({ length: 14 }, (_, i) => ({
      emoji: DOODLES[i % DOODLES.length],
      style: {
        size:    `${18 + Math.random() * 28}px`,
        opacity: 0.08 + Math.random() * 0.13,
        top:     `${Math.random() * 92}%`,
        left:    `${Math.random() * 96}%`,
        dur:     3 + Math.random() * 4,
        delay:   Math.random() * 4,
        dir:     Math.random() > 0.5 ? "a" : "b",
      },
    }))
  );
  const inputRef = useRef(null);

  // inject keyframes once
  useEffect(() => {
    if (document.getElementById("lobby-styles")) return;
    const s = document.createElement("style");
    s.id = "lobby-styles";
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800&display=swap');

      @keyframes float-a {
        0%,100% { transform: translateY(0px) rotate(-4deg); }
        50%     { transform: translateY(-18px) rotate(4deg); }
      }
      @keyframes float-b {
        0%,100% { transform: translateY(0px) rotate(3deg); }
        50%     { transform: translateY(14px) rotate(-5deg); }
      }
      @keyframes lobby-pop {
        0%   { transform: scale(0.82) translateY(24px); opacity: 0; }
        70%  { transform: scale(1.03) translateY(-4px); opacity: 1; }
        100% { transform: scale(1) translateY(0); opacity: 1; }
      }
      @keyframes lobby-shake {
        0%,100% { transform: translateX(0); }
        18%     { transform: translateX(-7px); }
        36%     { transform: translateX(7px); }
        54%     { transform: translateX(-5px); }
        72%     { transform: translateX(5px); }
      }
      @keyframes avatar-spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      @keyframes ripple-out {
        0%   { transform: scale(1);   opacity: 0.55; }
        100% { transform: scale(2.4); opacity: 0; }
      }
      @keyframes bounce-in {
        0%   { transform: scale(0); }
        60%  { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
      @keyframes title-wave {
        0%,100% { transform: translateY(0); }
        50%     { transform: translateY(-6px); }
      }
      @keyframes color-pulse {
        0%,100% { box-shadow: 0 0 0 3px rgba(255,255,255,0.9), 0 0 0 5px currentColor; }
        50%     { box-shadow: 0 0 0 3px rgba(255,255,255,0.9), 0 0 0 8px currentColor; }
      }

      .lobby-card {
        animation: lobby-pop 0.55s cubic-bezier(.34,1.46,.64,1) forwards;
      }
      .lobby-shake {
        animation: lobby-shake 0.4s ease !important;
      }
      .color-dot {
        width: 30px; height: 30px;
        border-radius: 50%;
        border: 2px solid transparent;
        cursor: pointer;
        transition: transform 0.15s, border-color 0.15s;
        position: relative;
      }
      .color-dot:hover { transform: scale(1.18); }
      .color-dot.selected {
        border-color: #fff;
        box-shadow: 0 0 0 2px currentColor;
        transform: scale(1.18);
        animation: color-pulse 1s ease infinite;
      }
      .join-btn {
        width: 100%;
        padding: 15px;
        border-radius: 16px;
        border: none;
        font-family: 'Fredoka One', cursive;
        font-size: 22px;
        letter-spacing: 0.5px;
        color: #fff;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        transition: transform 0.15s, box-shadow 0.15s;
      }
      .join-btn:hover  { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(0,0,0,0.22); }
      .join-btn:active { transform: scale(0.97); }
      .name-input {
        width: 100%;
        box-sizing: border-box;
        padding: 14px 18px;
        border-radius: 14px;
        border: 2.5px solid #e5e7eb;
        font-family: 'Nunito', sans-serif;
        font-size: 17px;
        font-weight: 700;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
        background: #fafafa;
        color: #1e293b;
      }
      .name-input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 4px rgba(59,130,246,0.12);
        background: #fff;
      }
      .name-input::placeholder { color: #c4c4c4; font-weight: 600; }
      .ripple-ring {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        animation: ripple-out 0.6s ease forwards;
        pointer-events: none;
      }
      .shuffle-btn {
        background: none;
        border: 1.5px solid #e5e7eb;
        border-radius: 10px;
        padding: 7px 12px;
        font-size: 13px;
        font-family: 'Nunito', sans-serif;
        font-weight: 700;
        color: #6b7280;
        cursor: pointer;
        transition: border-color 0.15s, color 0.15s, transform 0.15s;
        white-space: nowrap;
      }
      .shuffle-btn:hover { border-color: #3b82f6; color: #3b82f6; transform: scale(1.04); }
      .shuffle-btn:active { transform: scale(0.96); }
    `;
    document.head.appendChild(s);
  }, []);

  const handleJoin = () => {
  const trimmed = name.trim();

  if (!trimmed || trimmed.length < 2) {
    setShaking(true);
    setTimeout(() => setShaking(false), 420);
    inputRef.current?.focus();
    return;
  }

  const userId = trimmed + "_" + Date.now();

  sessionStorage.setItem("userId", userId);
  sessionStorage.setItem("name", trimmed);

  setRipple(true);

  setTimeout(() => {
    onJoin({
      name: trimmed,
      id: userId,
      color,
    });
  }, 380);
};

  const handleShuffle = () => {
    setName(randomName());
    // setName(random);
    const c = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    setColor(c);
  };

  // derive initials for avatar
  const initials = name.trim()
    ? name.trim().slice(0, 2).toUpperCase()
    : "?";

  const titleChars = "DoodleX".split("");

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(140deg, #eff6ff 0%, #dbeafe 50%, #e0f2fe 100%)",
      fontFamily: "'Nunito', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Floating background doodles */}
      {doodles.map((d, i) => (
        <FloatingDoodle key={i} emoji={d.emoji} style={d.style} />
      ))}

      {/* Card */}
      <div
        className={`lobby-card${shaking ? " lobby-shake" : ""}`}
        style={{
          background: "#fff",
          borderRadius: 28,
          padding: "44px 40px 40px",
          width: 380,
          maxWidth: "90vw",
          boxShadow: "0 24px 64px rgba(59,130,246,0.14), 0 4px 16px rgba(0,0,0,0.07)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          position: "relative",
          zIndex: 10,
        }}
      >

        {/* Title */}
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 1, marginBottom: 6 }}>
            {titleChars.map((ch, i) => (
              <span key={i} style={{
                fontFamily: "'Fredoka One', cursive",
                fontSize: 42,
                color: AVATAR_COLORS[i % AVATAR_COLORS.length],
                display: "inline-block",
                animation: `title-wave 2s ease-in-out infinite`,
                animationDelay: `${i * 0.12}s`,
                lineHeight: 1,
              }}>
                {ch}
              </span>
            ))}
          </div>
          <p style={{
            margin: 0,
            fontSize: 14,
            color: "#94a3b8",
            fontWeight: 600,
            letterSpacing: 0.3,
          }}>
            Draw. Guess. Win. 🎉
          </p>
        </div>

        {/* Avatar preview */}
        <div style={{ position: "relative" }}>
          <div style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            background: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Fredoka One', cursive",
            fontSize: 32,
            color: "#fff",
            boxShadow: `0 8px 24px ${color}66`,
            transition: "background 0.3s, box-shadow 0.3s",
            position: "relative",
          }}>
            {ripple && (
              <div className="ripple-ring" style={{ background: color }} />
            )}
            {initials}
          </div>
        </div>

        {/* Name input + shuffle */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{
            fontSize: 12,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 1.2,
            color: "#94a3b8",
          }}>
            Your name
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="Enter a name…"
              maxLength={20}
              className="name-input"
              style={{ flex: 1 }}
              autoFocus
            />
            <button className="shuffle-btn" onClick={handleShuffle} title="Random name">
              🎲 Random
            </button>
          </div>
          <div style={{
            fontSize: 12,
            color: "#cbd5e1",
            textAlign: "right",
            fontWeight: 600,
          }}>
            {name.trim().length}/20
          </div>
        </div>

        {/* Color picker */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{
            fontSize: 12,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 1.2,
            color: "#94a3b8",
          }}>
            Pick a color
          </label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                className={`color-dot${c === color ? " selected" : ""}`}
                style={{
                  background: c,
                  color: c,           // used by currentColor in CSS
                  boxShadow: c === color ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : "none",
                }}
                onClick={() => setColor(c)}
                aria-label={`Pick color ${c}`}
              />
            ))}
          </div>
        </div>

        {/* Join button */}
        <button
          className="join-btn"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}
          onClick={handleJoin}
        >
          Let's Draw! 🎨
        </button>

        {/* Footer note */}
        <p style={{
          margin: 0,
          fontSize: 12,
          color: "#cbd5e1",
          fontWeight: 600,
          textAlign: "center",
        }}>
          No account needed — just jump in ✌️
        </p>

      </div>
    </div>
  );
}
