/**
 * SystemSettings tab: SCADA telemetry configuration, polling, thresholds, API.
 * Thresholds persist to localStorage; hardware actions stay guarded
 * by backend 409 status code.
 */
import React, { useEffect, useState } from 'react';
import { Clock, Cpu, RotateCcw, Save, Server, TriangleAlert } from 'lucide-react';
import { getBaseUrl } from '../services/api';

interface SystemSettingsProps {
  pollMs: number;
  onPollChange: (ms: number) => void;
  dataSource: string;
  onTick: (seconds?: number) => void;
  isTicking: boolean;
  onOptimize: () => void;
  isOptimizing: boolean;
  onApply: () => void;
  isApplying: boolean;
}

const LS_KEY = 'gridwise.thresholds.v1';

interface Thresholds {
  warnUtil: number; // 0 to 100
  critUtil: number;
  stabilityFloor: number;
}

const DEFAULTS: Thresholds = { warnUtil: 80, critUtil: 90, stabilityFloor: 65 };

function loadThresholds(): Thresholds {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<Thresholds>;
    return {
      warnUtil: Math.min(95, Math.max(50, Number(p.warnUtil) || DEFAULTS.warnUtil)),
      critUtil: Math.min(99, Math.max(60, Number(p.critUtil) || DEFAULTS.critUtil)),
      stabilityFloor: Math.min(95, Math.max(20, Number(p.stabilityFloor) || DEFAULTS.stabilityFloor)),
    };
  } catch {
    return DEFAULTS;
  }
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({
  pollMs,
  onPollChange,
  dataSource,
  onTick,
  isTicking,
  onOptimize,
  isOptimizing,
  onApply,
  isApplying,
}) => {
  const [thresholds, setThresholds] = useState<Thresholds>(DEFAULTS);
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setThresholds(loadThresholds());
  }, []);

  const save = () => {
    const clean: Thresholds = {
      ...thresholds,
      critUtil: Math.max(thresholds.critUtil, thresholds.warnUtil + 5),
    };
    setThresholds(clean);
    localStorage.setItem(LS_KEY, JSON.stringify(clean));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1600);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Simulation control */}
      <section aria-label="Simulation control" className="rounded-md border border-[#242834] bg-[#141519] p-4 shadow-xs">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#ededed]">
          <Clock size={16} className="text-blue-600" /> SCADA Simulation & Dispatch Controls
        </h3>
        <p className="mt-1 text-xs text-[#a1a1aa]">
          Active Source: <strong className="font-mono text-[#e4e4e7]">{dataSource.toUpperCase()}</strong> | Time-stepping applies to simulation mode.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => onTick(60)} disabled={isTicking} className="rounded border border-[#242834] bg-[#141519] px-3 py-1.5 text-xs font-bold text-[#d4d4d8] hover:bg-[#0C0D0F] disabled:opacity-50">
            {isTicking ? 'Stepping...' : 'Step +60s'}
          </button>
          <button onClick={() => onTick(900)} disabled={isTicking} className="rounded border border-[#242834] bg-[#141519] px-3 py-1.5 text-xs font-bold text-[#d4d4d8] hover:bg-[#0C0D0F] disabled:opacity-50">
            Step +15min
          </button>
          <button onClick={onOptimize} disabled={isOptimizing} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
            {isOptimizing ? 'Optimizing...' : 'Run Optimization'}
          </button>
          <button onClick={onApply} disabled={isApplying} className="rounded border border-emerald-800 bg-emerald-950/40 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-950/60 disabled:opacity-50">
            {isApplying ? 'Applying...' : 'Apply Allocations'}
          </button>
        </div>
        <div className="mt-4 rounded border border-amber-800 bg-amber-950/40 p-2.5 text-xs text-amber-400">
          <span className="flex items-center gap-1.5 font-bold"><TriangleAlert size={14} className="text-amber-400" /> Hardware Safety Guard</span>
          Direct hardware switching commands are blocked by backend policy (<code className="font-mono font-bold">409 Conflict</code>) in hardware mode.
        </div>
      </section>

      {/* Polling + API */}
      <section aria-label="Telemetry polling and API" className="rounded-md border border-[#242834] bg-[#141519] p-4 shadow-xs">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#ededed]">
          <Server size={16} className="text-blue-600" /> Telemetry Stream & API Endpoints
        </h3>
        <label className="mt-3 block text-xs font-bold text-[#d4d4d8]">
          Polling Frequency: <span className="font-mono text-blue-400">{(pollMs / 1000).toFixed(0)}s</span>
          <input
            type="range"
            min={1000}
            max={15000}
            step={1000}
            value={pollMs}
            onChange={(e) => onPollChange(Number(e.target.value))}
            className="mt-1.5 w-full accent-blue-600"
            aria-label="Polling interval milliseconds"
          />
          <span className="flex justify-between font-mono text-[10px] text-[#a1a1aa]"><span>1s (High Frequency)</span><span>15s (Calm Rate)</span></span>
        </label>
        <dl className="mt-3 space-y-1.5 font-mono text-xs">
          <div className="flex justify-between rounded border border-[#242834] bg-[#0F1012] px-2.5 py-1.5">
            <dt className="text-[#a1a1aa]">Base URL</dt>
            <dd className="font-bold text-[#ededed]">{getBaseUrl()}</dd>
          </div>
          <div className="flex justify-between rounded border border-[#242834] bg-[#0F1012] px-2.5 py-1.5">
            <dt className="text-[#a1a1aa]">API Endpoints</dt>
            <dd className="text-right text-[#e4e4e7]">/system/summary | /energy | /evs | /optimization</dd>
          </div>
        </dl>
      </section>

      {/* Alert thresholds */}
      <section aria-label="Alert thresholds" className="rounded-md border border-[#242834] bg-[#141519] p-4 shadow-xs">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-[#ededed]">
          <Cpu size={16} className="text-amber-400" /> Operational Alert Thresholds
        </h3>
        <p className="mt-1 text-xs text-[#a1a1aa]">Persisted locally: grid stability grades and topology colors evaluate against these thresholds.</p>
        {(
          [
            { key: 'warnUtil', label: 'Warning Utilization Cutoff >=', unit: '%' },
            { key: 'critUtil', label: 'Critical Utilization Cutoff >=', unit: '%' },
            { key: 'stabilityFloor', label: 'Stability Index Floor (Watch Below)', unit: '' },
          ] as const
        ).map((row) => (
          <label key={row.key} className="mt-3 block text-xs font-bold text-[#d4d4d8]">
            {row.label} <span className="font-mono text-amber-400">{thresholds[row.key]}{row.unit}</span>
            <input
              type="range"
              min={row.key === 'stabilityFloor' ? 20 : 50}
              max={row.key === 'stabilityFloor' ? 95 : 99}
              value={thresholds[row.key]}
              onChange={(e) => setThresholds((t) => ({ ...t, [row.key]: Number(e.target.value) }))}
              className="mt-1 w-full accent-amber-600"
              aria-label={row.label}
            />
          </label>
        ))}
        <button onClick={save} className="mt-3 flex items-center gap-1.5 rounded bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700">
          <Save size={13} /> {savedFlash ? 'Thresholds Saved' : 'Save Thresholds'}
        </button>
      </section>

      {/* Danger zone */}
      <section aria-label="Danger zone" className="rounded-md border border-red-800 bg-red-950/30 p-4 shadow-xs">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-red-400">
          <RotateCcw size={16} /> Danger Zone
        </h3>
        <p className="mt-1 text-xs text-[#a1a1aa]">Resetting simulation resets rolling history, clearing all BESS and optimizer decisions on backend.</p>
        {!confirmReset ? (
          <button onClick={() => setConfirmReset(true)} className="mt-3 rounded border border-red-800 bg-[#141519] px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-950/40">
            Reset Simulation...
          </button>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => {
                fetch(`${getBaseUrl()}/simulation/reset`, { method: 'POST' }).catch(() => undefined);
                setConfirmReset(false);
              }}
              className="rounded bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
            >
              Confirm Reset
            </button>
            <button onClick={() => setConfirmReset(false)} className="rounded border border-[#242834] bg-[#141519] px-3 py-1.5 text-xs font-bold text-[#d4d4d8]">
              Cancel
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

