import React from 'react';

export default function PermissionScreen({ onAction, isSetupTab }) {
  return (
    <div className="app-container" style={{justifyContent: "center"}}>
      <h2>AirTouch Setup 🛠️</h2>
      <p style={{color: "#666", fontSize: "14px"}}>
        {isSetupTab 
          ? "Click 'Allow' in the browser prompt." 
          : "Camera access is required."}
      </p>
      
      <button 
          onClick={onAction}
          style={{
              backgroundColor: "#2196F3", color: "white", padding: "10px 20px",
              border: "none", borderRadius: "5px", fontSize: "16px", cursor: "pointer", marginTop: "10px"
          }}
      >
          {isSetupTab ? "✋ Grant Permission & Close" : "👉 Open Settings"}
      </button>
      
      {!isSetupTab && (
         <p style={{fontSize: "11px", color: "#999", marginTop: "10px"}}>
             (This will open a new tab)
         </p>
      )}
    </div>
  );
}