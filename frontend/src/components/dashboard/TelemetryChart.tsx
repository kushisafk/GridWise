/**
 * TelemetryChart: interactive SVG time-series chart.
 *
 * - No charting dependency (keeps bundle small, fully themeable).
 * - Hover crosshair + tooltip, clickable legend to toggle series,
 *   range selector (1H / 6H / 12H / All) for mock or live data.
 * - Accepts normalized points so Overview (mock) and Analytics (live)
 *   share one component.
 */
import React, { useMemo, useState } from 'react';

export interface ChartPoint {
  t: string;
  demandKw: number;
  solarKw: number;
  evKw: number;
  stability?: number;
}

interface SeriesDef {
  key: keyof Pick<ChartPoint, 'demandKw' | 'solarKw' | 'evKw'>;
  label: string;
  color: string;
  dashed?: boolean;
}

const ALL_SERIES: SeriesDef[] = [
  { key: 'demandKw', label: 'Demand', color: '#10b981' },
  { key: 'evKw', label: 'EV Fleet', color: '#38bdf8' },
  { key: 'solarKw', label: 'Solar', color: '#f59e0b', dashed: true },
];

const RANGES = [
  { id: '1H', points: 8, label: '1H' },
  { id: '6H', points: 24, label: '6H' },
  { id: '12H', points: 48, label: '12H' },
  { id: 'ALL', points: Number.MAX_SAFE_INTEGER, label: 'All' },
] as const;

interface TelemetryChartProps {
  points: ChartPoint[];
  height?: number;
  title?: string;
  subtitle?: string;
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  points,
  height = 220,
  title = 'Grid Telemetry',
  subtitle,
}) => {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [rangeId, setRangeId] = useState<string>('12H');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const visibleSeries = useMemo(() => ALL_SERIES.filter((s) => !hidden.has(s.key)), [hidden]);

  const sliced = useMemo(() => {
    const r = RANGES.find((x) => x.id === rangeId) ?? RANGES[2];
    return points.slice(Math.max(0, points.length - r.points));
  }, [points, rangeId]);

  const maxVal = useMemo(() => {
    let m = 10;
    for (const p of sliced) for (const s of visibleSeries) m = Math.max(m, p[s.key]);
    return m * 1.15;
  }, [sliced, visibleSeries]);

  const W = 640;
  const pad = { top: 14, right: 12, bottom: 26, left: 40 };
  const iw = W - pad.left - pad.right;
  const ih = height - pad.top - pad.bottom;

  const getX = (i: number) =>
    sliced.length <= 1 ? pad.left + iw / 2 : pad.left + (i / (sliced.length - 1)) * iw;
  const getY = (v: number) => pad.top + ih - Math.min(1, Math.max(0, v / maxVal)) * ih;

  const pathFor = (s: SeriesDef) =>
    sliced.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p[s.key]).toFixed(1)}`).join(' ');

  const toggle = (key: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestDist = Infinity;
    sliced.forEach((_, i) => {
      const d = Math.abs(getX(i) - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHoverIdx(best);
  };

  const hovered = hoverIdx !== null ? sliced[hoverIdx] : null;

  return (
    <section aria-label={title} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-100">{title}</h3>
          {subtitle && <p className="text-xs text-[#94a3b8]">{subtitle}</p>}
        </div>
        {/* Range selector */}
        <div className="flex rounded-lg border border-slate-700 bg-slate-800 p-0.5" role="tablist" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={rangeId === r.id}
              onClick={() => {
                setRangeId(r.id);
                setHoverIdx(null);
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                rangeId === r.id ? 'bg-emerald-500/20 text-emerald-300' : 'text-[#94a3b8] hover:text-[#ffffff]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend toggles */}
      <div className="mb-1 flex flex-wrap gap-2">
        {ALL_SERIES.map((s) => {
          const off = hidden.has(s.key);
          return (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              aria-pressed={!off}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-opacity ${
                off ? 'border-slate-700 text-[#a1a1aa] opacity-60' : 'border-slate-700 text-[#cbd5e1]'
              }`}
            >
              <span className="inline-block h-0.5 w-4 rounded" style={{ background: off ? '#475569' : s.color }} />
              {s.label}
            </button>
          );
        })}
      </div>

      {sliced.length === 0 ? (
        <div className="chart-empty" style={{ height }}>
          <span className="text-xs text-[#94a3b8]">Awaiting telemetry...</span>
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${height}`}
            className="h-auto w-full cursor-crosshair"
            onMouseMove={onMove}
            onMouseLeave={() => setHoverIdx(null)}
            role="img"
            aria-label={`${title} line chart with ${sliced.length} points`}
          >
            {/* Gridlines */}
            {[0, 0.5, 1].map((r) => {
              const y = pad.top + ih - r * ih;
              return (
                <g key={r}>
                  <line x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="#d4d4d8" strokeOpacity="0.5" strokeDasharray="3 4" />
                  <text x={pad.left - 5} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="JetBrains Mono, monospace">
                    {Math.round(maxVal * r)}
                  </text>
                </g>
              );
            })}
            {/* X labels (sparse) */}
            {sliced.map((p, i) =>
              i % Math.ceil(sliced.length / 6) === 0 ? (
                <text key={i} x={getX(i)} y={height - 6} textAnchor="middle" fontSize="9" fill="#a1a1aa" fontFamily="JetBrains Mono, monospace">
                  {p.t}
                </text>
              ) : null,
            )}
            {/* Series paths */}
            {visibleSeries.map((s) => (
              <path key={s.key} d={pathFor(s)} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={s.dashed ? '5 4' : undefined} />
            ))}
            {/* Hover crosshair */}
            {hovered && hoverIdx !== null && (
              <g>
                <line x1={getX(hoverIdx)} y1={pad.top} x2={getX(hoverIdx)} y2={pad.top + ih} stroke="#242834" strokeOpacity="0.7" />
                {visibleSeries.map((s) => (
                  <circle key={s.key} cx={getX(hoverIdx)} cy={getY(hovered[s.key])} r="4" fill={s.color} stroke="#020617" strokeWidth="2" />
                ))}
              </g>
            )}
          </svg>
          {/* Tooltip */}
          {hovered && hoverIdx !== null && (
            <div className="pointer-events-none absolute left-2 top-2 rounded-lg border border-slate-700 bg-slate-950/95 px-2.5 py-1.5 font-mono text-[11px] shadow-xl">
              <div className="font-bold text-slate-200">{hovered.t}</div>
              {visibleSeries.map((s) => (
                <div key={s.key} className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded" style={{ background: s.color }} />
                  <span className="text-[#94a3b8]">{s.label}:</span>
                  <span className="font-bold text-slate-100">{hovered[s.key].toFixed(1)} kW</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <p className="mt-2 text-[11px] text-[#a1a1aa]">Y-axis: kW . hover for exact values . click legend to isolate series</p>
    </section>
  );
};
