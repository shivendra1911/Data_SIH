'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Tactical Portal Error]', error);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#020617',
      color: '#f8fafc',
      padding: 24,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: 500,
        backgroundColor: '#0f172a',
        border: '1px solid #ef4444',
        borderRadius: 12,
        padding: 32,
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.2)'
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <AlertTriangle size={32} color="#ef4444" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: '#f8fafc' }}>
          Tactical Command Subsystem Interrupted
        </h2>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24, lineHeight: 1.5 }}>
          An interface exception occurred during real-time radar rendering. The underlying backend and IoT telemetry feeds remain operational.
        </p>
        <button
          onClick={() => reset()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 13,
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            transition: 'opacity 0.2s'
          }}
        >
          <RefreshCw size={16} />
          <span>RELOAD TACTICAL CONSOLE</span>
        </button>
      </div>
    </div>
  );
}
