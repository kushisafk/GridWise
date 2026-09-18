import React, { useEffect, useState } from 'react';
import { AdminDashboard } from './pages/AdminDashboard';
import { LiveMQTTMonitorPage } from './pages/LiveMQTTMonitorPage';
import { KioskQRStationPage } from './pages/kiosk/KioskQRStationPage';
import { DriverLiveStatusPage } from './pages/driver/DriverLiveStatusPage';
import { LayoutDashboard, QrCode, Radio, Zap } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mqtt' | 'kiosk'>('dashboard');
  const [isDriverPortal, setIsDriverPortal] = useState<boolean>(false);
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  // Sync state from URL parameters
  const syncStateFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const sessionParam = params.get('session');

    if (sessionParam) {
      setActiveSessionId(sessionParam);
    }

    if (viewParam === 'driver') {
      setIsDriverPortal(true);
    } else if (viewParam === 'kiosk') {
      setIsDriverPortal(false);
      setActiveTab('kiosk');
    } else if (viewParam === 'mqtt') {
      setIsDriverPortal(false);
      setActiveTab('mqtt');
    } else {
      setIsDriverPortal(false);
      setActiveTab('dashboard');
    }
  };

  // Initial load & browser back/forward history navigation
  useEffect(() => {
    syncStateFromUrl();

    const handlePopState = () => {
      syncStateFromUrl();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Switch tab and update the browser URL
  const switchTab = (tab: 'dashboard' | 'mqtt' | 'kiosk') => {
    setActiveTab(tab);
    setIsDriverPortal(false);
    const url = new URL(window.location.href);
    if (tab === 'dashboard') {
      url.searchParams.delete('view');
      url.searchParams.delete('session');
    } else {
      url.searchParams.set('view', tab);
      url.searchParams.delete('session');
    }
    window.history.pushState({}, '', url.toString());
  };

  const handleOpenDriverView = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setIsDriverPortal(true);
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'driver');
    url.searchParams.set('session', sessionId);
    window.history.pushState({}, '', url.toString());
  };

  // 1. ISOLATED MOBILE DRIVER VIEW: No admin navbar, no access to other portals
  if (isDriverPortal) {
    return (
      <div style={{ minHeight: '100vh', background: '#090d16', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0.75rem' }}>
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
          <div className="logo-icon">
            <Zap size={18} className="text-primary" />
          </div>
          <span className="nav-brand-tag">GridWise Control Hub</span>
        </div>

        <div className="nav-tabs">
          <button
            onClick={() => switchTab('dashboard')}
            className={`nav-tab ${activeTab === 'dashboard' ? 'nav-tab-active' : ''}`}
          >
            <LayoutDashboard size={14} />
            <span>Admin Dashboard</span>
          </button>

          <button
            onClick={() => switchTab('mqtt')}
            className={`nav-tab nav-tab-mqtt ${activeTab === 'mqtt' ? 'nav-tab-active' : ''}`}
          >
            <Radio size={14} className={activeTab === 'mqtt' ? 'animate-pulse text-cyan-300' : ''} />
            <span>Live ESP32 MQTT</span>
          </button>

          <button
            onClick={() => switchTab('kiosk')}
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
          <AdminDashboard onNavigateToMQTT={() => switchTab('mqtt')} />
        )}

        {activeTab === 'mqtt' && (
          <LiveMQTTMonitorPage onNavigateToDashboard={() => switchTab('dashboard')} />
        )}

        {activeTab === 'kiosk' && (
          <KioskQRStationPage
            onOpenDriverView={handleOpenDriverView}
            onNavigateToDashboard={() => switchTab('dashboard')}
          />
        )}
      </main>
    </div>
  );
};

export default App;



