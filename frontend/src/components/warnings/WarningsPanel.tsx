import React from 'react';
import { AlertTriangle, AlertCircle, Info, ShieldCheck } from 'lucide-react';
import { SystemWarning } from '../../types/api';

interface WarningsPanelProps {
  warnings: SystemWarning[];
}

export const WarningsPanel: React.FC<WarningsPanelProps> = ({ warnings }) => {
  if (warnings.length === 0) {
    return (
      <div className="section-card bg-emerald-950/20 border-emerald-800">
        <div className="flex items-center gap-2 text-emerald-400">
          <ShieldCheck size={18} />
          <span className="font-semibold text-sm">System Operational: No Active Safety or Constraint Warnings</span>
        </div>
      </div>
    );
  }

  return (
    <div className="section-card">
      <div className="section-header mb-2">
        <h2 className="section-title text-amber-400">
          <AlertTriangle size={18} />
          Active System Alerts & Constraint Notifications ({warnings.length})
        </h2>
      </div>

      <div className="space-y-2">
        {warnings.map((w, idx) => {
          const isCritical = w.severity === 'critical';
          const isWarning = w.severity === 'warning';

          return (
            <div
              key={`${w.code}-${idx}`}
              className={`warning-item ${isCritical ? 'warning-critical' : isWarning ? 'warning-alert' : 'warning-info'}`}
            >
              <div className="warning-icon">
                {isCritical ? <AlertCircle size={18} /> : isWarning ? <AlertTriangle size={18} /> : <Info size={18} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="warning-code">{w.code}</span>
                  <span className={`warning-severity ${isCritical ? 'badge-danger' : isWarning ? 'badge-warning' : 'badge-neutral'}`}>
                    {w.severity.toUpperCase()}
                  </span>
                </div>
                <p className="warning-message">{w.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
