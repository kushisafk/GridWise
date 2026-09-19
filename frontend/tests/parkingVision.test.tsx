import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ParkingVisionPanel } from '../src/components/parking/ParkingVisionPanel';
import { api } from '../src/services/api';
import { EVDetailResponse, ParkingVisionState } from '../src/types/api';

vi.mock('../src/services/api', () => ({
  api: {
    getParkingVisionState: vi.fn(),
    getSlotVisionStatus: vi.fn(),
    controlParkingReplay: vi.fn(),
    getParkingFrameUrl: vi.fn((frameId?: string, _composite?: boolean, _debug?: boolean) => {
      return `/api/v1/parking/frame?t=${frameId || '123'}`;
    }),
  },
  getBaseUrl: () => '/api/v1',
}));

const mockVisionState: ParkingVisionState = {
  timestamp: '2026-09-19T03:00:00Z',
  source_capture_time: '2016-01-12_0949',
  source: 'cnrpark_camera4_replay',
  camera_id: 'camera4',
  frame_id: '2016-01-12_0949',
  slots: [
    { slot_id: '606', occupied: true, confidence: 0.94 },
    { slot_id: '607', occupied: false, confidence: 0.88 },
  ],
  summary: {
    total_slots: 37,
    occupied_slots: 21,
    free_slots: 16,
  },
};

const mockEVs: EVDetailResponse[] = [
  {
    id: 'EV-023',
    slot_id: '606',
    status: 'charging',
    battery_capacity_kwh: 65,
    soc_percent: 62.0,
    target_soc_percent: 85.0,
    max_charging_power_kw: 11.0,
    allocated_power_kw: 7.2,
    arrival_time: '2026-09-19T02:00:00Z',
    departure_time: '2026-09-19T04:30:00Z',
    energy_required_kwh: 15.0,
    remaining_time_minutes: 90,
    required_average_power_kw: 10.0,
    priority_score: 82.5,
    deadline_status: 'feasible',
    reason: 'Active session',
  },
  {
    id: 'EV-005',
    slot_id: '607',
    status: 'waiting',
    battery_capacity_kwh: 50,
    soc_percent: 30.0,
    target_soc_percent: 80.0,
    max_charging_power_kw: 11.0,
    allocated_power_kw: 0.0,
    arrival_time: '2026-09-19T02:30:00Z',
    departure_time: '2026-09-19T05:00:00Z',
    energy_required_kwh: 25.0,
    remaining_time_minutes: 150,
    required_average_power_kw: 10.0,
    priority_score: 65.0,
    deadline_status: 'feasible',
    reason: 'Waiting queue',
  },
];

describe('ParkingVisionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially then displays camera title and badges', async () => {
    vi.mocked(api.getParkingVisionState).mockResolvedValueOnce(mockVisionState);

    render(<ParkingVisionPanel evs={mockEVs} pollIntervalMs={10000} />);

    expect(screen.getAllByText(/PARKING VISION/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Camera 4 • Historical Replay/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('37')).toBeInTheDocument(); // total
      expect(screen.getByText('21')).toBeInTheDocument(); // occupied
      expect(screen.getByText('16')).toBeInTheDocument(); // available
    });
  });

  it('displays dynamic EV assignments with correct occupancy status and confidence', async () => {
    vi.mocked(api.getParkingVisionState).mockResolvedValueOnce(mockVisionState);

    render(<ParkingVisionPanel evs={mockEVs} pollIntervalMs={10000} />);

    await waitFor(() => {
      expect(screen.getByText(/EV-023/i)).toBeInTheDocument();
      expect(screen.getByText(/Slot 606/i)).toBeInTheDocument();
      expect(screen.getByText('OCCUPIED')).toBeInTheDocument();
      expect(screen.getByText(/94% Conf/i)).toBeInTheDocument();

      expect(screen.getByText(/EV-005/i)).toBeInTheDocument();
      expect(screen.getByText(/Slot 607/i)).toBeInTheDocument();
      expect(screen.getByText('WAITING')).toBeInTheDocument();
      expect(screen.getByText(/88% Conf/i)).toBeInTheDocument();
    });
  });

  it('handles empty EV assignments cleanly without crashing', async () => {
    vi.mocked(api.getParkingVisionState).mockResolvedValueOnce(mockVisionState);

    render(<ParkingVisionPanel evs={[]} pollIntervalMs={10000} />);

    await waitFor(() => {
      expect(screen.getByText(/No active assigned EV charging sessions/i)).toBeInTheDocument();
    });
  });

  it('triggers replay controls when action buttons are clicked', async () => {
    vi.mocked(api.getParkingVisionState).mockResolvedValue(mockVisionState);
    vi.mocked(api.controlParkingReplay).mockResolvedValueOnce({
      is_running: true,
      current_frame_index: 2,
      total_frames: 20,
      frame_id: '2016-01-12_0849',
      source_capture_time: '2016-01-12_0849',
      replay_interval_seconds: 1.0,
    });

    render(<ParkingVisionPanel evs={mockEVs} pollIntervalMs={10000} />);

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(api.controlParkingReplay).toHaveBeenCalledWith('next');
    });
  });

  it('renders graceful error state when backend vision service fails', async () => {
    vi.mocked(api.getParkingVisionState).mockRejectedValueOnce(new Error('Network offline'));

    render(<ParkingVisionPanel evs={mockEVs} pollIntervalMs={10000} />);

    await waitFor(() => {
      expect(screen.getByText(/Parking vision unavailable/i)).toBeInTheDocument();
    });
  });
});
