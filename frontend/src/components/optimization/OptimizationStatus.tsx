import React from 'react';
import { Sliders, AlertCircle } from 'lucide-react';
import { OptimizationDecision } from '../../types/api';

interface OptimizationStatusProps {
  optimization: OptimizationDecision | null;
}

export const OptimizationStatus: React.FC<OptimizationStatusProps> = ({ optimization }) => {
  if (!optimization) {
    return (
      <div className="subcard text-center py-4">
        <Sliders size={24} className="text-muted mx-auto mb-1" />
        <p className="text-xs text-muted">No optimization run computed yet. Click \"Optimize\" in header.</p>
      </div>
    );
  }

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString();
    } catch {
      return iso;
    }
  };

  const hasWarnings = optimization.warnings && optimization.warnings.length > 0;
  const allocatedKw = optimization.allocated_power_kw ?? 0;
  const availableKw = optimization.available_power_kw ?? 0;
  const bessMode = optimization.bess_action?.mode ?? 'idle';
  const bessPower = optimization.bess_action?.target_power_kw ?? 0;

  return (
    <div className="subcard">
      <div className="flex justify-between items-center mb-2">
        <h3 className="subcard-title flex items-center gap-1.5">
          <Sliders size={16} className="text-primary" />
          Latest Optimization Cycle
        </h3>
        <span className="text-xs font-mono text-muted">{formatTime(optimization.timestamp)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="stat-box">
          <span className="stat-label">Allocated Power</span>
          <span className="stat-val font-semibold text-primary">
            {allocatedKw.toFixed(1)} / {availableKw.toFixed(1)} kW
          </span>
        </div>

        <div className="stat-box">
          <span className="stat-label">BESS Action</span>
          <span className="stat-val capitalize">
            {bessMode} {bessPower > 0 ? `(${bessPower.toFixed(1)} kW)` : ''}
          </span>
        </div>
      </div>

      {hasWarnings && (
        <div className="mt-2 text-xs text-amber-400 bg-amber-950/30 p-1.5 rounded border border-amber-800">
          <div className="font-semibold flex items-center gap-1">
            <AlertCircle size={12} /> Optimization Alerts:
          </div>
          <ul className="list-disc list-inside mt-0.5">
            {optimization.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
