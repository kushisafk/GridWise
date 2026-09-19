/** Real-time polling and telemetry state hook. */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import {
  EnergyDetailResponse,
  EVDetailResponse,
  HardwareStatusSummary,
  HardwareTelemetry,
  OptimizationDecision,
  SystemStatusResponse,
  SystemSummaryResponse,
  TimeSeriesPoint,
} from '../types/api';

const MAX_HISTORY_POINTS = 30;
const STALE_THRESHOLD_MS = 10000;

export interface UseSystemStateResult {
  summary: SystemSummaryResponse | null;
  status: SystemStatusResponse | null;
  energy: EnergyDetailResponse | null;
  evs: EVDetailResponse[];
  optimization: OptimizationDecision | null;
  hardware: HardwareStatusSummary | null;
  telemetry: HardwareTelemetry | null;
  history: TimeSeriesPoint[];
  lastUpdated: Date | null;
  isStale: boolean;
  isLoading: boolean;
  error: string | null;
  isOptimizing: boolean;
  isApplying: boolean;
  isTicking: boolean;
  refresh: () => Promise<void>;
  runOptimization: () => Promise<void>;
  applyOptimization: () => Promise<void>;
  triggerTick: (seconds?: number) => Promise<void>;
}

export const useSystemState = (intervalMs: number = 1000): UseSystemStateResult => {
  const [summary, setSummary] = useState<SystemSummaryResponse | null>(null);
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [energy, setEnergy] = useState<EnergyDetailResponse | null>(null);
  const [evs, setEVs] = useState<EVDetailResponse[]>([]);
  const [optimization, setOptimization] = useState<OptimizationDecision | null>(null);
  const [hardware, setHardware] = useState<HardwareStatusSummary | null>(null);
  const [telemetry, setTelemetry] = useState<HardwareTelemetry | null>(null);
  const [history, setHistory] = useState<TimeSeriesPoint[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isTicking, setIsTicking] = useState<boolean>(false);

  const isFetchingRef = useRef<boolean>(false);

  const fetchAll = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const [sumRes, statRes, nrgRes, evsRes, optRes, hwRes, telRes] = await Promise.allSettled([
        api.getSystemSummary(),
        api.getSystemStatus(),
        api.getEnergyState(),
        api.getEVs(),
        api.getOptimization(),
        api.getHardwareStatus(),
        api.getLatestHardwareTelemetry(),
      ]);

      let hasSuccess = false;

      if (sumRes.status === 'fulfilled') {
        setSummary(sumRes.value);
        hasSuccess = true;
      }
      if (statRes.status === 'fulfilled') {
        setStatus(statRes.value);
        hasSuccess = true;
      }
      if (nrgRes.status === 'fulfilled') {
        setEnergy(nrgRes.value);
        hasSuccess = true;
      }
      if (evsRes.status === 'fulfilled') {
        setEVs(evsRes.value);
        hasSuccess = true;
      }
      if (optRes.status === 'fulfilled' && optRes.value !== null) {
        setOptimization(optRes.value);
      }
      if (hwRes.status === 'fulfilled') {
        setHardware(hwRes.value);
      }
      if (telRes.status === 'fulfilled') {
        setTelemetry(telRes.value);
      }

      if (hasSuccess) {
        const now = new Date();
        setLastUpdated(now);
        setIsStale(false);
        setError(null);

        // Append to rolling history
        if (nrgRes.status === 'fulfilled') {
          const nrg = nrgRes.value;
          const timeLabel = new Date(nrg.timestamp || now).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          const totalDemand = nrg.infrastructure_load_kw ?? ((nrg.building_demand_kw || 0) + (nrg.total_ev_allocated_power_kw || 0));
          const effectiveCapacity = nrg.effective_grid_capacity_kw ?? 25.0;
          const solarGen = nrg.estimated_solar_generation_kw ?? 0.0;
          const solarAvail = nrg.solar_availability_percent ?? 0.0;
          const evFleet = nrg.total_ev_allocated_power_kw ?? 0.0;
          const bSoc = sumRes.status === 'fulfilled' ? (sumRes.value.battery?.soc_percent ?? 50.0) : 50.0;
          const bAction = sumRes.status === 'fulfilled' ? sumRes.value.battery?.action : 'idle';
          const bDischarge = nrg.battery_discharge_kw ?? 0.0;
          const bCharge = nrg.battery_charge_kw ?? 0.0;
          const bPower = bAction === 'discharge' ? bDischarge : bAction === 'charge' ? -bCharge : (bDischarge - bCharge);

          const point: TimeSeriesPoint = {
            timestamp: nrg.timestamp || now.toISOString(),
            timeLabel,
            time: timeLabel,
            totalDemandKw: totalDemand,
            effectiveCapacityKw: effectiveCapacity,
            solarGenerationKw: solarGen,
            evFleetPowerKw: evFleet,
            batterySocPercent: bSoc,

            totalDemand,
            buildingDemand: nrg.building_demand_kw ?? 0.0,
            evDemand: evFleet,
            effectiveCapacity,
            solarGeneration: solarGen,
            solarAvailability: solarAvail,
            batterySoc: bSoc,
            batteryPower: bPower,
          };

          setHistory((prev) => {
            const next = [...prev, point];
            if (next.length > MAX_HISTORY_POINTS) {
              return next.slice(next.length - MAX_HISTORY_POINTS);
            }
            return next;
          });
        }
      } else {
        const firstError = [sumRes, statRes, nrgRes, evsRes].find((r) => r.status === 'rejected') as
          | PromiseRejectedResult
          | undefined;
        setError(firstError?.reason?.message || 'Failed to connect to backend');
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected network error');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Polling loop
  useEffect(() => {
    fetchAll();

    const intervalId = setInterval(() => {
      fetchAll();
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [fetchAll, intervalMs]);

  // Stale check loop
  useEffect(() => {
    const staleInterval = setInterval(() => {
      if (lastUpdated) {
        const elapsed = Date.now() - lastUpdated.getTime();
        setIsStale(elapsed > STALE_THRESHOLD_MS);
      }
    }, 2000);

    return () => clearInterval(staleInterval);
  }, [lastUpdated]);

  const handleRunOptimization = useCallback(async () => {
    setIsOptimizing(true);
    try {
      const decision = await api.runOptimization();
      setOptimization(decision);
      await fetchAll();
    } catch (err: any) {
      setError(err?.message || 'Optimization run failed');
    } finally {
      setIsOptimizing(false);
    }
  }, [fetchAll]);

  const handleApplyOptimization = useCallback(async () => {
    setIsApplying(true);
    try {
      await api.applyOptimization();
      await fetchAll();
    } catch (err: any) {
      setError(err?.message || 'Apply optimization failed');
    } finally {
      setIsApplying(false);
    }
  }, [fetchAll]);

  const handleTriggerTick = useCallback(
    async (seconds: number = 60) => {
      setIsTicking(true);
      try {
        await api.triggerTick(seconds);
        await fetchAll();
      } catch (err: any) {
        setError(err?.message || 'Simulation tick failed');
      } finally {
        setIsTicking(false);
      }
    },
    [fetchAll]
  );

  return {
    summary,
    status,
    energy,
    evs,
    optimization,
    hardware,
    telemetry,
    history,
    lastUpdated,
    isStale,
    isLoading,
    error,
    isOptimizing,
    isApplying,
    isTicking,
    refresh: fetchAll,
    runOptimization: handleRunOptimization,
    applyOptimization: handleApplyOptimization,
    triggerTick: handleTriggerTick,
  };
};
