import React from 'react';
import { Sun, CloudRain } from 'lucide-react';
import { EnergyDetailResponse } from '../../types/api';

interface SolarSubsystemProps {
  energy: EnergyDetailResponse | null;
  rainDetected?: boolean;
  rainIntensity?: number;
}

export const SolarSubsystem: React.FC<SolarSubsystemProps> = ({
  energy,
  rainDetected = false,
  rainIntensity = 0.0,
}) => {
  const availability = energy?.solar_availability_percent || 0;
  const generation = energy?.estimated_solar_generation_kw || 0;
  const voltage = energy?.solar_voltage_v || 0;

  return (
    <div className="subcard">
      <div className="flex justify-between items-center mb-2">
        <h3 className="subcard-title flex items-center gap-1.5">
          <Sun size={16} className="text-amber-400" />
          Solar PV & Renewable Generation
        </h3>
        <span className="text-xs font-semibold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded">
          {generation.toFixed(1)} kW Solar
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="stat-box">
          <span className="stat-label">Availability</span>
          <span className="stat-val text-amber-400 font-bold">{availability.toFixed(0)}%</span>
        </div>

        <div className="stat-box">
          <span className="stat-label">Generation</span>
          <span className="stat-val">{generation.toFixed(1)} kW</span>
        </div>

        <div className="stat-box">
          <span className="stat-label">Sensor Proxy</span>
          <span className="stat-val">{voltage.toFixed(2)} V</span>
        </div>
      </div>

      {/* Precipitation condition */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle text-xs">
        <span className="text-muted flex items-center gap-1">
          <CloudRain size={13} className={rainDetected ? 'text-info' : 'text-muted'} />
          Weather Condition:
        </span>
        <span className={rainDetected ? 'text-info font-medium' : 'text-muted'}>
          {rainDetected ? `Precipitation (${rainIntensity.toFixed(1)} mm/h)` : 'Clear / Overcast'}
        </span>
      </div>
    </div>
  );
};
