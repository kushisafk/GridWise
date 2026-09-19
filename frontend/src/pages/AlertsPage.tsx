/**
 * Alerts Tab Page: Operational Log & Fault History Console.
 * Filter by Severity (All, Critical, Warning, Info), Substation/Node, and Date Range.
 */
import React, { useState } from 'react';
import { AlertTriangle, OctagonX, CheckCircle2, ShieldAlert, Filter, Search, Eye } from 'lucide-react';
import type { SystemWarning } from '../types/api';

interface AlertsPageProps {
  warnings: SystemWarning[];
}

interface AlertLogEntry {
  id: string;
  timestamp: string;
  node: string;
  substation: string;
  severity: 'critical' | 'warning' | 'info';
  event: string;
  impact: string;
  status: 'Active' | 'Acknowledged' | 'Cleared';
}

const HISTORICAL_ALERTS: AlertLogEntry[] = [
  {
    id: 'ALT-8092',
    timestamp: '2026-09-18 14:28:10',
    node: 'TR-02',
    substation: 'North Substation',
    severity: 'warning',
    event: 'Thermal Derating Warning (Ambient 38.5 C)',
    impact: '-10.0 kW Capacity Reduction',
    status: 'Active',
  },
  {
    id: 'ALT-8089',
    timestamp: '2026-09-18 14:15:22',
    node: 'PV-01',
    substation: 'Solar PV Array',
    severity: 'info',
    event: 'Cloud Cover Overcast Ingress',
    impact: 'Solar generation down to 12.5 kW',
    status: 'Acknowledged',
  },
  {
    id: 'ALT-8085',
    timestamp: '2026-09-18 13:50:00',
    node: 'BAY-02',
    substation: 'EV Hub Alpha',
    severity: 'warning',
    event: 'High Priority Vehicle Arrival (EV-002)',
    impact: 'Re-allocation required for urgent departure',
    status: 'Active',
  },
  {
    id: 'ALT-8071',
    timestamp: '2026-09-18 12:30:15',
    node: 'FDR-04',
    substation: 'North Substation',
    severity: 'critical',
    event: 'Feeder Phase Imbalance Constraint',
    impact: 'Feeder current exceeded 420A limit',
    status: 'Cleared',
  },
  {
    id: 'ALT-8060',
    timestamp: '2026-09-18 11:10:04',
    node: 'BAT-01',
    substation: 'BESS Buffer Substation',
    severity: 'info',
    event: 'BESS Pre-charge Cycle Complete',
    impact: 'Reserve SoC at 75.0%',
    status: 'Cleared',
  },
];

