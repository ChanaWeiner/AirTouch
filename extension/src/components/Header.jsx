import React from 'react';

export default function Header() {
  return (
    <div style={{display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "5px"}}>
      <span style={{fontSize: "20px"}}>✈️</span>
      <h2 style={{margin: 0, color: "#333", fontSize: "18px"}}>AirTouch</h2>
    </div>
  );
}