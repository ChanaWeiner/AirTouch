import React from 'react';

function KeyItem({ icon, label, wide, bg }) {
  return (
    <div style={{
      backgroundColor: bg || "white", padding: "8px", borderRadius: "6px",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      gridColumn: wide ? "span 2" : "span 1",
      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
      border: "1px solid #eee"
    }}>
      <span style={{ fontSize: "16px" }}>{icon}</span>
      <span style={{ fontWeight: "500" }}>{label}</span>
    </div>
  );
}

export default function Legend({ isActive, isAiActive }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px",
      fontSize: "12px", color: "#555", opacity: isActive ? 1 : 0.5
    }}>
      <KeyItem
        icon="✋"
        label={isAiActive ? "Stop Conversation" : "Pause"}
        wide={isAiActive}
      />

      {!isAiActive && (
        <>
          <KeyItem icon="✊" label="Play" />
          <KeyItem icon="👍" label="+10s" />
          <KeyItem icon="👎" label="-10s" />
          <KeyItem icon="🤟" label="Next / Skip" wide />
          <KeyItem icon="✌️" label="Speed (1x ↔ 2x)" wide />
          <KeyItem icon="☝️" label="Ask AI (Mic)" wide bg="#fff3e0" />
        </>
      )}
    </div>
  );
}