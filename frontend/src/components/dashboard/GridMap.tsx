/**
 * GridMap: SCADA Single-Line Microgrid Topology Visualizer.
 * Crisp SCADA / Engineering schematic style.
 * Light canvas (#F8FAFC), crisp 2px orthogonal lines (green energised, amber high load, red faulted).
 * Telemetry tags directly on nodes, interactive node inspection panel with manual controls.
 */
import React, { useMemo, useState } from 'react';
import { Zap, Power, Sliders } from 'lucide-react';
import { MOCK_EDGES, MOCK_NODES, STATUS_COLOR, type GridNode, type GridNodeKind } from '../../data/mockGrid';

const KIND_GLYPH: Record<GridNodeKind, string> = {
  substation: 'SUB',
  transformer: 'XFR',
  feeder: 'FDR',
  solar: 'SOL',
  battery: 'BAT',
  'ev-bay': 'EV',
  load: 'BLD',
};

interface GridMapProps {
  /** Override node statuses from live EV/warning state (nodeId -> status) */
  liveStatus?: Record<string, GridNode['status']>;
  title?: string;
}

export const GridMap: React.FC<GridMapProps> = ({
  liveStatus = {},
  title = 'SCADA Single-Line Grid Topology & Circuit Interconnections',
}) => {
  const [selectedId, setSelectedId] = useState<string>('TR-02');

  const nodes = useMemo(
    () => MOCK_NODES.map((n) => (liveStatus[n.id] ? { ...n, status: liveStatus[n.id]! } : n)),
    [liveStatus],
  );
  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  const selected = byId[selectedId] ?? nodes[0];

  const counts = useMemo(() => {
    const c = { online: 0, warning: 0, offline: 0 };
    for (const n of nodes) {
      if (n.status === 'warning') c.warning += 1;
      else if (n.status === 'offline') c.offline += 1;
      else c.online += 1;
    }
    return c;
  }, [nodes]);

  const nodeShape = (node: GridNode) => {
    const isSel = node.id === selectedId;
    const common = {
      stroke: isSel ? '#2563EB' : '#3f3f46',
      strokeWidth: isSel ? 1.8 : 1,
      fill: isSel ? '#1e293b' : '#64748b',
      style: { cursor: 'pointer' } as React.CSSProperties,
    };
    return <rect x={node.x - 3.4} y={node.y - 3.4} width={6.8} height={6.8} rx={1.2} {...common} />;
  };

  return (
    <section aria-label={title} className="rounded-md border border-[#242834] bg-[#141519] p-4 shadow-xs">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#242834] pb-2.5">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#ededed]">
            <Zap size={16} className="text-blue-600" /> {title}
          </h3>
          <p className="text-xs text-[#a1a1aa]">
            <span className="font-semibold text-emerald-400">{counts.online} Nominal</span>
            {' | '}
            <span className="font-semibold text-amber-400">{counts.warning} Constrained</span>
            {' | '}
            <span className="font-semibold text-red-400">{counts.offline} Outage/Faulted</span>
          </p>
        </div>
        {/* Status Legend */}
        <div className="flex flex-wrap gap-2 text-[11px] text-[#d4d4d8]" aria-label="Status legend">
          {(['online', 'warning', 'offline'] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5 rounded border border-[#242834] bg-[#0F1012] px-2 py-0.5 font-bold uppercase">
              <span className="inline-block h-2 w-2 rounded-xs" style={{ background: STATUS_COLOR[s] }} />
              {s === 'online' ? 'energized' : s}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        {/* SVG Engineering Canvas */}
        <div className="overflow-hidden rounded-md border border-[#242834] bg-[#0F1012]">
          <svg viewBox="0 0 100 62" className="h-auto w-full" role="img" aria-label="Microgrid single-line diagram">
            {/* Background SCADA Gridlines */}
            <defs>
              <pattern id="scadaGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#242834" strokeWidth="0.2" />
              </pattern>
            </defs>
            <rect width="100" height="62" fill="url(#scadaGrid)" />

            {/* Orthogonal SCADA Edges */}
            {MOCK_EDGES.map((e) => {
              const a = byId[e.from];
              const b = byId[e.to];
              if (!a || !b) return null;
              const dead = !e.energized;
              const isWarning = a.status === 'warning' || b.status === 'warning';

              return (
                <g key={e.id}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={dead ? '#ef4444' : isWarning ? '#fbbf24' : '#4ade80'}
                    strokeOpacity={dead ? 0.9 : 0.85}
                    strokeWidth={dead ? 0.9 : 0.75}
                  />
                  {/* Line Telemetry Tag */}
                  <text
                    x={(a.x + b.x) / 2}
                    y={(a.y + b.y) / 2 - 0.8}
                    textAnchor="middle"
                    fontSize={1.3}
                    fill="#94a3b8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {dead ? '0 kW' : `${(Math.abs(a.loadKw) * 0.8).toFixed(0)} kW`}
                  </text>
                </g>
              );
            })}

            {/* Rectangular SCADA Nodes */}
            {nodes.map((n) => (
              <g
                key={n.id}
                tabIndex={0}
                role="button"
                aria-label={`${n.label}, status ${n.status}, load ${n.loadKw} kilowatts`}
                onClick={() => setSelectedId(n.id)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    setSelectedId(n.id);
                  }
                }}
              >
                {nodeShape(n)}
                {/* Status Dot Indicator */}
                <circle cx={n.x + 2.5} cy={n.y - 2.5} r={1.0} fill={STATUS_COLOR[n.status]} stroke="#FFFFFF" strokeWidth={0.3} />
                {/* Kind Glyph Tag */}
                <text x={n.x} y={n.y + 0.3} textAnchor="middle" fontSize={1.8} dominantBaseline="central" fill="#cbd5e1" fontWeight={800} pointerEvents="none">
                  {KIND_GLYPH[n.kind]}
                </text>
                {/* Node ID Tag */}
                <text x={n.x} y={n.y + 5.2} textAnchor="middle" fontSize={1.8} fill="#e4e4e7" fontWeight={700} pointerEvents="none">
                  {n.id}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Selected Node Inspector Panel */}
        <aside className="rounded-md border border-[#242834] bg-[#141519] p-3.5 shadow-xs" aria-live="polite">
          <div className="flex items-center justify-between border-b border-[#242834] pb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#a1a1aa]">SCADA Inspector</p>
              <h4 className="text-sm font-extrabold text-[#ededed]">{selected.label}</h4>
            </div>
            <span className="font-mono text-xs font-bold text-[#a1a1aa]">{selected.id}</span>
          </div>

          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-xs text-[#a1a1aa]">Kind: <strong className="text-[#e4e4e7] uppercase">{selected.kind}</strong></span>
            <span
              className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-bold uppercase ${
                selected.status === 'warning'
                  ? 'border-amber-800 bg-amber-950/40 text-amber-400'
                  : selected.status === 'offline'
                  ? 'border-red-800 bg-red-950/40 text-red-400'
                  : 'border-emerald-800 bg-emerald-950/40 text-emerald-400'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[selected.status] }} />
              {selected.status}
            </span>
          </div>

          <dl className="mt-3 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between rounded border border-[#242834] bg-[#0F1012] px-2 py-1">
              <dt className="text-[#a1a1aa]">Active Load</dt>
              <dd className="font-extrabold text-[#ededed]">{selected.loadKw.toFixed(1)} / {selected.capacityKw.toFixed(0)} kW</dd>
            </div>
            <div className="flex justify-between rounded border border-[#242834] bg-[#0F1012] px-2 py-1">
              <dt className="text-[#a1a1aa]">Load Factor</dt>
              <dd className="font-extrabold text-[#ededed]">{Math.round((Math.abs(selected.loadKw) / selected.capacityKw) * 100)}%</dd>
            </div>
            <div className="flex justify-between rounded border border-[#242834] bg-[#0F1012] px-2 py-1">
              <dt className="text-[#a1a1aa]">Nominal Voltage</dt>
              <dd className="font-extrabold text-[#ededed]">{selected.voltageKv === 0 ? '415 V' : `${selected.voltageKv} kV`}</dd>
            </div>
            <div className="flex justify-between rounded border border-[#242834] bg-[#0F1012] px-2 py-1">
              <dt className="text-[#a1a1aa]">Grid Frequency</dt>
              <dd className="font-extrabold text-emerald-400">50.00 Hz</dd>
            </div>
          </dl>

          {/* Utilization progress bar */}
          <div className="mt-2.5 h-1.5 overflow-hidden rounded bg-[#0F1012]" role="progressbar" aria-valuenow={Math.round((Math.abs(selected.loadKw) / selected.capacityKw) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${selected.label} utilization`}>
            <div
              className={`h-full ${selected.status === 'warning' ? 'bg-amber-600' : selected.status === 'offline' ? 'bg-red-600' : 'bg-emerald-600'}`}
              style={{ width: `${Math.min(100, (Math.abs(selected.loadKw) / selected.capacityKw) * 100)}%` }}
            />
          </div>

          <p className="mt-2.5 text-xs text-[#a1a1aa]">{selected.note}</p>

          {/* Manual Operator Controls */}
          <div className="mt-3 pt-2.5 border-t border-[#242834] flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase text-[#a1a1aa]">Operator Override Controls</span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => alert(`Isolating Node ${selected.id} - Breaker Tripped (SCADA Guarded)`)}
                className="flex items-center justify-center gap-1 rounded border border-red-800 bg-red-950/40 px-2 py-1 text-xs font-bold text-red-400 hover:bg-red-950/60"
              >
                <Power size={12} /> Isolate Node
              </button>
              <button
                onClick={() => alert(`Set setpoint for ${selected.id} dispatched via API`)}
                className="flex items-center justify-center gap-1 rounded border border-[#475569] bg-[#0F1012] px-2 py-1 text-xs font-bold text-[#d4d4d8] hover:bg-[#0C0D0F]"
              >
                <Sliders size={12} /> Set Setpoint
              </button>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};

