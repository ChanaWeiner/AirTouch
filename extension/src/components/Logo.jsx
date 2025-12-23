// src/components/Logo.jsx
import React from 'react';

export default function Logo() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="#F1F3F4"/>
      <path d="M20 10C14.48 10 10 14.48 10 20C10 25.52 14.48 30 20 30" stroke="#4285F4" strokeWidth="3" strokeLinecap="round"/>
      <path d="M20 14C16.69 14 14 16.69 14 20" stroke="#EA4335" strokeWidth="3" strokeLinecap="round"/>
      <path d="M25 18L25 24" stroke="#FBBC05" strokeWidth="3" strokeLinecap="round"/>
      <path d="M29 16L29 26" stroke="#34A853" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}