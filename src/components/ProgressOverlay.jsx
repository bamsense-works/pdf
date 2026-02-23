import React from 'react';

const ProgressOverlay = ({ label = 'Working...', progress = null }) => {
  const hasProgress = typeof progress === 'number';
  const pct = hasProgress ? Math.max(0, Math.min(100, Math.round(progress))) : null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-accent-secondary rounded-full animate-spin" />
      <p className="mt-4 font-medium text-primary">{label}</p>
      {hasProgress && (
        <div className="mt-4 w-[280px]">
          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-accent-secondary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-xs text-slate-500 text-right">{pct}%</div>
        </div>
      )}
    </div>
  );
};

export default ProgressOverlay;