export const AlertsPage: React.FC<AlertsPageProps> = ({ warnings }) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [query, setQuery] = useState('');
  const [ackedIds, setAckedIds] = useState<Set<string>>(new Set());

  // Merge live warnings with historical alerts
  const liveLogEntries: AlertLogEntry[] = warnings.map((w, idx) => ({
    id: `LIVE-${w.code}-${idx}`,
    timestamp: 'Just now (Live)',
    node: w.code.includes('TRANSFORMER') ? 'TR-02' : w.code.includes('SOLAR') ? 'PV-01' : 'SUB-01',
    substation: 'North Substation',
    severity: (w.severity as 'critical' | 'warning' | 'info') || 'warning',
    event: w.message,
    impact: 'Real-time grid constraint active',
    status: ackedIds.has(`LIVE-${w.code}-${idx}`) ? 'Acknowledged' : 'Active',
  }));

  const allEntries = [...liveLogEntries, ...HISTORICAL_ALERTS];

  const filteredEntries = allEntries.filter((e) => {
    if (severityFilter !== 'all' && e.severity !== severityFilter) return false;
    if (!query) return true;
    return `${e.id} ${e.node} ${e.substation} ${e.event} ${e.impact}`.toLowerCase().includes(query.toLowerCase());
  });

  const toggleAck = (id: string) => {
    setAckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const criticalCount = allEntries.filter((e) => e.severity === 'critical' && e.status === 'Active').length;
  const warningCount = allEntries.filter((e) => e.severity === 'warning' && e.status === 'Active').length;

  return (
    <div className="space-y-4">
      {/* Alert KPI Summary Bar */}
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-md border border-[#242834] bg-[#141519] p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#a1a1aa]">Active Faults & Alerts</span>
            <ShieldAlert size={16} className="text-blue-600" />
          </div>
          <p className="mt-1 font-mono text-2xl font-extrabold text-[#ededed]">{allEntries.filter((e) => e.status === 'Active').length}</p>
          <span className="text-xs text-[#a1a1aa]">Requiring Operator Attention</span>
        </div>

        <div className="rounded-md border border-red-800 bg-red-950/30 p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">Critical Faults</span>
            <OctagonX size={16} className="text-red-400" />
          </div>
          <p className="mt-1 font-mono text-2xl font-extrabold text-red-400">{criticalCount}</p>
          <span className="text-xs text-red-400 font-semibold">Immediate Action Required</span>
        </div>

        <div className="rounded-md border border-amber-800 bg-amber-950/30 p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Warnings</span>
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <p className="mt-1 font-mono text-2xl font-extrabold text-amber-400">{warningCount}</p>
          <span className="text-xs text-amber-400 font-semibold">Grid Constraints Active</span>
        </div>

        <div className="rounded-md border border-[#242834] bg-[#141519] p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#a1a1aa]">Acknowledged</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <p className="mt-1 font-mono text-2xl font-extrabold text-[#ededed]">
            {allEntries.filter((e) => e.status === 'Acknowledged').length}
          </p>
          <span className="text-xs text-[#a1a1aa]">Logged & Monitored</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#242834] bg-[#141519] p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-[#94a3b8]" />
          <span className="text-xs font-bold uppercase text-[#d4d4d8]">Severity Filter:</span>
          <div className="flex rounded border border-[#242834] bg-[#0F1012] p-0.5">
            {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`rounded px-2.5 py-1 text-xs font-bold capitalize ${
                  severityFilter === sev
                    ? sev === 'critical'
                      ? 'bg-red-600 text-white'
                      : sev === 'warning'
                      ? 'bg-amber-600 text-white'
                      : 'bg-[#2563eb] text-white'
                    : 'text-[#a1a1aa] hover:text-[#ffffff]'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded border border-[#242834] bg-[#0F1012] px-2.5 py-1 text-xs">
            <Search size={14} className="text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Search alert ID / node / event..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-48 bg-transparent text-xs text-[#ededed] focus:outline-none"
            />
          </div>
          <button
            onClick={() => {
              allEntries.forEach((e) => toggleAck(e.id));
              alert('All active alerts acknowledged.');
            }}
            className="rounded border border-[#242834] bg-[#141519] px-3 py-1 text-xs font-bold text-[#d4d4d8] hover:bg-[#0C0D0F]"
          >
            Ack All Active
          </button>
        </div>
      </div>

      {/* Alert & Fault History Table */}
      <div className="rounded-md border border-[#242834] bg-[#141519] p-4 shadow-xs">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#ededed] mb-3">
          <AlertTriangle size={16} className="text-blue-600" /> Operational Alert & Fault History Log ({filteredEntries.length})
        </h3>

        <div className="overflow-x-auto slim-scroll">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#242834] bg-[#0F1012] text-[11px] font-extrabold uppercase text-[#a1a1aa]">
                <th className="px-3 py-2.5">Timestamp</th>
                <th className="px-3 py-2.5">Alert ID</th>
                <th className="px-3 py-2.5">Asset / Node</th>
                <th className="px-3 py-2.5">Severity</th>
                <th className="px-3 py-2.5">Event Description</th>
                <th className="px-3 py-2.5">Operational Impact</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((e) => {
                const isAcked = e.status === 'Acknowledged' || ackedIds.has(e.id);
                return (
                  <tr
                    key={e.id}
                    className={`border-b border-[#242834] hover:bg-[#0C0D0F] ${
                      e.severity === 'critical' ? 'bg-red-950/30' : e.severity === 'warning' ? 'bg-amber-950/20' : ''
                    }`}
                  >
                    <td className="px-3 py-2.5 font-mono text-[#a1a1aa]">{e.timestamp}</td>
                    <td className="px-3 py-2.5 font-mono font-bold text-[#ededed]">{e.id}</td>
                    <td className="px-3 py-2.5 font-bold text-[#e4e4e7]">
                      {e.node} <span className="font-normal text-[#a1a1aa]">({e.substation})</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          e.severity === 'critical'
                            ? 'border-red-800 bg-red-950/40 text-red-400'
                            : e.severity === 'warning'
                            ? 'border-amber-800 bg-amber-950/40 text-amber-400'
                            : 'border-blue-800 bg-blue-950/40 text-blue-400'
                        }`}
                      >
                        {e.severity === 'critical' ? <OctagonX size={10} /> : <AlertTriangle size={10} />}
                        {e.severity}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-[#ededed]">{e.event}</td>
                    <td className="px-3 py-2.5 text-[#a1a1aa]">{e.impact}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded px-2 py-0.5 font-bold ${
                          isAcked
                            ? 'bg-blue-950/40 text-blue-400 border border-blue-800'
                            : e.status === 'Cleared'
                            ? 'bg-[#0F1012] text-[#a1a1aa]'
                            : 'bg-amber-950/40 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {isAcked ? 'Acknowledged' : e.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => toggleAck(e.id)}
                          className={`rounded border px-2 py-1 font-bold ${
                            isAcked
                              ? 'border-blue-800 bg-blue-950/40 text-blue-400'
                              : 'border-[#242834] bg-[#141519] text-[#d4d4d8] hover:bg-[#0C0D0F]'
                          }`}
                        >
                          <CheckCircle2 size={12} className="inline mr-1" /> {isAcked ? 'Acked' : 'Ack'}
                        </button>
                        <button
                          onClick={() => alert(`Inspecting asset ${e.node} in SCADA topology view.`)}
                          className="rounded border border-[#242834] bg-[#141519] px-2 py-1 font-bold text-[#d4d4d8] hover:bg-[#0C0D0F]"
                        >
                          <Eye size={12} className="inline mr-1" /> Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
