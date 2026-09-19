import React from 'react';
import { ArrowRight, Sun, Zap, BatteryCharging, Building, Car } from 'lucide-react';
import { EnergyDetailResponse, EVDetailResponse } from '../../types/api';

interface EnergyFlowProps {
  energy: EnergyDetailResponse | null;
  evs: EVDetailResponse[];
}

export const EnergyFlow: React.FC<EnergyFlowProps> = ({ energy, evs }) => {
  const solarGen = energy?.estimated_solar_generation_kw || 0;
  const buildingDemand = energy?.building_demand_kw || 0;
  const totalEvDemand = evs.reduce((acc, ev) => acc + (ev.allocated_power_kw || 0), 0);
  const batteryDischarge = energy?.battery_discharge_kw || 0;
  const batteryCharge = energy?.battery_charge_kw || 0;

  const netGridDraw = Math.max(0, buildingDemand + totalEvDemand + batteryCharge - solarGen - batteryDischarge);

  return (
    <div className="subcard">
      <h3 className="subcard-title mb-3">Real-Time Facility Energy Flow Balance</h3>

      <div className="energy-flow-grid">
        {/* Source Column */}
        <div className="flow-col">
          <div className="flow-badge flow-source">
            <Sun size={14} className="text-amber-400" />
            <span>Solar PV: <strong>{solarGen.toFixed(1)} kW</strong></span>
          </div>

          <div className="flow-badge flow-source">
            <Zap size={14} className="text-primary" />
            <span>Utility Grid: <strong>{netGridDraw.toFixed(1)} kW</strong></span>
          </div>

          {batteryDischarge > 0 && (
            <div className="flow-badge flow-source text-info">
              <BatteryCharging size={14} />
              <span>BESS Discharge: <strong>+{batteryDischarge.toFixed(1)} kW</strong></span>
            </div>
          )}
        </div>

        {/* Center Arrow */}
        <div className="flow-divider">
          <ArrowRight size={20} className="text-muted" />
        </div>

        {/* Demand Column */}
        <div className="flow-col">
          <div className="flow-badge flow-sink">
            <Building size={14} className="text-muted" />
            <span>Facility Baseload: <strong>{buildingDemand.toFixed(1)} kW</strong></span>
          </div>

          <div className="flow-badge flow-sink bg-emerald-950/40 text-emerald-400 border-emerald-800">
            <Car size={14} />
            <span>Active EV Fleet: <strong>{totalEvDemand.toFixed(1)} kW</strong></span>
          </div>

          {batteryCharge > 0 && (
            <div className="flow-badge flow-sink text-info">
              <BatteryCharging size={14} />
              <span>BESS Charging: <strong>{batteryCharge.toFixed(1)} kW</strong></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
