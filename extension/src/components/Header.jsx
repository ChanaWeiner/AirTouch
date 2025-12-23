import React from 'react';

export default function Header() {
  return (
    <div className="brand-header">
      <svg viewBox="0 0 260 60" className="logo-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* תיקון קריטי: הוספתי gradientUnits="userSpaceOnUse"
              זה מונע מהפסים האנכיים להיעלם!
          */}
          <linearGradient 
            id="liquid-stroke-grad" 
            gradientUnits="userSpaceOnUse"
            x1="0%" y1="0%" x2="200%" y2="0%"
          >
            <stop offset="0%" stopColor="#2563EB" />   {/* כחול */}
            <stop offset="50%" stopColor="#F43F5E" />   {/* ורוד */}
            <stop offset="100%" stopColor="#2563EB" />  {/* חזרה לכחול */}
            
            {/* אנימציית הזרימה */}
            <animate attributeName="x1" from="0%" to="-200%" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="x2" from="100%" to="-100%" dur="2.5s" repeatCount="indefinite" />
          </linearGradient>

          {/* גרדיאנט הברק לטקסט */}
          <linearGradient id="flash-text-grad" x1="0%" y1="0%" x2="200%" y2="0%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="45%" stopColor="#2563EB" />
            <stop offset="50%" stopColor="#FFFFFF" /> 
            <stop offset="55%" stopColor="#9333EA" />
            <stop offset="100%" stopColor="#9333EA" />
            <animate attributeName="x1" from="-100%" to="100%" dur="3.5s" repeatCount="indefinite" />
            <animate attributeName="x2" from="0%" to="200%" dur="3.5s" repeatCount="indefinite" />
          </linearGradient>
        </defs>

        {/* --- Nested SVG לאייקון --- */}
        {/* הגדרנו לו גודל של 50x50 ומיקום x=10, y=5 */}
        <svg x="10" y="5" width="50" height="50" viewBox="0 0 128 128" className="icon-pulse">
            {/* רקע העיגול הלבן */}
            <circle cx="64" cy="64" r="60" fill="white" stroke="#E2E8F0" strokeWidth="2"/>

            {/* הקבוצה של הפסים - כולם מקבלים את הגרדיאנט */}
            <g stroke="url(#liquid-stroke-grad)" strokeWidth="8" strokeLinecap="round" fill="none">
                {/* הקשת הגדולה (כחולה במקור) */}
                <path d="M64 34C46.33 34 32 48.33 32 66" />
                {/* הקשת הקטנה (אדומה במקור) */}
                <path d="M64 46C53.4 46 44.8 54.6 44.8 66" />
                {/* הפס הימני הקצר (צהוב במקור) - אנכי */}
                <path d="M80 58V78" />
                {/* הפס הימני הארוך (ירוק במקור) - אנכי */}
                <path d="M94 52V84" />
            </g>
        </svg>

        {/* --- הטקסט --- */}
        <text x="70" y="42" fontFamily="'Outfit', sans-serif" fontWeight="800" fontSize="34" letterSpacing="-1">
          <tspan fill="url(#flash-text-grad)">Ai</tspan>
          <tspan fill="#1e293b">rTouch</tspan>
        </text>
      </svg>
    </div>
  );
}