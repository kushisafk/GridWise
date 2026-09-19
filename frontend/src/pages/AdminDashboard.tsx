import React, { useState } from 'react';
import { useSystemState } from '../hooks/useSystemState';
import { getBaseUrl } from '../services/api';
import {
  AlertTriangle,
  ArrowDown,
  Battery,
  CheckCircle,
  ChevronUp,
  Flame,
  Play,
  Radio,
  RefreshCw,
  Sun,
  Zap,
} from 'lucide-react';
import { RealtimeCharts } from '../components/charts/RealtimeCharts';

interface AdminDashboardProps {
  onNavigateToMQTT?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateToMQTT }) => {
  const [showChart, setShowChart] = useState<boolean>(false);
  const [pollInterval, setPollInterval] = useState<number>(500);

  const {
    summary,
    status,
    energy,
    evs,
    telemetry,
    history,
    isLoading,
    error,
    isOptimizing,
    isTicking,
    refresh,
    runOptimization,
    triggerTick,
  } = useSystemState(pollInterval);

  // Initial loading state
  if (isLoading && !summary) {
    return (
      <div className="scada-container">
        <div className="scada-card" style={{ textAlign: 'center', alignItems: 'center' }}>
          <div className="loading-spinner" />
          <h2 style={{ fontSize: '0.9rem', fontWeight: 800, marginTop: '1rem' }}>
            CONNECTING TO SMART EV CHARGING SCADA...
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
            Streaming live telemetry from backend /api/v1...
          </p>
        </div>
      </div>
    );
  }

  // Error fallback
  if (error !== null && summary === null) {
    return (
      <div className="scada-container">
        <div className="scada-card">
          <h1 className="scada-main-title" style={{ color: '#f87171' }}>
            SCADA CONNECTION ERROR
          </h1>
          <div className="scada-divider" />
          <p style={{ fontSize: '0.8rem', color: '#fca5a5' }}>
            Unable to establish telemetry stream to <code>{getBaseUrl()}</code>.
          </p>
          <p style={{ fontSize: '0.725rem', color: '#a1a1aa' }}>Error: {error}</p>
          <button onClick={refresh} className="scada-btn scada-btn-primary" style={{ marginTop: '1rem' }}>
            <RefreshCw size={13} /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // 1. Calculations & Live Sensor Data
  const ambientTempC = telemetry?.temperature_c ?? 25.0;
  const isOverload = ambientTempC >= 50.0;
  const solarVoltage = telemetry?.solar_voltage_v ?? energy?.solar_voltage_v ?? 0.0;
  const solarKw = energy?.estimated_solar_generation_kw ?? 0.0;
  const solarAvail = energy?.solar_availability_percent ?? Math.min(100, Math.round((solarVoltage / 3.0) * 100));

  const baseGridLimit = energy?.base_grid_capacity_kw ?? 25.0;
  const effectiveGridLimit = energy?.effective_grid_capacity_kw ?? (isOverload ? 10.0 : baseGridLimit);

  const batterySoc = summary?.battery?.soc_percent ?? 50.0;
  const batteryAction = summary?.battery?.action ?? 'idle';
  const batteryDischarge = energy?.battery_discharge_kw ?? 0.0;
  const batteryCharge = energy?.battery_charge_kw ?? 0.0;

  const buildingDemand = energy?.building_demand_kw ?? 8.0;
  const totalEvDemand = evs.reduce((sum, ev) => sum + (ev.allocated_power_kw || 0), 0);

  // Gross total demand = building + EV (before subtracting renewables)
  const totalLoad = buildingDemand + totalEvDemand;

  // Available cluster capacity combining Grid + Solar generation + Battery contribution
  const totalClusterCapacity = effectiveGridLimit + solarKw + (batteryAction === 'discharge' ? batteryDischarge : 0.0);

  // Net load imposed on utility grid transformer after renewable self-consumption (used in telemetry calculations)
  void (Math.max(0, totalLoad - solarKw - (batteryAction === 'discharge' ? batteryDischarge : 0.0)));

  // Available charging power headroom
  const availableEvPower = energy?.available_ev_charging_power_kw ?? Math.max(0, totalClusterCapacity - totalLoad);

  // Utilization: gross demand vs total cluster capacity (grid + solar + battery)
  const utilizationPct = totalClusterCapacity > 0
    ? Math.min(100, Math.max(0, (totalLoad / totalClusterCapacity) * 100))
    : (effectiveGridLimit > 0 ? Math.min(100, (totalLoad / effectiveGridLimit) * 100) : 0);

  const rainStatus = telemetry?.rain_status ?? (telemetry?.rain_detected ? 'WET' : 'DRY');
  const rainRaw = telemetry?.rain_raw;

  // Render ASCII progress bar: 16 blocks
  const totalBlocks = 16;
  const filledBlocks = Math.max(0, Math.min(totalBlocks, Math.round((utilizationPct / 100) * totalBlocks)));
  const emptyBlocks = totalBlocks - filledBlocks;
  const blockString = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

  const warnings = summary?.warnings || status?.warnings || [];

  return (
    <div className="scada-container">
      <div className="scada-card">
        {/* Main Header */}
        <div>
          <h1 className="scada-main-title">SMART EV CHARGING</h1>
          <div className="scada-divider" />
        </div>

        {/* Live Overload Alert Banner (When temp >= 50°C) */}
        {isOverload && (
          <div
            style={{
              background: '#181114',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              color: '#fca5a5',
            }}
          >
            <Flame size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: '0.775rem' }}>
              <strong style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                <AlertTriangle size={14} style={{ color: '#ef4444' }} />
                OVERLOAD ALERT: Temperature {ambientTempC.toFixed(1)}°C &gt; 50.0°C!
              </strong>
              Grid transformer at severe risk of thermal damage. Capacity derated to 10.0 kW. Emergency curtailment active.
            </div>
          </div>
        )}

        {/* 1. GRID / INFRASTRUCTURE */}
        <section className="scada-section">
          <h2 className="scada-section-title">GRID / INFRASTRUCTURE</h2>
          <div className="scada-box-border">
            <div className="scada-grid-row">
              <div className="scada-grid-cell">
                <div className="scada-cell-header">Grid Limit</div>
                <div className="scada-cell-val">{`${effectiveGridLimit.toFixed(1)} kW`}</div>
              </div>
              <div className="scada-grid-cell">
                <div className="scada-cell-header">Total Load</div>
                <div className="scada-cell-val">{`${totalLoad.toFixed(1)} kW`}</div>
              </div>
              <div className="scada-grid-cell">
                <div className="scada-cell-header">Available</div>
                <div className="scada-cell-val">{`${availableEvPower.toFixed(1)} kW`}</div>
              </div>
              <div className="scada-grid-cell">
                <div className="scada-cell-header">Utilized</div>
                <div
                  className="scada-cell-val"
                  style={{ color: utilizationPct > 90 ? '#f87171' : utilizationPct > 75 ? '#fbbf24' : '#ffffff' }}
                >
                  {`${utilizationPct.toFixed(1)}%`}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. ENERGY MIX */}
        <section className="scada-section">
          <h2 className="scada-section-title">ENERGY MIX</h2>
          <div className="scada-mix-grid">
            {/* Solar Column */}
            <div className="scada-mix-col">
              <div className="scada-mix-header">
                <Sun size={14} style={{ color: '#eab308' }} />
                <span>Solar</span>
              </div>
              <div className="scada-mix-primary">{`${solarKw.toFixed(1)} kW`}</div>
              <div className="scada-mix-secondary">
                {`${solarAvail.toFixed(0)}% availability (${solarVoltage.toFixed(2)}V)`}
              </div>
            </div>

            {/* Battery Column */}
            <div className="scada-mix-col">
              <div className="scada-mix-header">
                <Battery size={14} style={{ color: '#38bdf8' }} />
                <span>Battery</span>
              </div>
              <div className="scada-mix-primary">{`${batterySoc.toFixed(0)}% SoC`}</div>
              <div className="scada-mix-secondary">
                {batteryAction === 'discharge' && batteryDischarge > 0
                  ? `+${batteryDischarge.toFixed(1)} kW contribution`
                  : batteryAction === 'charge' && batteryCharge > 0
                  ? `-${batteryCharge.toFixed(1)} kW charging`
                  : 'Idle (Standby)'}
              </div>
            </div>
          </div>
        </section>

        {/* 3. ACTIVE VEHICLES */}
        <section className="scada-section">
          <h2 className="scada-section-title">ACTIVE VEHICLES</h2>
          <table className="scada-table">
            <thead>
              <tr>
                <th>EV</th>
                <th>SoC</th>
                <th>Target</th>
                <th>Rate</th>
                <th>Departure</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {evs.length > 0 ? (
                evs.map((ev) => {
                  const evNum = ev.id.replace(/[^0-9]/g, '').padStart(3, '0') || ev.id;
                  const depTime = ev.departure_time
                    ? new Date(ev.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                    : '--:--';
                  const isAtRisk = ev.deadline_status === 'at_risk';
                  const statusLabel = isAtRisk ? 'At Risk' : ev.status.charAt(0).toUpperCase() + ev.status.slice(1);

                  return (
                    <tr key={ev.id}>
                      <td style={{ fontWeight: 700 }}>{evNum}</td>
                      <td>{`${ev.soc_percent.toFixed(0)}%`}</td>
                      <td>{`${ev.target_soc_percent.toFixed(0)}%`}</td>
                      <td>{`${ev.allocated_power_kw.toFixed(1)} kW`}</td>
                      <td>{depTime}</td>
                      <td
                        style={{
                          color: isAtRisk ? '#f87171' : ev.allocated_power_kw > 0 ? '#4ade80' : '#a1a1aa',
                          fontWeight: isAtRisk ? 700 : 500,
                        }}
                      >
                        {statusLabel}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: '#a1a1aa', padding: '1rem' }}>
                    No connected EVs currently reporting.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* 4. SYSTEM / TRANSFORMER */}
        <section className="scada-section">
          <h2 className="scada-section-title">SYSTEM / TRANSFORMER</h2>
          <div className="scada-system-box">
            <div className="scada-meter-row">
              <span className="scada-meter-bar" style={{ color: isOverload ? '#f87171' : '#ffffff' }}>
                {blockString}
              </span>
              <span className="scada-meter-pct">{`${utilizationPct.toFixed(1)}%`}</span>
            </div>

            <div className="scada-metric-line">
              <span className="scada-metric-label">Temperature:</span>
              <span
                className="scada-metric-value"
                style={{ color: isOverload ? '#f87171' : ambientTempC > 35 ? '#fbbf24' : '#ffffff' }}
              >
                {`${ambientTempC.toFixed(1)}°C`}
                {isOverload && ' OVERLOAD'}
              </span>
            </div>

            <div className="scada-metric-line">
              <span className="scada-metric-label">Effective capacity:</span>
              <span className="scada-metric-value">{`${effectiveGridLimit.toFixed(1)} kW`}</span>
            </div>

            <div className="scada-metric-line">
              <span className="scada-metric-label">Building demand:</span>
              <span className="scada-metric-value">{`${buildingDemand.toFixed(1)} kW`}</span>
            </div>

            <div className="scada-metric-line">
              <span className="scada-metric-label">EV demand:</span>
              <span className="scada-metric-value">{`${totalEvDemand.toFixed(1)} kW`}</span>
            </div>

            <div className="scada-metric-line">
              <span className="scada-metric-label">Precipitation / Rain:</span>
              <span
                className="scada-metric-value"
                style={{ color: rainStatus === 'WET' || rainStatus === 'RAIN' ? '#f87171' : '#4ade80' }}
              >
                {rainStatus} {rainRaw !== undefined && rainRaw !== null ? `(ADC: ${rainRaw})` : ''}
              </span>
            </div>
          </div>
        </section>

        {/* 5. WARNINGS */}
        <section className="scada-section">
          <h2 className="scada-section-title">WARNINGS</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {warnings.length > 0 ? (
              warnings.map((w: any, idx: number) => (
                <div
                  key={`${w.code || idx}-${idx}`}
                  className={`scada-warning-item ${w.severity === 'critical' ? 'scada-warning-critical' : ''}`}
                >
                  <AlertTriangle size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <span>{w.message || w}</span>
                </div>
              ))
            ) : (
              <div className="scada-warning-item scada-warning-nominal">
                <CheckCircle size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
                <span>Nominal - All systems operating within baseline parameters</span>
              </div>
            )}
          </div>
        </section>

        {/* 6. ENERGY HISTORY (Collapsible Chart) */}
        <section className="scada-section">
          <h2 className="scada-section-title">ENERGY HISTORY</h2>
          <div className="scada-footer-toggle" onClick={() => setShowChart(!showChart)}>
            <span>[ Solar / Building / EV / Grid chart ]</span>
            {showChart ? <ChevronUp size={16} /> : <ArrowDown size={16} />}
          </div>

          {showChart && (
            <div style={{ marginTop: '0.75rem' }}>
              <RealtimeCharts history={history} />
            </div>
          )}
        </section>

        {/* Interactive SCADA Controls Footer */}
        <div className="scada-controls-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.675rem', color: '#a1a1aa' }}>Poll:</span>
            <select
              value={pollInterval}
              onChange={(e) => setPollInterval(Number(e.target.value))}
              style={{
                background: '#27272a',
                color: '#ededed',
                fontSize: '0.7rem',
                border: '1px solid #3f3f46',
                borderRadius: '4px',
                padding: '2px 6px',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <option value={100}>100ms</option>
              <option value={250}>250ms</option>
              <option value={500}>500ms</option>
              <option value={1000}>1s</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {onNavigateToMQTT && (
              <button onClick={onNavigateToMQTT} className="scada-btn">
                <Radio size={12} className="animate-pulse text-cyan-400" />
                <span>MQTT Stream</span>
              </button>
            )}

            <button onClick={() => triggerTick(60)} disabled={isTicking} className="scada-btn">
              <Play size={12} />
              <span>Tick (60s)</span>
            </button>

            <button onClick={() => runOptimization()} disabled={isOptimizing} className="scada-btn scada-btn-primary">
              <Zap size={12} />
              <span>{isOptimizing ? 'Optimizing...' : 'Optimize'}</span>
            </button>

            <button onClick={() => refresh()} className="scada-btn">
              <RefreshCw size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
