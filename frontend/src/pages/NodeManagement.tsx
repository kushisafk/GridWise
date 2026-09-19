/**
 * NodeManagement tab: substations / feeders / breakers / EV bays.
 * Merges live EV fleet rows with the static grid topology so operators
 * can filter, acknowledge, and act per node.
 */
import React, { useMemo, useState } from 'react';
import { CheckCircle2, Network, Power, RotateCcw, Search } from 'lucide-react';
import { EVFleetTable } from '../components/ev/EVFleetTable';
import { InfrastructureOverview } from '../components/infrastructure/InfrastructureOverview';
import { MOCK_NODES, STATUS_COLOR, type GridNodeStatus } from '../data/mockGrid';
import type { EnergyDetailResponse, EnergySummary, EVDetailResponse } from '../types/api';

interface NodeManagementProps {
  energy: EnergyDetailResponse | null;
  energySummary: EnergySummary | null;
  evs: EVDetailResponse[];
}

type Filter = 'all' | GridNodeStatus;

export const NodeManagement: React.FC<NodeManagementProps> = ({ energy, energySummary, evs }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [acked, setAcked] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MOCK_NODES.filter((n) => {
      if (filter !== 'all' && n.status !== filter) return false;
      if (!q) return true;
      return `${n.id} ${n.label} ${n.kind} ${n.status}`.toLowerCase().includes(q);
    });
  }, [query, filter]);

  const toggleAck = (id: string) =>
    setAcked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      <InfrastructureOverview energy={energy} summary={energySummary} />

      {/* Node registry */}
      <section aria-label="Grid node registry" className="rounded-md border border-[#242834] bg-[#141519] p-4 shadow-xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#242834] pb-2.5">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#ededed]">
            <Network size={16} className="text-blue-600" /> Substation Nodes & Breaker Control Center
            <span className="rounded bg-[#0F1012] px-2 py-0.5 font-mono text-xs font-bold text-[#d4d4d8] border border-[#242834]">{rows.length} Active</span>
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <label className="flex items-center gap-1.5 rounded border border-[#242834] bg-[#0F1012] px-2.5 py-1 text-xs">
              <Search size={14} className="text-[#94a3b8]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search node ID / label..."
                aria-label="Search nodes"
                className="w-40 bg-transparent text-xs text-[#ededed] placeholder:text-[#71717a] focus:outline-none"
              />
            </label>
            {/* Status filter */}
            <div className="flex rounded border border-[#242834] bg-[#0F1012] p-0.5" role="tablist" aria-label="Filter by status">
              {(['all', 'online', 'stable', 'warning', 'offline'] as const).map((f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={`rounded px-2.5 py-1 text-xs font-bold capitalize ${
                    filter === f ? 'bg-[#2563eb] text-white' : 'text-[#a1a1aa] hover:text-[#ffffff]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto slim-scroll">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#242834] bg-[#0F1012] text-[11px] font-extrabold uppercase text-[#a1a1aa]">
                <th className="px-3 py-2.5">Node ID & Label</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Load / Max Capacity</th>
                <th className="px-3 py-2.5">Load Factor</th>
                <th className="px-3 py-2.5">Operational Note</th>
                <th className="px-3 py-2.5 text-right">Breaker Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n) => {
                const util = Math.abs(n.loadKw) / n.capacityKw;
                const isAcked = acked.has(n.id);
                return (
                  <tr key={n.id} className={`border-b border-[#242834] hover:bg-[#0C0D0F] ${n.status === 'warning' ? 'bg-amber-950/20' : n.status === 'offline' ? 'bg-red-950/30' : ''}`}>
                    <td className="px-3 py-2.5">
                      <div className="font-extrabold text-[#ededed]">{n.id}</div>
                      <div className="text-[11px] text-[#a1a1aa]">{n.label} | <span className="uppercase">{n.kind}</span></div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5 rounded border border-[#242834] bg-[#0F1012] px-2 py-0.5 text-xs font-bold uppercase">
                        <span className="inline-block h-2 w-2 rounded-xs" style={{ background: STATUS_COLOR[n.status] }} />
                        {n.status}
                      </span>
                      {isAcked && <span className="ml-1 text-[11px] font-bold text-emerald-400">| Acked</span>}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold text-[#e4e4e7]">{n.loadKw.toFixed(1)} / {n.capacityKw.toFixed(0)} kW</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded bg-[#0F1012]" role="progressbar" aria-valuenow={Math.round(util * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${n.id} utilization`}>
                          <div
                            className={`h-full ${n.status === 'warning' ? 'bg-amber-600' : n.status === 'offline' ? 'bg-red-600' : 'bg-emerald-600'}`}
                            style={{ width: `${Math.min(100, util * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-[#d4d4d8]">{Math.round(util * 100)}%</span>
                      </div>
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-2.5 text-[#a1a1aa]" title={n.note}>{n.note}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => toggleAck(n.id)}
                          className={`flex items-center gap-1 rounded border px-2 py-1 text-xs font-bold ${isAcked ? 'border-emerald-800 bg-emerald-950/40 text-emerald-400' : 'border-[#242834] bg-[#141519] text-[#d4d4d8] hover:bg-[#0C0D0F]'}`}
                          title={isAcked ? 'Clear acknowledgement' : 'Acknowledge incident'}
                        >
                          <CheckCircle2 size={12} /> {isAcked ? 'Acked' : 'Ack'}
                        </button>
                        <button
                          className="flex items-center gap-1 rounded border border-[#242834] bg-[#141519] px-2 py-1 text-xs font-bold text-[#d4d4d8] hover:bg-[#0C0D0F]"
                          title={`Ping ${n.id}`}
                          onClick={() => alert(`${n.id}: Ping ACK | 12ms response`)}
                        >
                          <Power size={12} /> Ping
                        </button>
                        <button
                          className="flex items-center gap-1 rounded border border-[#242834] bg-[#242834] px-2 py-1 text-xs font-bold text-white hover:bg-[#334155]"
                          title={`Reclose breaker ${n.id}`}
                          onClick={() => alert(`${n.id}: Breaker reclose sequence initiated`)}
                        >
                          <RotateCcw size={12} /> Reclose
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-xs text-[#a1a1aa]">No grid nodes match filter "{query}" + {filter}.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Live EV fleet (charging bays detail) */}
      <EVFleetTable evs={evs} />
    </div>
  );
};

