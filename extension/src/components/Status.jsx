import React from 'react';

export default function Status({ text, isRunning }) {
  return (
    <div style={{
        backgroundColor: isRunning ? "#e8f5e9" : "#eee",
        color: isRunning ? "#2e7d32" : "#777",
        padding: "6px", borderRadius: "6px", fontWeight: "bold", 
        margin: "8px 0",
        border: isRunning ? "1px solid #c8e6c9" : "1px solid #ddd",
        fontSize: "13px"
    }}>
        {text}
    </div>
  );
}