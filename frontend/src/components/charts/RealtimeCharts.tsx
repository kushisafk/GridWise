import React from 'react';
import { LineChart, LineSeries } from './LineChart';
import { TimeSeriesPoint } from '../../types/api';
import { Activity, Sun, Battery, Car } from 'lucide-react';

interface RealtimeChartsProps {
  history: TimeSeriesPoint[];
}

export const RealtimeCharts: React.FC<RealtimeChartsProps> = ({ history }) => {
  const demandSeries: LineSeries[] = [
    { key: 'totalDemand', label: 'Total Demand', color: '#6366f1' },
    { key: 'buildingDemand', label: 'Building Baseload', color: '#94a3b8' },
    { key: 'evDemand', label: 'EV Charging Load', color: '#10b981' },
    { key: 'effectiveCapacity', label: 'Effective Cap', color: '#ef4444', strokeDasharray: '4 4' },
  ];

  const solarSeries: LineSeries[] = [
    { key: 'solarGeneration', label: 'Solar Gen (kW)', color: '#f59e0b' },
    { key: 'solarAvailability', label: 'Availability (%)', color: '#38bdf8', strokeDasharray: '3 3' },
  ];

  const evSeries: LineSeries[] = [
    { key: 'evDemand', label: 'EV Fleet Power (kW)', color: '#10b981' },
  ];

  const batterySeries: LineSeries[] = [
    { key: 'batterySoc', label: 'BESS SoC (%)', color: '#0ea5e9' },
    { key: 'batteryPower', label: 'Power (+Dis / -Chg)', color: '#8b5cf6' },
  ];

  return (
    <div className="section-card">
      <div className="section-header">
        <h2 className="section-title">
          <Activity size={18} className="text-primary" />
          Real-Time Operational Telemetry Charts
        </h2>
        <span className="text-xs text-muted">Rolling Memory Window ({history.length} points)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        {/* Chart 1: Demand vs Capacity */}
        <div className="subcard">
          <h3 className="subcard-title mb-1 flex items-center gap-1.5">
            <Activity size={14} className="text-primary" /> Total Facility Demand vs Effective Capacity
          </h3>
          <LineChart data={history} series={demandSeries} xAxisKey="time" yAxisUnit=" kW" height={130} />
        </div>

        {/* Chart 2: Solar Generation */}
        <div className="subcard">
          <h3 className="subcard-title mb-1 flex items-center gap-1.5">
            <Sun size={14} className="text-amber-400" /> Renewable Solar Availability & Generation
          </h3>
          <LineChart data={history} series={solarSeries} xAxisKey="time" yAxisUnit=" %" maxY={100} height={130} />
        </div>

        {/* Chart 3: Total EV Demand */}
        <div className="subcard">
          <h3 className="subcard-title mb-1 flex items-center gap-1.5">
            <Car size={14} className="text-emerald-500" /> Total Active EV Fleet Charging Power
          </h3>
          <LineChart data={history} series={evSeries} xAxisKey="time" yAxisUnit=" kW" height={130} />
        </div>

        {/* Chart 4: Battery */}
        <div className="subcard">
          <h3 className="subcard-title mb-1 flex items-center gap-1.5">
            <Battery size={14} className="text-info" /> Stationary Virtual Battery SoC & Power Dispatch
          </h3>
          <LineChart data={history} series={batterySeries} xAxisKey="time" yAxisUnit=" %" maxY={100} height={130} />
        </div>
      </div>
    </div>
  );
};
