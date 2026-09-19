import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { EVDetailResponse, ParkingVisionState, SlotOccupancy } from '../../types/api';
import {
  AlertTriangle,
  Camera,
  Play,
  Pause,
  RefreshCw,
  RotateCcw,
  SkipForward,
  Video,
  Zap,
} from 'lucide-react';

interface ParkingVisionPanelProps {
  evs?: EVDetailResponse[];
  pollIntervalMs?: number;
}

// Normalize slot ID string (e.g. 'SLOT-606', 'BAY-606', '606' -> '606')
const normalizeSlotId = (rawId: string | number | null | undefined): string => {
  if (!rawId) return '';
  let clean = String(rawId).trim().toUpperCase();
  for (const prefix of ['SLOT-', 'SLOT_', 'BAY-', 'BAY_', 'SLOT', 'BAY']) {
    if (clean.startsWith(prefix)) {
      clean = clean.slice(prefix.length).trim();
    }
  }
  if (/^\d+$/.test(clean)) {
    return String(parseInt(clean, 10));
  }
  return clean;
};

export const ParkingVisionPanel: React.FC<ParkingVisionPanelProps> = ({
  evs = [],
  pollIntervalMs = 1500,
}) => {
  const [visionState, setVisionState] = useState<ParkingVisionState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [frameError, setFrameError] = useState<boolean>(false);
  const [imageKey, setImageKey] = useState<number>(Date.now());
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [isReplayRunning, setIsReplayRunning] = useState<boolean>(false);
  const [isControlling, setIsControlling] = useState<boolean>(false);

  // 1. Fetch Parking Vision State from backend
  const fetchVision = useCallback(async (autoAdvance: boolean = false) => {
    try {
      const state = await api.getParkingVisionState(autoAdvance);
      setVisionState(state);
      setError(null);
      setFrameError(false);
      setIsStale(false);
      setImageKey(Date.now());
    } catch (err: any) {
      setError(err?.message || 'Parking vision service unavailable');
      setIsStale(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. Periodic Polling
  useEffect(() => {
    fetchVision();
    const interval = setInterval(() => {
      fetchVision();
    }, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchVision, pollIntervalMs]);

  // 3. Replay Engine Controls
  const handleReplayAction = async (action: 'play' | 'pause' | 'next' | 'reset') => {
    try {
      setIsControlling(true);
      const status = await api.controlParkingReplay(action);
      setIsReplayRunning(status.is_running);
      await fetchVision(false);
    } catch (err: any) {
      console.error('Failed to execute replay action:', err);
    } finally {
      setIsControlling(false);
    }
  };

  // 4. Map active EV assignments to slot detection results
  const assignedEvs = evs.filter((ev) => Boolean(ev.slot_id));

  // Build slot lookup map from vision state
  const slotMap = new Map<string, SlotOccupancy>();
  if (visionState?.slots) {
    for (const slot of visionState.slots) {
      slotMap.set(normalizeSlotId(slot.slot_id), slot);
    }
  }

  const totalSlots = visionState?.summary?.total_slots ?? 37;
  const occupiedSlots = visionState?.summary?.occupied_slots ?? 0;
  const availableSlots = visionState?.summary?.free_slots ?? (totalSlots - occupiedSlots);
  const occupancyPercent = totalSlots > 0 ? (occupiedSlots / totalSlots) * 100 : 0;

  return (
    <section className="scada-section" data-testid="parking-vision-panel">
      {/* Header with Title, Badges, and Debug Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <h2 className="scada-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Camera size={14} style={{ color: '#4ade80' }} />
            PARKING VISION
          </h2>
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#4ade80',
              letterSpacing: '0.05em',
            }}
          >
            Camera 4 • Historical Replay
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Status Pulse Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.675rem', color: '#a1a1aa' }}>
            <span
              style={{
                display: 'inline-block',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: error ? '#f87171' : isStale ? '#fbbf24' : '#4ade80',
                boxShadow: error ? '0 0 6px #f87171' : '0 0 6px #4ade80',
              }}
              className={!error && !isStale ? 'animate-pulse' : ''}
            />
            <span>{error ? 'OFFLINE' : isStale ? 'STALE' : 'LIVE'}</span>
          </div>

          {/* Confidence Debug Toggle */}
          <button
            type="button"
            onClick={() => setDebugMode(!debugMode)}
            className={`scada-btn ${debugMode ? 'scada-btn-primary' : ''}`}
            style={{ padding: '2px 6px', fontSize: '0.65rem', height: '22px' }}
            title="Toggle raw confidence percentage overlay on parking slots"
          >
            Debug %
          </button>
        </div>
      </div>

      {/* Main Grid Layout: Camera Viewport (Left) + Telemetry & Assignments (Right) */}
      <div className="scada-box-border" style={{ padding: '0.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '0.85rem' }}>
          
          {/* LEFT: Camera 4 Visual Viewport */}
          <div
            style={{
              position: 'relative',
              background: '#0a0d14',
              borderRadius: '8px',
              border: '1px solid #27272a',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '260px',
            }}
          >
            {isLoading && !visionState ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#a1a1aa' }}>
                <RefreshCw size={24} className="animate-spin" style={{ color: '#38bdf8', margin: '0 auto 0.5rem' }} />
                <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>PARKING VISION</div>
                <div style={{ fontSize: '0.675rem', color: '#71717a' }}>Waiting for camera stream...</div>
              </div>
            ) : error || frameError || !visionState ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#fca5a5' }}>
                <AlertTriangle size={24} style={{ color: '#f87171', margin: '0 auto 0.5rem' }} />
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171' }}>
                  Parking vision unavailable
                </div>
                <div style={{ fontSize: '0.675rem', color: '#a1a1aa', marginTop: '0.25rem' }}>
                  {error || 'Camera frame stream offline'}
                </div>
                <button
                  onClick={() => fetchVision(false)}
                  className="scada-btn"
                  style={{ marginTop: '0.75rem', fontSize: '0.675rem', padding: '2px 8px' }}
                >
                  <RefreshCw size={11} /> Retry Connection
                </button>
              </div>
            ) : (
              <>
                <img
                  src={`${api.getParkingFrameUrl(visionState.frame_id, false, debugMode)}&_k=${imageKey}`}
                  alt="Camera 4 Parking Lot"
                  onError={() => setFrameError(true)}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    borderRadius: '6px',
                    objectFit: 'contain',
                  }}
                />

                {/* Live Frame Metadata Tag */}
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.625rem',
                    color: '#cbd5e1',
                    fontFamily: 'monospace',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Video size={10} style={{ color: '#38bdf8' }} />
                  <span>FRAME: {visionState.frame_id}</span>
                  <span style={{ color: '#64748b' }}>•</span>
                  <span>{visionState.source_capture_time}</span>
                </div>
              </>
            )}
          </div>

          {/* RIGHT: Status Metrics, Active Assignments, and Replay Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            
            {/* Status Statistics Card */}
            <div
              style={{
                background: '#121622',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '0.65rem 0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#cbd5e1' }}>PARKING STATUS</span>
                <span style={{ fontSize: '0.65rem', color: '#38bdf8' }}>{occupancyPercent.toFixed(0)}% Occupancy</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem', textAlign: 'center' }}>
                <div style={{ background: '#090d16', padding: '4px', borderRadius: '4px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>Total Slots</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ffffff' }}>{totalSlots}</div>
                </div>
                <div style={{ background: '#090d16', padding: '4px', borderRadius: '4px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.6rem', color: '#f87171' }}>Occupied</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f87171' }}>{occupiedSlots}</div>
                </div>
                <div style={{ background: '#090d16', padding: '4px', borderRadius: '4px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '0.6rem', color: '#4ade80' }}>Available</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#4ade80' }}>{availableSlots}</div>
                </div>
              </div>
            </div>

            {/* Active EV Session Assignments Card */}
            <div
              style={{
                background: '#121622',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '0.65rem 0.75rem',
                flex: 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                <Zap size={12} style={{ color: '#fbbf24' }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#cbd5e1' }}>ACTIVE EV ASSIGNMENTS</span>
              </div>

              {assignedEvs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {assignedEvs.map((ev) => {
                    const normSlot = normalizeSlotId(ev.slot_id);
                    const slotVision = slotMap.get(normSlot);
                    const isOccupied = slotVision?.occupied ?? false;
                    const confPercent = slotVision?.confidence ? Math.round(slotVision.confidence * 100) : null;

                    return (
                      <div
                        key={ev.id}
                        style={{
                          background: isOccupied ? 'rgba(74, 222, 128, 0.08)' : 'rgba(251, 191, 36, 0.08)',
                          border: isOccupied ? '1px solid rgba(74, 222, 128, 0.35)' : '1px solid rgba(251, 191, 36, 0.35)',
                          borderRadius: '6px',
                          padding: '0.45rem 0.6rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.725rem',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, color: '#ffffff' }}>
                            {ev.id} <span style={{ color: '#94a3b8', fontWeight: 400 }}>→ Slot {normSlot}</span>
                          </div>
                          <div style={{ fontSize: '0.625rem', color: '#94a3b8', marginTop: '1px' }}>
                            Rate: {ev.allocated_power_kw?.toFixed(1) ?? '0.0'} kW | SoC: {ev.soc_percent?.toFixed(0) ?? 0}%
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontWeight: 700,
                              fontSize: '0.625rem',
                              background: isOccupied ? 'rgba(74, 222, 128, 0.2)' : 'rgba(251, 191, 36, 0.2)',
                              color: isOccupied ? '#4ade80' : '#fbbf24',
                            }}
                          >
                            {isOccupied ? 'OCCUPIED' : 'WAITING'}
                          </span>
                          {confPercent !== null && (
                            <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '1px' }}>
                              {confPercent}% Conf
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '0.675rem', color: '#71717a', textAlign: 'center', padding: '0.65rem 0' }}>
                  No active assigned EV charging sessions.
                </div>
              )}
            </div>

            {/* Replay Controls Footer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#090d16',
                border: '1px solid #1e293b',
                borderRadius: '6px',
                padding: '4px 8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => handleReplayAction(isReplayRunning ? 'pause' : 'play')}
                  disabled={isControlling}
                  className="scada-btn"
                  style={{ height: '22px', fontSize: '0.65rem', padding: '0 6px' }}
                >
                  {isReplayRunning ? <Pause size={10} /> : <Play size={10} />}
                  <span>{isReplayRunning ? 'Pause' : 'Play'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReplayAction('next')}
                  disabled={isControlling}
                  className="scada-btn"
                  style={{ height: '22px', fontSize: '0.65rem', padding: '0 6px' }}
                  title="Advance 1 historical frame"
                >
                  <SkipForward size={10} />
                  <span>Next</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReplayAction('reset')}
                  disabled={isControlling}
                  className="scada-btn"
                  style={{ height: '22px', fontSize: '0.65rem', padding: '0 6px' }}
                  title="Reset replay to frame 0"
                >
                  <RotateCcw size={10} />
                  <span>Reset</span>
                </button>
              </div>

              <span style={{ fontSize: '0.6rem', color: '#64748b' }}>Replay Rate: 1.0s</span>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
