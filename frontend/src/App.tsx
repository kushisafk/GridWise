import React, { useCallback, useEffect, useState } from 'react';
import { AdminDashboard } from './pages/AdminDashboard';
import { LiveMQTTMonitorPage } from './pages/LiveMQTTMonitorPage';
import { KioskQRStationPage } from './pages/kiosk/KioskQRStationPage';
import { DriverLiveStatusPage } from './pages/driver/DriverLiveStatusPage';
import { LayoutDashboard, QrCode, Radio, Zap } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTabState] = useState<'dashboard' | 'mqtt' | 'kiosk'>('dashboard');
  const [isDriverPortal, setIsDriverPortalState] = useState<boolean>(false);
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  // Helper to sync app state based on window.location query params
  const syncStateFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view')?.toLowerCase();
    const sessionParam = params.get('session');

    if (sessionParam) {
      setActiveSessionId(sessionParam);
    }

    if (viewParam === 'driver') {
      setIsDriverPortalState(true);
    } else if (viewParam === 'kiosk' || viewParam === 'qr') {
      setIsDriverPortalState(false);
      setActiveTabState('kiosk');
    } else if (viewParam === 'mqtt' || viewParam === 'esp32') {
      setIsDriverPortalState(false);
      setActiveTabState('mqtt');
    } else if (viewParam === 'admin' || viewParam === 'dashboard') {
      setIsDriverPortalState(false);
      setActiveTabState('dashboard');
    } else {
      setIsDriverPortalState(false);
      setActiveTabState('dashboard');
    }
  }, []);

  // Update browser URL query string dynamically without full page reload
  const updateUrl = (view: string, session?: string) => {
    const searchParams = new URLSearchParams();
    searchParams.set('view', view);
    if (session) {
      searchParams.set('session', session);
    }
    const newPath = window.location.pathname + '?' + searchParams.toString();
    if (window.location.search !== '?' + searchParams.toString()) {
      window.history.pushState({ view, session }, '', newPath);
    }
  };

  const navigateToTab = (tab: 'dashboard' | 'mqtt' | 'kiosk') => {
    const viewName = tab === 'dashboard' ? 'admin' : tab === 'kiosk' ? 'kiosk' : 'mqtt';
    setActiveTabState(tab);
    setIsDriverPortalState(false);
    updateUrl(viewName);
  };

  const handleOpenDriverView = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setIsDriverPortalState(true);
    updateUrl('driver', sessionId);
  };

  // Initial load sync & listen for browser history navigation
  useEffect(() => {
    syncStateFromUrl();

    const handlePopState = () => {
      syncStateFromUrl();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [syncStateFromUrl]);

  // 1. ISOLATED MOBILE DRIVER VIEW: No admin navbar, no access to other portals
  if (isDriverPortal) {
    return (
      <div style={{ minHeight: '100vh', background: '#0C0D0F', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem 0.75rem' }}>
        <DriverLiveStatusPage sessionId={activeSessionId} />
      </div>
    );
  }

  // 2. ADMIN & KIOSK PORTAL VIEW
  return (
    <div className="dashboard-container">
      {/* Top Global Navigation Bar for Admins & Operators */}
      <nav className="top-navbar">
        <div className="flex items-center gap-2">
          <div style={{ background: 'rgba(37, 99, 235, 0.14)', border: '1px solid rgba(37, 99, 235, 0.35)', borderRadius: '4px', padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
            <Zap size={16} />
          </div>
          <span className="nav-brand-tag">GridWise Control Hub</span>
        </div>

        <div className="nav-tabs">
          <button
            onClick={() => navigateToTab('dashboard')}
            className={`nav-tab ${activeTab === 'dashboard' ? 'nav-tab-active' : ''}`}
          >
            <LayoutDashboard size={14} />
            <span>Admin Dashboard</span>
          </button>

          <button
            onClick={() => navigateToTab('mqtt')}
            className={`nav-tab nav-tab-mqtt ${activeTab === 'mqtt' ? 'nav-tab-active' : ''}`}
          >
            <Radio size={14} className={activeTab === 'mqtt' ? 'animate-pulse text-cyan-300' : ''} />
            <span>Live ESP32 MQTT</span>
          </button>

          <button
            onClick={() => navigateToTab('kiosk')}
            className={`nav-tab ${activeTab === 'kiosk' ? 'nav-tab-active' : ''}`}
          >
            <QrCode size={14} style={{ color: activeTab === 'kiosk' ? '#ffffff' : '#38bdf8' }} />
            <span>Driver QR Station</span>
          </button>
        </div>
      </nav>

      {/* Main Tab Content */}
      <main className="dashboard-main">
        {activeTab === 'dashboard' && (
          <AdminDashboard onNavigateToMQTT={() => navigateToTab('mqtt')} />
        )}

        {activeTab === 'mqtt' && (
          <LiveMQTTMonitorPage onNavigateToDashboard={() => navigateToTab('dashboard')} />
        )}

        {activeTab === 'kiosk' && (
          <KioskQRStationPage
            onOpenDriverView={handleOpenDriverView}
            onNavigateToDashboard={() => navigateToTab('dashboard')}
          />
        )}
      </main>
    </div>
  );
};

export default App;



