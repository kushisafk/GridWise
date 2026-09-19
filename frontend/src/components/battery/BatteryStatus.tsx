import React from 'react';
import { BatteryCharging, Battery, Shield, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { BatterySummary, EnergyDetailResponse } from '../../types/api';

interface BatteryStatusProps {
  battery: BatterySummary | null;
  energy: EnergyDetailResponse | null;
}

export const BatteryStatus: React.FC<BatteryStatusProps> = ({ battery, energy }) => {
  const soc = battery?.soc_percent ?? 50;
  const capacity = battery?.capacity_kwh ?? 50.0;
  const currentEnergy = battery?.current_energy_kwh ?? (capacity * (soc / 100));
  const reserveFloor = 20.0;

  const dischargeKw = energy?.battery_discharge_kw ?? 0;
  const chargeKw = energy?.battery_charge_kw ?? 0;
  const action = battery?.action || (dischargeKw > 0 ? 'discharge' : chargeKw > 0 ? 'charge' : 'idle');

  return (
    <div className="section-card">
      <div className="section-header">
        <h2 className="section-title">
          <BatteryCharging size={18} className="text-primary" />
          Stationary Virtual Battery (BESS)
        </h2>
        <span className="badge badge-neutral text-xs">Simulated Buffer</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
        {/* SoC Card */}
        <div className="kpi-card">
          <div className="kpi-icon bg-info-subtle text-info">
            <Battery size={22} />
          </div>
          <div className="w-full">
            <div className="flex justify-between items-baseline">
              <span className="kpi-label">State of Charge</span>
              <span className="kpi-value text-info">{soc.toFixed(1)}%</span>
            </div>
            <div className="progress-bar-bg mt-1">
              <div
                className="progress-bar-fill progress-info"
                style={{ width: `${Math.min(100, Math.max(0, soc))}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted mt-1">
              <span>{currentEnergy.toFixed(1)} / {capacity.toFixed(0)} kWh</span>
              <span>Reserve: {reserveFloor.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Contribution Power */}
        <div className="kpi-card">
          <div className="kpi-icon bg-primary-subtle text-primary">
            {action === 'discharge' ? <ArrowDown size={20} className="text-emerald-500" /> : action === 'charge' ? <ArrowUp size={20} className="text-amber-400" /> : <Minus size={20} />}
          </div>
          <div>
            <span className="kpi-label">Power Contribution</span>
            <div className="kpi-value">
              {action === 'discharge' ? `+${dischargeKw.toFixed(1)}` : action === 'charge' ? `-${chargeKw.toFixed(1)}` : '0.0'} <span className="kpi-unit">kW</span>
            </div>
            <span className="kpi-subtext">
              {action === 'discharge' ? 'Discharging to buffer EV deficit' : action === 'charge' ? 'Charging from surplus' : 'Standby / Idle'}
            </span>
          </div>
        </div>

        {/* Usable Capacity & Strategy */}
        <div className="kpi-card">
          <div className="kpi-icon bg-success-subtle text-success">
            <Shield size={20} />
          </div>
          <div>
            <span className="kpi-label">Operational Strategy</span>
            <div className="font-semibold text-sm mt-0.5 capitalize">{action} Mode</div>
            <span className="kpi-subtext mt-1 block">
              Dispatches when EV demand exceeds grid capacity to prevent transformer overload.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
