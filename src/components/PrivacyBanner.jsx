import React from 'react';
import { ShieldCheck } from 'lucide-react';

const PrivacyBanner = () => {
  return (
    <div style={{ 
      background: 'var(--bg-secondary)', 
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '0.75rem 1.5rem',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '1rem',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '8px' }}>
          <ShieldCheck size={20} />
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Your files stay private</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Processing happens 100% in your browser. Your files never touch our servers.</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
         <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--bg-primary)', padding: '0.25rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: '4px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Local Only</span>
         <span style={{ fontSize: '0.7rem', fontWeight: 700, background: 'var(--bg-primary)', padding: '0.25rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: '4px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Open Source</span>
      </div>
    </div>
  );
};

export default PrivacyBanner;
