import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  CloudRain,
  Cpu,
  Flame,
  Radio,
  RefreshCw,
  Send,
  Sun,
  Terminal,
  Wifi,
} from 'lucide-react';
import { api } from '../services/api';
import { HardwareStatusSummary, HardwareTelemetry } from '../types/api';

interface LiveMQTTMonitorPageProps {
  onNavigateToDashboard?: () => void;
}

export const LiveMQTTMonitorPage: React.FC<LiveMQTTMonitorPageProps> = ({ onNavigateToDashboard }) => {
  const [telemetry, setTelemetry] = useState<HardwareTelemetry | null>(null);
  const [status, setStatus] = useState<HardwareStatusSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState<number>(0);
  const [lastReceivedTime, setLastReceivedTime] = useState<Date | null>(null);
  const [pollingInterval, setPollingInterval] = useState<number>(250);
  const [isSendingSimulated, setIsSendingSimulated] = useState<boolean>(false);
  const [testLog, setTestLog] = useState<string | null>(null);

  const lastPayloadTimestampRef = useRef<string | null>(null);
  const isFetchingRef = useRef<boolean>(false);

  const fetchTelemetryData = useCallback(async (isManual: boolean = false) => {
    if (isFetchingRef.current && !isManual) return;
    isFetchingRef.current = true;

    try {
      if (isManual) setIsLoading(true);
      setError(null);

      const [statusRes, latestRes] = await Promise.all([
        api.getHardwareStatus().catch(() => null),
        api.getLatestHardwareTelemetry().catch(() => null),
      ]);

      if (statusRes) setStatus(statusRes);
      if (latestRes) {
        setTelemetry(latestRes);
        setLastReceivedTime(new Date());
        if (latestRes.timestamp !== lastPayloadTimestampRef.current) {
          lastPayloadTimestampRef.current = latestRes.timestamp;
          setMessageCount((prev) => prev + 1);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch live telemetry');
    } finally {
      if (isManual) setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchTelemetryData(false);
    const interval = setInterval(() => {
      fetchTelemetryData(false);
    }, pollingInterval);
    return () => clearInterval(interval);
  }, [fetchTelemetryData, pollingInterval]);

  const handleSimulateCustom = async (
    temp: number,
    rainRaw: number,
    rainStatus: string,
    solarV: number,
    solarStatus: string,
    label: string
  ) => {
    try {
      setIsSendingSimulated(true);
      setTestLog(null);
      const samplePayload = {
        device_id: 'ESP32-001',
        timestamp: new Date().toISOString(),
        temperature_c: temp,
        rain_raw: rainRaw,
        rain_status: rainStatus,
        solar_voltage_v: solarV,
        solar_status: solarStatus,
      };
      await api.postHardwareTelemetry(samplePayload);
      setTestLog(`[OK] Dispatched "${label}" payload at ${new Date().toLocaleTimeString()}`);
      await fetchTelemetryData(false);
    } catch (err: any) {
      setTestLog(`[ERROR] ${err.message}`);
    } finally {
      setIsSendingSimulated(false);
    }
  };

  const isHardwareOnline = status?.online ?? (telemetry !== null);
  const deviceId = telemetry?.device_id || 'ESP32-001';
  const isOverload = telemetry !== null && telemetry.temperature_c >= 50.0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Bar */}
      <header className="header-container" style={{ borderRadius: '6px' }}>
        <div className="header-brand">
          <div className="logo-icon">
            <Radio size={20} className="text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="header-title">LIVE ESP32 MQTT MONITOR</h1>
              <span className="badge badge-info">EDGE INGESTION</span>
              <span className="flex items-center gap-1 text-xs text-muted">
                <span className="live-pulse-dot" />
                <span>Live Stream</span>
              </span>
            </div>
            <p className="header-subtitle">
              Public Broker: <strong>broker.hivemq.com:1883</strong> | Topic: <strong>gridwise/telemetry</strong> | Ingestion: Edge Telemetry
            </p>
          </div>
        </div>

        <div className="header-actions">
          {onNavigateToDashboard && (
            <button onClick={onNavigateToDashboard} className="btn btn-secondary btn-sm">
              <Activity size={14} /> Back to Dashboard
            </button>
          )}

          <button onClick={() => fetchTelemetryData(true)} disabled={isLoading} className="btn btn-primary btn-sm">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Manual Refresh
          </button>
        </div>
      </header>

      {/* CRITICAL OVERLOAD ALERT BANNER (Triggers when temp >= 50°C) */}
      {isOverload && (
        <div className="overload-alert-banner">
          <div className="overload-icon-bubble">
            <Flame size={26} />
          </div>
          <div className="flex-1">
            <div className="overload-header">
              <span className="overload-badge flex items-center gap-1">
                <AlertTriangle size={13} />
                OVERLOAD ALERT
              </span>
              <h2 className="overload-title">
                CRITICAL TEMPERATURE EXCEEDED: {telemetry.temperature_c.toFixed(1)}°C
              </h2>
            </div>
            <p className="overload-desc">
              Ambient temperature has crossed the critical <strong>50.0°C safety threshold</strong>.
              Transformer and substation components are under extreme thermal stress.
              Maximum derating is active and emergency load-shedding is recommended.
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end">
            <span className="badge badge-danger">DERATED TO 10 kW</span>
          </div>
        </div>
      )}

      {/* Main Connection Status Hero Card */}
      <div className="mqtt-hero-card">
        <div className="mqtt-device-info">
          <div className={`mqtt-icon-bubble ${isHardwareOnline ? 'online' : 'stale'}`}>
            <Cpu size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="mqtt-hero-title">{`Device: ${deviceId}`}</h2>
              <span className={`badge ${isHardwareOnline ? 'badge-success' : 'badge-warning'}`}>
                {isHardwareOnline ? <CheckCircle size={13} className="mr-1" /> : <AlertCircle size={13} className="mr-1" />}
                {isHardwareOnline ? 'CONNECTED & STREAMING' : 'WAITING FOR PACKETS'}
              </span>
              {isOverload && (
                <span className="badge badge-overload">
                  <AlertTriangle size={12} className="mr-1" /> OVERLOAD ALERT
                </span>
              )}
            </div>
            <div className="mqtt-hero-meta">
              <span><Wifi size={13} style={{ display: 'inline', marginRight: '4px' }} /> HiveMQ Cloud Edge</span>
              <span>|</span>
              <span>Topic: <code>gridwise/telemetry</code></span>
              {lastReceivedTime && (
                <>
                  <span>|</span>
                  <span>Last Seen: {lastReceivedTime.toLocaleTimeString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mqtt-hero-stats">
          <div className="mqtt-stat-item">
            <span className="mqtt-stat-label">Messages Ingested</span>
            <span className="mqtt-stat-value">{messageCount}</span>
          </div>
          <div className="mqtt-stat-item">
            <span className="mqtt-stat-label">Poll Frequency</span>
            <select
              value={pollingInterval}
              onChange={(e) => setPollingInterval(Number(e.target.value))}
              style={{
                background: 'var(--bg-subcard)',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
                borderRadius: '4px',
                padding: '4px 8px',
                border: '1px solid var(--border-color)',
                marginTop: '4px',
                cursor: 'pointer',
              }}
            >
              <option value={100}>100ms (High Speed)</option>
              <option value={250}>250ms (Default)</option>
              <option value={500}>500ms (Balanced)</option>
              <option value={1000}>1000ms (Standard)</option>
            </select>
          </div>
        </div>
      </div>

      {error && !telemetry && (
        <div className="error-banner">
          <AlertCircle size={24} className="text-danger flex-shrink-0" />
          <div>
            <h3 className="font-bold">No Live Hardware Stream Detected</h3>
            <p className="text-sm text-muted">
              Publish MQTT telemetry to <code>gridwise/telemetry</code> on HiveMQ or click a sample payload below.
            </p>
          </div>
        </div>
      )}

      {/* Sensory KPI Cards Grid */}
      <div className="mqtt-sensory-grid">
        {/* Temperature Card with Overload Detection */}
        <div className={`mqtt-sensor-card ${isOverload ? 'overload-card-active' : ''}`}>
          <div>
            <div className="mqtt-card-header">
              <span className="mqtt-card-title">
                <Flame size={18} style={{ color: isOverload ? '#ef4444' : '#f59e0b' }} />
                Ambient Temperature
              </span>
              {isOverload ? (
                <span className="badge badge-overload">
                  <Flame size={12} className="mr-1" /> OVERLOAD ALERT (&gt;50°C)
                </span>
              ) : (
                <span className={`badge ${telemetry && telemetry.temperature_c > 35 ? 'badge-warning' : 'badge-success'}`}>
                  {telemetry && telemetry.temperature_c > 35 ? 'DERATING ACTIVE' : 'OPTIMAL'}
                </span>
              )}
            </div>

            <div className="mqtt-main-readout">
              <span className="mqtt-big-value" style={{ color: isOverload ? '#ef4444' : 'var(--text-primary)' }}>
                {telemetry ? `${telemetry.temperature_c.toFixed(1)}°C` : '--'}
              </span>
            </div>
            <div className="mqtt-sub-readout">
              Baseline transformer limit: 25.0 kW rating | Overload ceiling: 50.0°C
            </div>
          </div>

          <div className="mqtt-sensor-footer">
            {isOverload ? (
              <strong style={{ color: '#ef4444' }}>
                OVERLOAD ALERT: Temperature exceeds 50.0°C! Severe thermal derating to 10.0 kW in effect.
              </strong>
            ) : telemetry && telemetry.temperature_c > 35 ? (
              'Ambient heat derates grid capacity down toward 10 kW.'
            ) : (
              'Temperature is within nominal baseline operating envelope (≤ 35°C).'
            )}
          </div>
        </div>

        {/* Solar Card */}
        <div className="mqtt-sensor-card">
          <div>
            <div className="mqtt-card-header">
              <span className="mqtt-card-title">
                <Sun size={18} style={{ color: '#eab308' }} />
                Solar Panel Voltage & Proxy
              </span>
              <span className={`badge ${telemetry?.solar_status === 'BRIGHT' ? 'badge-success' : telemetry?.solar_status === 'DIM' ? 'badge-warning' : 'badge-neutral'}`}>
                {telemetry?.solar_status ? telemetry.solar_status.toUpperCase() : 'NO DATA'}
              </span>
            </div>

            <div className="mqtt-main-readout">
              <span className="mqtt-big-value">
                {telemetry ? `${telemetry.solar_voltage_v.toFixed(2)} V` : '--'}
              </span>
              <span className="text-sm text-muted" style={{ marginLeft: '8px' }}>
                ({telemetry ? Math.min(100, Math.round((telemetry.solar_voltage_v / 3.0) * 100)) : 0}% Irradiance)
              </span>
            </div>

            <div className="progress-bar-bg" style={{ marginTop: '0.75rem' }}>
              <div
                className="progress-bar-fill progress-warning"
                style={{ width: `${telemetry ? Math.min(100, Math.round((telemetry.solar_voltage_v / 3.0) * 100)) : 0}%` }}
              />
            </div>
          </div>

          <div className="mqtt-sensor-footer">
            Calibrated against nominal 10.0 kW installed solar array proxy.
          </div>
        </div>

        {/* Rain Card */}
        <div className="mqtt-sensor-card">
          <div>
            <div className="mqtt-card-header">
              <span className="mqtt-card-title">
                <CloudRain size={18} style={{ color: '#38bdf8' }} />
                Rain / Precipitation Sensor
              </span>
              <span className={`badge ${telemetry?.rain_status === 'WET' || telemetry?.rain_status === 'RAIN' || telemetry?.rain_detected ? 'badge-danger' : 'badge-success'}`}>
                {telemetry?.rain_status ? telemetry.rain_status.toUpperCase() : (telemetry?.rain_detected ? 'WET' : 'DRY')}
              </span>
            </div>

            <div className="mqtt-main-readout">
              <span className="mqtt-big-value">
                {telemetry?.rain_raw !== undefined && telemetry?.rain_raw !== null ? telemetry.rain_raw : '--'}
              </span>
              <span className="text-xs text-muted" style={{ display: 'block', marginTop: '4px' }}>
                Raw ADC Value (0 = Submerged, 4095 = Bone Dry)
              </span>
            </div>
          </div>

          <div className="mqtt-sensor-footer">
            Precipitation Flag: <strong style={{ color: telemetry?.rain_detected ? '#ef4444' : '#4ade80' }}>
              {telemetry?.rain_detected ? 'PRECIPITATION DETECTED' : 'DRY SENSOR'}
            </strong>
          </div>
        </div>
      </div>

      {/* Lower Section: Terminal Stream & Test Sandbox */}
      <div className="mqtt-bottom-grid">
        {/* Terminal Raw JSON Viewer */}
        <div className="mqtt-terminal-window">
          <div className="mqtt-terminal-bar">
            <div className="terminal-dots">
              <span className="terminal-dot dot-red" />
              <span className="terminal-dot dot-yellow" />
              <span className="terminal-dot dot-green" />
            </div>
            <span className="terminal-title">live-stream.json (gridwise/telemetry)</span>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
              {lastReceivedTime ? lastReceivedTime.toLocaleTimeString() : 'Awaiting data'}
            </span>
          </div>

          <pre className="mqtt-terminal-content">
            {telemetry
              ? JSON.stringify(telemetry, null, 2)
              : '// Waiting for incoming MQTT payload...\n// Run Python/Mosquitto script to publish to gridwise/telemetry\n// or click one of the interactive simulation buttons on the right.'}
          </pre>
        </div>

        {/* Interactive Testing Sandbox */}
        <div className="mqtt-sandbox-card">
          <div>
            <div className="flex items-center gap-2 font-bold text-sm mb-1">
              <Send size={15} className="text-primary" />
              <span>Interactive Telemetry Dispatcher</span>
            </div>
            <p className="text-xs text-muted mb-3">
              Trigger simulated ESP32 MQTT payloads to test live state handling:
            </p>

            <div className="dispatch-btn-group">
              {/* Critical Overload Scenario (>50°C) */}
              <button
                onClick={() => handleSimulateCustom(53.5, 3600, 'DRY', 2.95, 'BRIGHT', 'Critical Overload (53.5°C > 50°C Alert)')}
                disabled={isSendingSimulated}
                className="dispatch-btn"
                style={{ borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}
              >
                <span className="flex items-center gap-1.5">
                  <Flame size={14} style={{ color: '#ef4444' }} />
                  Overload Alert Test (53.5°C, 2.95V, DRY)
                </span>
                <span className="badge badge-danger">Overload &gt;50°C</span>
              </button>

              <button
                onClick={() => handleSimulateCustom(35.0, 3200, 'DRY', 2.50, 'BRIGHT', 'Sunny Peak (35°C / 2.50V / DRY)')}
                disabled={isSendingSimulated}
                className="dispatch-btn"
              >
                <span className="flex items-center gap-1.5">
                  <Sun size={14} style={{ color: '#eab308' }} />
                  Sunny Day (35°C, 2.50V, DRY, BRIGHT)
                </span>
                <span className="badge badge-success">Nominal</span>
              </button>

              <button
                onClick={() => handleSimulateCustom(22.0, 750, 'WET', 0.40, 'DARK', 'Storm / Rain (22°C / 0.40V / WET)')}
                disabled={isSendingSimulated}
                className="dispatch-btn"
              >
                <span className="flex items-center gap-1.5">
                  <CloudRain size={14} style={{ color: '#38bdf8' }} />
                  Storm / Rain (22°C, 0.40V, WET, DARK)
                </span>
                <span className="badge badge-danger">Rain Alert</span>
              </button>

              <button
                onClick={() => handleSimulateCustom(45.0, 3400, 'DRY', 2.80, 'BRIGHT', 'Heatwave Derating (45°C / 2.80V / DRY)')}
                disabled={isSendingSimulated}
                className="dispatch-btn"
              >
                <span className="flex items-center gap-1.5">
                  <Flame size={14} style={{ color: '#f59e0b' }} />
                  Heatwave Derating (45.0°C, 2.80V, DRY)
                </span>
                <span className="badge badge-warning">Derating</span>
              </button>
            </div>

            {testLog && <div className="dispatch-toast mt-3">{testLog}</div>}
          </div>

          <div style={{ paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div className="flex items-center gap-1 text-xs font-bold text-muted mb-1.5">
              <Terminal size={13} />
              <span>Publish from your ESP32 or terminal (Python / Mosquitto):</span>
            </div>
            <div className="cli-snippet-box">
              {`python -c "import json, paho.mqtt.client as mqtt; c = mqtt.Client(); c.connect('broker.hivemq.com', 1883); payload = {'device_id': 'ESP32-001', 'timestamp': '2026-09-18T12:30:00Z', 'temperature_c': 53.5, 'rain_raw': 3200, 'rain_status': 'DRY', 'solar_voltage_v': 2.50, 'solar_status': 'BRIGHT'}; c.publish('gridwise/telemetry', json.dumps(payload))"`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


