import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../services/api';
import { QRSession } from '../../types/api';
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  RefreshCw,
  Smartphone,
  Wifi,
  Zap,
} from 'lucide-react';

interface KioskQRStationPageProps {
  onOpenDriverView?: (sessionId: string) => void;
  onNavigateToDashboard?: () => void;
}

export const KioskQRStationPage: React.FC<KioskQRStationPageProps> = ({
  onOpenDriverView,
}) => {
  const [session, setSession] = useState<QRSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [scannedAlert, setScannedAlert] = useState<string | null>(null);
  const [selectedBay, setSelectedBay] = useState<string>('BAY-04');
  const [copied, setCopied] = useState<boolean>(false);

  // Network Host State for external/mobile phone cameras
  const [networkHost, setNetworkHost] = useState<string>(() => {
    const saved = localStorage.getItem('gridwise_lan_ip');
    if (saved) return saved;
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return window.location.hostname;
    }
    return '172.16.12.85';
  });

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-detect server network IP from backend
  const detectServerNetworkIp = useCallback(async () => {
    try {
      const netInfo = await api.getNetworkInfo();
      if (netInfo?.host_ip && netInfo.host_ip !== '127.0.0.1') {
        setNetworkHost(netInfo.host_ip);
        localStorage.setItem('gridwise_lan_ip', netInfo.host_ip);
      }
    } catch {
      // Keep existing default
    }
  }, []);

  useEffect(() => {
    detectServerNetworkIp();
  }, [detectServerNetworkIp]);

  // Generate a new unique session
  const generateNewQR = useCallback(async (bayId?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setScannedAlert(null);
      const newSession = await api.createQRSession(bayId || selectedBay);
      setSession(newSession);
    } catch (err: any) {
      setError(err.message || 'Failed to generate station QR code');
    } finally {
      setIsLoading(false);
    }
  }, [selectedBay]);

  useEffect(() => {
    generateNewQR();
  }, [generateNewQR]);

  // Poll current session status to detect when driver scans/registers
  useEffect(() => {
    if (!session || session.status === 'registered' || session.status === 'expired') return;

    pollTimerRef.current = setInterval(async () => {
      try {
        const latest = await api.getQRSession(session.session_id);
        if (latest && latest.status !== session.status) {
          setSession(latest);
          if (latest.status === 'scanned') {
            setScannedAlert(
              `Driver connected via mobile (${latest.session_id})! Driver is entering vehicle details on phone...`
            );
          } else if (latest.status === 'registered') {
            setScannedAlert(
              `Vehicle registered & charging started (${latest.ev_id || 'EV'})! Generating next QR code...`
            );
            setTimeout(() => {
              generateNewQR();
            }, 3000);
          }
        }
      } catch {
        // silent polling catch
      }
    }, 1200);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [session, generateNewQR]);

  // Calculate target mobile URL using LAN IP so external devices can reach it
  const hostToUse = (networkHost && networkHost !== 'localhost' && networkHost !== '127.0.0.1')
    ? networkHost
    : (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
      ? window.location.hostname
      : '172.16.12.85';

  const portToUse = typeof window !== 'undefined' && window.location.port ? window.location.port : '3000';
  const protocol = typeof window !== 'undefined' && window.location.protocol ? window.location.protocol : 'http:';

  const targetMobileUrl = session
    ? `${protocol}//${hostToUse}:${portToUse}/?view=driver&session=${session.session_id}`
    : '';

  const handleCopyUrl = () => {
    if (targetMobileUrl) {
      navigator.clipboard.writeText(targetMobileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="scada-container">
      <div className="scada-card" style={{ maxWidth: '640px', alignItems: 'center', textAlign: 'center' }}>
        {/* Header Branding */}
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
            <Zap size={20} style={{ color: '#38bdf8' }} />
            <h1 className="scada-main-title" style={{ margin: 0 }}>
              GRIDWISE ONBOARDING KIOSK
            </h1>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#a1a1aa', margin: '0 0 0.5rem 0' }}>
            Interactive One-Time QR Code Terminal for EV Drivers
          </p>
          <div className="scada-divider" />
        </div>

        {/* Status Toast when driver scans */}
        {scannedAlert && (
          <div
            style={{
              width: '100%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10b981',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              color: '#34d399',
              fontSize: '0.775rem',
            }}
          >
            <CheckCircle2 size={18} />
            <span>{scannedAlert}</span>
          </div>
        )}

        {/* Charging Bay & Network Host Selector Row */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            background: '#0F1012',
            border: '1px solid #242834',
            borderRadius: '10px',
            padding: '0.65rem 0.85rem',
          }}
        >
          {/* Bay Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.725rem', color: '#d4d4d8' }}>
            <span style={{ color: '#a1a1aa' }}>Bay:</span>
            <select
              value={selectedBay}
              onChange={(e) => {
                setSelectedBay(e.target.value);
                generateNewQR(e.target.value);
              }}
              style={{
                background: '#141519',
                color: '#ffffff',
                border: '1px solid #242834',
                borderRadius: '6px',
                padding: '4px 8px',
                fontFamily: 'inherit',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <option value="BAY-01">Bay 01 (Fast 22kW)</option>
              <option value="BAY-02">Bay 02 (Standard 11kW)</option>
              <option value="BAY-03">Bay 03 (Standard 11kW)</option>
              <option value="BAY-04">Bay 04 (Ultra 22kW)</option>
              <option value="BAY-05">Bay 05 (Standard 7kW)</option>
            </select>
          </div>

          {/* Network Host IP Config for Mobile Devices */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.725rem' }}>
            <Wifi size={14} style={{ color: '#38bdf8' }} />
            <span style={{ color: '#a1a1aa' }}>Network Host IP:</span>
            <input
              type="text"
              value={networkHost}
              onChange={(e) => {
                const val = e.target.value;
                setNetworkHost(val);
                localStorage.setItem('gridwise_lan_ip', val);
              }}
              placeholder="e.g. 172.16.12.85"
              style={{
                background: '#141519',
                color: '#38bdf8',
                border: '1px solid #242834',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.725rem',
                fontFamily: 'monospace',
                fontWeight: 700,
                width: '125px',
              }}
            />
            <button
              onClick={detectServerNetworkIp}
              title="Auto-Detect Server LAN IP"
              className="scada-btn"
              style={{ padding: '3px 6px', fontSize: '0.675rem' }}
            >
              <Globe size={12} />
              <span>Auto</span>
            </button>
          </div>
        </div>

        {/* Main QR Display Box */}
        <div
          style={{
            background: '#ffffff',
            padding: '1.5rem',
            borderRadius: '16px',
            boxShadow: '0 0 35px rgba(56, 189, 248, 0.25)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '260px',
            minWidth: '260px',
          }}
        >
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <div className="loading-spinner" />
              <span style={{ fontSize: '0.75rem', color: '#0f172a', fontWeight: 600 }}>
                Generating Single-Use Token...
              </span>
            </div>
          ) : session ? (
            <>
              <div style={{ position: 'relative' }}>
                <QRCodeSVG
                  value={targetMobileUrl}
                  size={230}
                  level="H"
                  includeMargin={false}
                  style={session.status === 'scanned' ? { opacity: 0.3, filter: 'blur(1.5px)' } : {}}
                />
                {session.status === 'scanned' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(15, 23, 42, 0.75)',
                      borderRadius: '12px',
                      color: '#38bdf8',
                      padding: '0.5rem',
                      textAlign: 'center',
                    }}
                  >
                    <Smartphone size={32} style={{ marginBottom: '0.4rem', color: '#38bdf8' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff' }}>
                      CHECK-IN IN PROGRESS
                    </span>
                    <span style={{ fontSize: '0.675rem', color: '#bae6fd', marginTop: '0.2rem' }}>
                      Driver is entering details on phone
                    </span>
                  </div>
                )}
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: '-12px',
                  background: session.status === 'scanned' ? '#0369a1' : '#0f172a',
                  color: session.status === 'scanned' ? '#ffffff' : '#38bdf8',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  letterSpacing: '0.05em',
                }}
              >
                {session.status === 'scanned' ? 'LOCKED • IN CHECK-IN' : 'ONE-TIME QR • SINGLE USE'}
              </div>
            </>
          ) : (
            <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>
              {error || 'Failed to load QR code'}
            </div>
          )}
        </div>

        {/* Dynamic Mobile URL Bar with Copy Button */}
        {targetMobileUrl && (
          <div
            style={{
              width: '100%',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              fontSize: '0.7rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <Smartphone size={14} style={{ color: '#38bdf8', flexShrink: 0 }} />
              <span style={{ color: '#94a3b8' }}>Scans to:</span>
              <code style={{ color: '#38bdf8', fontWeight: 600 }}>{targetMobileUrl}</code>
            </div>
            <button
              onClick={handleCopyUrl}
              className="scada-btn"
              style={{ padding: '3px 8px', fontSize: '0.675rem', flexShrink: 0 }}
            >
              {copied ? <Check size={12} style={{ color: '#4ade80' }} /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        )}

        {/* Scan Instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem' }}>
            <Smartphone size={16} style={{ color: '#38bdf8' }} />
            <span>Scan to track charging status & register vehicle</span>
          </div>
          <p style={{ fontSize: '0.725rem', color: '#a1a1aa', maxWidth: '440px', lineHeight: 1.4, margin: 0 }}>
            Point your mobile camera at the QR code above. Once scanned, this QR will expire automatically for security and track your vehicle live.
          </p>
        </div>

        {/* Session Metadata info box */}
        {session && (
          <div
            style={{
              width: '100%',
              background: '#0F1012',
              border: '1px solid #242834',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
            }}
          >
            <div>
              <span style={{ color: '#a1a1aa' }}>Token ID: </span>
              <strong style={{ color: '#ffffff' }}>{session.session_id}</strong>
            </div>
            <div>
              <span style={{ color: '#a1a1aa' }}>Status: </span>
              <span
                style={{
                  color: session.status === 'active' ? '#4ade80' : session.status === 'registered' ? '#38bdf8' : '#fbbf24',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {session.status}
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons: Desktop Preview & Refresh */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', width: '100%' }}>
          {session && (
            <button
              onClick={() => {
                if (onOpenDriverView) {
                  onOpenDriverView(session.session_id);
                } else {
                  window.open(targetMobileUrl, '_blank');
                }
              }}
              className="scada-btn scada-btn-primary"
              style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}
            >
              <ExternalLink size={14} />
              <span>Open Mobile Driver View (Simulate Scan)</span>
            </button>
          )}

          <button
            onClick={() => generateNewQR()}
            disabled={isLoading}
            className="scada-btn"
            style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Generate New QR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
