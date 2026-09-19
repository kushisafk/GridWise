/**
 * MetricCard: Enterprise SCADA Hero KPI Tile.
 * Restrained industrial design: crisp light surface (#FFFFFF), 1px border (#E2E8F0),
 * flat operational status badges, clear monospaced telemetry values, and trend indicators.
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type MetricTone = 'emerald' | 'amber' | 'red' | 'blue' | 'slate';

const TONE_STYLES: Record<MetricTone, { border: string; iconBg: string; iconText: string; bar: string; badge: string }> = {
  emerald: {
    border: 'border-[#242834] hover:border-emerald-500',
    iconBg: 'bg-emerald-950/30 border-emerald-800',
    iconText: 'text-emerald-400',
    bar: 'bg-emerald-600',
    badge: 'bg-emerald-950/40 text-emerald-400 border-emerald-800',
  },
  amber: {
    border: 'border-[#242834] hover:border-amber-500',
    iconBg: 'bg-amber-950/30 border-amber-800',
    iconText: 'text-amber-400',
    bar: 'bg-amber-600',
    badge: 'bg-amber-950/40 text-amber-400 border-amber-800',
  },
  red: {
    border: 'border-[#242834] hover:border-red-500',
    iconBg: 'bg-red-950/30 border-red-800',
    iconText: 'text-red-400',
    bar: 'bg-red-600',
    badge: 'bg-red-950/40 text-red-400 border-red-800',
  },
  blue: {
    border: 'border-[#242834] hover:border-blue-500',
    iconBg: 'bg-blue-950/30 border-blue-800',
    iconText: 'text-blue-400',
    bar: 'bg-blue-600',
    badge: 'bg-blue-950/40 text-blue-400 border-blue-800',
  },
  slate: {
    border: 'border-[#242834]',
    iconBg: 'bg-[#0F1012] border-[#242834]',
    iconText: 'text-[#d4d4d8]',
    bar: 'bg-slate-600',
    badge: 'bg-[#0F1012] text-[#d4d4d8] border-[#475569]',
  },
};

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  subtext?: string;
  icon: LucideIcon;
  tone?: MetricTone;
  /** 0 to 1 progress fill under the value (e.g. utilization) */
  progress?: number;
  /** Small badge text, e.g. "LIVE" or grade */
  badge?: string;
  /** Trend text e.g. "↓ 3.2% vs prev hour" */
  trend?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  subtext,
  icon: Icon,
  tone = 'slate',
  progress,
  badge,
  trend,
}) => {
  const s = TONE_STYLES[tone];
  return (
    <section
      aria-label={label}
      className={`rounded-md border bg-[#141519] p-3.5 shadow-xs transition-colors ${s.border}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded border ${s.iconBg}`}>
            <Icon size={18} className={s.iconText} aria-hidden />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa]">{label}</p>
            <p className="font-mono text-2xl font-extrabold leading-tight text-[#ededed]">
              {value}
              {unit && <span className="ml-1 text-xs font-semibold text-[#a1a1aa]">{unit}</span>}
            </p>
          </div>
        </div>
        {badge && (
          <span className={`rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${s.badge}`}>
            {badge}
          </span>
        )}
      </div>

      {typeof progress === 'number' && (
        <div
          className="mt-2.5 h-1.5 w-full overflow-hidden rounded bg-[#0F1012]"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} utilization`}
        >
          <div className={`h-full rounded-xs ${s.bar}`} style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </div>
      )}

      {(subtext || trend) && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs text-[#a1a1aa]">
          {subtext && <span>{subtext}</span>}
          {trend && <span className="font-mono font-semibold text-[#d4d4d8]">{trend}</span>}
        </div>
      )}
    </section>
  );
};

