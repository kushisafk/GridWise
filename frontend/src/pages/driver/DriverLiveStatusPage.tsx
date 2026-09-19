import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { EVDetailResponse, QRSession } from '../../types/api';
import {
  BatteryCharging,
  CheckCircle2,
  Clock,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface DriverLiveStatusPageProps {
  sessionId?: string;
}

export const DriverLiveStatusPage: React.FC<DriverLiveStatusPageProps> = ({
  sessionId: propSessionId,
}) => {
  // Extract session token from props or URL search params (?session=QR-XXXX)
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = propSessionId || urlParams.get('session') || 'QR-DEMO';

  const [session, setSession] = useState<QRSession | null>(null);
  const [evDetail, setEvDetail] = useState<EVDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Registration Form State
  const [evName, setEvName] = useState<string>('EV-Driver');
  const [batteryKwh, setBatteryKwh] = useState<number>(65);
  const [currentSoc, setCurrentSoc] = useState<number>(28);
  const [targetSoc, setTargetSoc] = useState<number>(85);
  const [departureHours, setDepartureHours] = useState<number>(2.0);

  // 1. Initial Load: Claim token and check if already registered
  const loadDriverSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Claim session (informs kiosk that driver scanned)
      const sess = await api.claimQRSession(sessionId).catch(() => null);
      if (sess) {
        setSession(sess);
        if (sess.ev_id) {
          const ev = await api.getEVById(sess.ev_id).catch(() => null);
          if (ev) setEvDetail(ev);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load driver session');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadDriverSession();
  }, [loadDriverSession]);

  // 2. Polling for live charging updates once vehicle is registered
  useEffect(() => {
    if (!evDetail) return;

    const interval = setInterval(async () => {
      try {
        const updated = await api.getEVById(evDetail.id).catch(() => null);
        if (updated) {
          setEvDetail(updated);
        }
      } catch {
        // silent polling catch
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [evDetail]);

  // 3. Register vehicle action
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsRegistering(true);
      setError(null);

      const registered = await api.registerDriverEV({
        session_id: sessionId,
        ev_id: evName.trim() ? undefined : undefined,
        slot_id: session?.bay_id || 'BAY-04',
        battery_capacity_kwh: batteryKwh,
        soc_percent: currentSoc,
        target_soc_percent: targetSoc,
        max_charging_power_kw: 11.0,
        departure_in_hours: departureHours,
      });

      setEvDetail(registered);
      if (session) {
        setSession({ ...session, status: 'registered', ev_id: registered.id });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to register EV charging session');
    } finally {
      setIsRegistering(false);
    }
  };

  // Calculations for time required & return by time
  const now = new Date();
  const returnTimeStr = evDetail?.departure_time
    ? new Date(evDetail.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date(now.getTime() + departureHours * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const remainingMinutes = evDetail
    ? Math.max(0, Math.round(evDetail.remaining_time_minutes))
    : Math.round(departureHours * 60);

  const hoursRemaining = Math.floor(remainingMinutes / 60);
  const minsRemaining = remainingMinutes % 60;
  const timeRemainingFormatted =
    hoursRemaining > 0 ? `${hoursRemaining}h ${minsRemaining}m` : `${minsRemaining}m`;

  const chargingKw = evDetail?.allocated_power_kw ?? 7.0;

  return (
    <div className="scada-container" style={{ padding: '1rem 0.75rem' }}>
      <div
        className="scada-card"
        style={{
          maxWidth: '480px',
          padding: '1.75rem 1.5rem',
          borderRadius: '12px',
          background: '#141519',
          border: '1px solid #242834',
        }}
      >
        {/* Mobile Header Branding */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8', marginBottom: '0.25rem' }}>
            <Zap size={18} />
            <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              GridWise Mobile EV Tracker
            </span>
          </div>
          <h1 className="scada-main-title" style={{ fontSize: '1.1rem', margin: '0.25rem 0' }}>
            {evDetail ? `Charging: ${evDetail.id}` : 'EV Driver Check-in'}
          </h1>
          <div style={{ fontSize: '0.725rem', color: '#a1a1aa' }}>
            Slot: <strong style={{ color: '#ffffff' }}>{session?.bay_id || 'Bay 04'}</strong> &nbsp;|&nbsp; Token: <code>{sessionId}</code>
          </div>
          <div className="scada-divider" />
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              color: '#fca5a5',
              fontSize: '0.75rem',
            }}
          >
            {error}
          </div>
        )}

        {isLoading && (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 0.5rem auto' }} />
            Connecting to charging bay session...
          </div>
        )}

        {/* VIEW 1: Check-in & Registration Form (Before Driver registers) */}
        {!isLoading && (!evDetail ? (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div
              style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '10px',
                padding: '0.85rem',
                fontSize: '0.775rem',
                color: '#e0f2fe',
                lineHeight: 1.4,
              }}
            >
              Welcome to GridWise Fast Charging. Confirm your vehicle details and target departure time to initialize managed charging:
            </div>

            {/* Vehicle Identifier & Battery Capacity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>
                  Vehicle Tag / ID:
                </label>
                <input
                  type="text"
                  value={evName}
                  onChange={(e) => setEvName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    background: '#0F1012',
                    border: '1px solid #242834',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: '#a1a1aa', marginBottom: '0.25rem' }}>
                  Battery Size (kWh):
                </label>
                <input
                  type="number"
                  min="20"
                  max="150"
                  value={batteryKwh}
                  onChange={(e) => setBatteryKwh(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    background: '#0F1012',
                    border: '1px solid #242834',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
            </div>

            {/* Current SoC Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                <span style={{ color: '#a1a1aa' }}>Current Battery SoC:</span>
                <strong style={{ color: '#ffffff', fontSize: '0.85rem' }}>{currentSoc}%</strong>
              </div>
              <input
                type="range"
                min="5"
                max="95"
                value={currentSoc}
                onChange={(e) => setCurrentSoc(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer', accentColor: '#38bdf8' }}
              />
            </div>

            {/* Target SoC Selection */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                <span style={{ color: '#a1a1aa' }}>Target Charge Level:</span>
                <strong style={{ color: '#4ade80', fontSize: '0.85rem' }}>{targetSoc}%</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setTargetSoc(85)}
                  className={`scada-btn ${targetSoc === 85 ? 'scada-btn-primary' : ''}`}
                  style={{ justifyContent: 'center' }}
                >
                  85% (Optimal Life)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetSoc(100)}
                  className={`scada-btn ${targetSoc === 100 ? 'scada-btn-primary' : ''}`}
                  style={{ justifyContent: 'center' }}
                >
                  100% (Full Trip)
                </button>
              </div>
            </div>

            {/* Planned Stay / Departure Duration */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                <span style={{ color: '#a1a1aa' }}>How long will you be away?</span>
                <strong style={{ color: '#ffffff', fontSize: '0.85rem' }}>{departureHours} hours</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                {[1.0, 2.0, 3.0].map((hrs) => (
                  <button
                    key={hrs}
                    type="button"
                    onClick={() => setDepartureHours(hrs)}
                    className={`scada-btn ${departureHours === hrs ? 'scada-btn-primary' : ''}`}
                    style={{ justifyContent: 'center' }}
                  >
                    {hrs} hr{hrs > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isRegistering}
              className="scada-btn scada-btn-primary"
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                justifyContent: 'center',
                marginTop: '0.5rem',
                borderRadius: '8px',
              }}
            >
              <Zap size={16} />
              <span>{isRegistering ? 'Registering Vehicle...' : 'Start Charging & Track Live'}</span>
            </button>
          </form>
        ) : (
          /* VIEW 2: Live Driver Tracking Dashboard */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Big Circular/Block Battery Readout */}
            <div
              style={{
                background: '#0F1012',
                border: '1px solid #242834',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'center',
                boxShadow: '0 0 25px rgba(56, 189, 248, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#38bdf8', marginBottom: '0.5rem' }}>
                <BatteryCharging size={24} className="animate-pulse" />
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {evDetail.status.toUpperCase()}
                </span>
              </div>

              <div style={{ fontSize: '3.2rem', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
                {evDetail.soc_percent.toFixed(0)}
                <span style={{ fontSize: '1.5rem', color: '#38bdf8' }}>%</span>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.35rem' }}>
                Target: <strong>{evDetail.target_soc_percent.toFixed(0)}%</strong> (Deficit: {evDetail.energy_required_kwh.toFixed(1)} kWh)
              </div>

              {/* Visual Progress Bar */}
              <div
                style={{
                  height: '10px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  marginTop: '1rem',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, evDetail.soc_percent)}%`,
                    background: 'linear-gradient(90deg, #38bdf8 0%, #34d399 100%)',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>

            {/* Key Driver KPIs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {/* Ready By Time */}
              <div
                style={{
                  background: '#0F1012',
                  border: '1px solid #242834',
                  borderRadius: '10px',
                  padding: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.675rem', color: '#a1a1aa' }}>
                  <Clock size={13} style={{ color: '#fbbf24' }} />
                  <span>RETURN BY:</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginTop: '0.25rem' }}>
                  {returnTimeStr}
                </div>
                <div style={{ fontSize: '0.675rem', color: '#a1a1aa', marginTop: '0.15rem' }}>
                  ({timeRemainingFormatted} remaining)
                </div>
              </div>

              {/* Charging Speed */}
              <div
                style={{
                  background: '#0F1012',
                  border: '1px solid #242834',
                  borderRadius: '10px',
                  padding: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.675rem', color: '#a1a1aa' }}>
                  <Zap size={13} style={{ color: '#38bdf8' }} />
                  <span>CHARGING RATE:</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.25rem' }}>
                  {`${chargingKw.toFixed(1)} kW`}
                </div>
                <div style={{ fontSize: '0.675rem', color: '#a1a1aa', marginTop: '0.15rem' }}>
                  {chargingKw > 0 ? 'Smart Grid Allocated' : 'Optimizing Queue'}
                </div>
              </div>
            </div>

            {/* Status & Return Instructions Banner */}
            {evDetail.soc_percent >= evDetail.target_soc_percent || evDetail.status === 'completed' ? (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                  fontSize: '0.75rem',
                  color: '#d1fae5',
                  lineHeight: 1.4,
                }}
              >
                <CheckCircle2 size={20} style={{ color: '#34d399', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#ffffff' }}>Target Charge Reached! (Ready to Move)</strong>
                  <p style={{ margin: '2px 0 0 0', color: '#a7f3d0' }}>
                    Your vehicle has reached <strong>{evDetail.target_soc_percent.toFixed(0)}%</strong>. Please unplug and move your car from <strong>Bay {session?.bay_id || evDetail.slot_id || '04'}</strong> for the next driver.
                  </p>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                  fontSize: '0.75rem',
                  color: '#e0f2fe',
                  lineHeight: 1.4,
                }}
              >
                <Clock size={20} style={{ color: '#38bdf8', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#ffffff' }}>Charging in Progress</strong>
                  <p style={{ margin: '2px 0 0 0', color: '#bae6fd' }}>
                    Your car is charging at <strong>Bay {session?.bay_id || evDetail.slot_id || '04'}</strong>. Estimated to reach {evDetail.target_soc_percent.toFixed(0)}% by <strong>{returnTimeStr}</strong> ({timeRemainingFormatted} remaining). Please return at <strong>{returnTimeStr}</strong> to unplug.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={loadDriverSession}
                className="scada-btn"
                style={{ flex: 1, justifyContent: 'center', padding: '0.75rem', fontSize: '0.8rem' }}
              >
                <RefreshCw size={14} />
                <span>Refresh Live Telemetry</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
