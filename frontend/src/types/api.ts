/** Frontend API Types mirroring Phase 5 Backend Contracts. */

export interface SystemWarning {
  code: string;
  severity: 'info' | 'warning' | 'critical' | string;
  message: string;
}

export interface EnergySummary {
  grid_capacity_kw: number;
  effective_capacity_kw: number;
  building_demand_kw: number;
  solar_generation_kw: number;
  available_ev_power_kw: number;
}

export interface BatterySummary {
  soc_percent: number;
  current_energy_kwh: number;
  capacity_kwh: number;
  action: 'idle' | 'charge' | 'discharge' | string;
}

export interface EVSummary {
  total: number;
  charging: number;
  waiting: number;
  paused: number;
  completed: number;
  disconnected: number;
}

export interface SlotOccupancy {
  slot_id: string;
  occupied: boolean;
  confidence?: number;
}

export interface ParkingVisionState {
  timestamp: string;
  source_capture_time?: string;
  source?: string;
  camera_id?: string;
  frame_id?: string;
  slots: SlotOccupancy[];
  summary: {
    total_slots: number;
    occupied_slots: number;
    free_slots: number;
  };
}

export interface ParkingSummary {
  total_slots: number;
  occupied_slots: number;
  available_slots: number;
}

export interface HardwareSummary {
  status: 'online' | 'stale' | 'no_data' | string;
  devices_online: number;
  devices_stale: number;
}

export interface SystemSummaryResponse {
  timestamp: string;
  system_status: 'operational' | 'warning' | 'degraded' | 'no_data' | string;
  data_source: 'simulation' | 'hardware' | string;
  energy: EnergySummary;
  battery: BatterySummary;
  evs: EVSummary;
  parking: ParkingSummary;
  hardware: HardwareSummary;
  warnings: SystemWarning[];
}

export interface SystemStatusResponse {
  status: 'operational' | 'warning' | 'degraded' | 'no_data' | string;
  data_source: 'simulation' | 'hardware' | string;
  simulation_running: boolean;
  hardware_devices_online: number;
  last_state_update: string | null;
  warnings: SystemWarning[];
}

export interface EnergyDetailResponse {
  timestamp: string;
  base_grid_capacity_kw: number;
  effective_grid_capacity_kw: number;
  building_demand_kw: number;
  solar_voltage_v: number;
  solar_availability_percent: number;
  estimated_solar_generation_kw: number;
  battery_discharge_kw: number;
  battery_charge_kw: number;
  available_ev_charging_power_kw: number;
  total_ev_allocated_power_kw: number;
  infrastructure_load_kw: number;
}

export interface EVDetailResponse {
  id: string;
  slot_id: string | null;
  status: 'waiting' | 'charging' | 'paused' | 'completed' | 'disconnected' | string;
  battery_capacity_kwh: number;
  soc_percent: number;
  target_soc_percent: number;
  max_charging_power_kw: number;
  allocated_power_kw: number;
  arrival_time: string;
  departure_time: string;
  energy_required_kwh: number;
  remaining_time_minutes: number;
  required_average_power_kw: number;
  priority_score: number | null;
  deadline_status: 'feasible' | 'at_risk' | 'expired' | 'complete' | string | null;
  reason: string | null;
}

export interface EVAllocationDecision {
  ev_id: string;
  allocated_power_kw: number;
  status: string;
  priority_score: number;
  deadline_status: string;
  reason: string;
}

export interface BatteryActionDecision {
  mode: 'idle' | 'charge' | 'discharge' | string;
  target_power_kw: number;
  projected_soc_percent: number;
  reason: string;
}

export interface OptimizationDecision {
  timestamp: string;
  available_power_kw: number;
  allocated_power_kw: number;
  unallocated_power_kw: number;
  bess_action: BatteryActionDecision;
  allocations: EVAllocationDecision[];
  warnings: string[];
}

export interface OptimizationApplyResponse {
  applied: boolean;
  timestamp: string;
  evs_updated: number;
  battery_mode: string;
  message: string;
}

export interface HardwareTelemetry {
  device_id: string;
  timestamp: string;
  temperature_c: number;
  humidity_percent: number;
  rain_detected: boolean;
  rain_intensity: number;
  solar_voltage_v: number;
  rain_raw?: number | null;
  rain_status?: string | null;
  solar_status?: string | null;
}

export interface HardwareStatusSummary {
  mode: 'simulation' | 'hardware' | string;
  online: boolean;
  total_devices: number;
  online_devices: number;
  stale_devices: number;
  last_received: string | null;
  devices: any[];
}

export interface TimeSeriesPoint {
  timestamp: string;
  timeLabel: string;
  time?: string;
  totalDemandKw: number;
  effectiveCapacityKw: number;
  solarGenerationKw: number;
  evFleetPowerKw: number;
  batterySocPercent: number;

  totalDemand?: number;
  buildingDemand?: number;
  evDemand?: number;
  effectiveCapacity?: number;
  solarGeneration?: number;
  solarAvailability?: number;
  batterySoc?: number;
  batteryPower?: number;
}

export type QRSessionStatus = 'active' | 'scanned' | 'registered' | 'expired';

export interface QRSession {
  session_id: string;
  bay_id: string;
  created_at: string;
  status: QRSessionStatus;
  ev_id?: string | null;
  expires_at?: string | null;
}

export interface EVRegistrationRequest {
  session_id: string;
  ev_id?: string;
  slot_id?: string;
  battery_capacity_kwh: number;
  soc_percent: number;
  target_soc_percent: number;
  max_charging_power_kw: number;
  departure_in_hours: number;
}

export interface NetworkInfoResponse {
  host_ip: string;
  frontend_port: number;
  backend_port: number;
  driver_base_url: string;
}

