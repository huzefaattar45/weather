export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:8000' 
    : 'http://127.0.0.1:8000');

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

import { AuthService } from './auth';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Attach Firebase ID token dynamically
    const idToken = await AuthService.getIdToken();
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    
    // Merge provided headers
    const finalHeaders = {
      ...headers,
      ...(options?.headers as Record<string, string> || {})
    };
    
    const response = await fetch(url, {
      ...options,
      headers: finalHeaders,
    });

    if (!response.ok) {
      let errorMessage = 'An error occurred';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {
        // Not JSON
      }
      throw new APIError(response.status, errorMessage);
    }

    // Attempt to parse JSON; some endpoints might return empty body or 204
    const text = await response.text();
    return text ? JSON.parse(text) : (null as any);
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    // Network errors
    throw new Error(error instanceof Error ? error.message : 'Network failure');
  }
}

// ============================================================================
// Types
// ============================================================================

export interface ComplaintCreatePayload {
  guest_id: number;
  room_number: number;
  text: string;
  language: string;
  photo?: File;
}

export interface ClassificationInfo {
  issue_type: string;
  department: string;
  priority: string;
  location: string | null;
  required_skill: string;
  confidence: number;
  source: string;
  reasoning: string;
}

export interface AssignmentInfo {
  assignment_id: number | null;
  staff_id: number | null;
  staff_name: string | null;
  score: number | null;
  score_breakdown: any | null;
  reasoning: string | null;
}

export interface ComplaintResponse {
  id: number;
  guest_id: number;
  room_number: number;
  text: string;
  language: string;
  status: string;
  photo_path?: string | null;
  created_at: string;
  // Enriched fields for POST
  task_id?: number | null;
  task_status?: string | null;
  classification?: ClassificationInfo | null;
  assignment?: AssignmentInfo | null;
}

export interface CompletionProofResponse {
  id: number;
  photo_path: string;
  verified: boolean;
  verified_at: string | null;
}

export interface TaskStatusHistoryResponse {
  id: number;
  old_status: string;
  new_status: string;
  timestamp: string;
}

export interface TaskResponse {
  id: number;
  complaint_id: number;
  issue_type: string | null;
  department: string | null;
  priority: string | null;
  location: string | null;
  required_skill_id: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  assignments?: AssignmentInfo[];
  completion_proofs?: CompletionProofResponse[];
  status_history?: TaskStatusHistoryResponse[];
  sla_status?: string | null;
  minutes_remaining?: number | null;
  minutes_overdue?: number | null;
  minutes_inactive?: number | null;
  reason?: string | null;
  staff_name?: string | null;
  complaint_photo_path?: string | null;
}

export interface GuestRequestResponse {
  id: number;
  request_category: string;
  text: string;
  status: string;
  photo_path?: string;
  created_at: string;
}

export interface NotificationResponse {
  id: number;
  message: string;
  related_request_id?: number;
  read: boolean;
  created_at: string;
}

// ── Day 3: Staff, Stats, Rooms ───────────────────────────────────────────────

export interface StaffMemberResponse {
  id: number;
  name: string;
  department: string;
  available: boolean;
  shift_start: string | null;
  shift_end: string | null;
  active_task_count: number;
  skills: string[];
}

export interface ResortStatsResponse {
  tasks: {
    total: number;
    created: number;
    assigned: number;
    in_progress: number;
    completed: number;
    verified: number;
    closed: number;
    active: number;
  };
  complaints: {
    total: number;
    open: number;
    high_priority: number;
  };
  assignments: {
    assigned: number;
    unassigned: number;
  };
}

export interface RoomResponse {
  id: number;
  room_number: number;
  room_type: string;
  floor: number | null;
  status: string; // occupied | available | cleaning | maintenance
  base_price_per_night: number;
  max_adults: number;
  max_children: number;
  has_extra_bed_option: boolean;
  extra_bed_price: number;
  booking_status?: string;
  booking_check_in?: string;
  booking_check_out?: string;
  cleaning_started_at?: string;
  cleaning_duration_minutes?: number;
  cleaning_minutes_remaining?: number;
}

export interface RoomCategoryResponse {
  category: string;
  typical_price: number;
  max_adults: number;
  max_children: number;
  has_extra_bed: boolean;
}

export interface BookingResponse {
  id: number;
  room_id: number;
  guest_id: number;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  extra_beds_requested: number;
  status: string;
  total_price: number;
  created_at: string;
  cancellation_risk?: {
    probability: number;
    risk_level: string;
    model: string;
    is_backfilled?: boolean;
  };
}

export interface BookingWithRoomResponse extends BookingResponse {
  room: RoomResponse;
}

export interface RecommendationResponse {
  action: string;
  reason: string;
  priority: string;
  evidence: string[];
  source: string;
}

export interface CompetitorResponse {
  name: string;
  rate: number;
}

export interface PricingAnalysisResponse {
  property_name: string;
  room_type: string;
  your_rate: number;
  competitors: CompetitorResponse[];
  market_average: number;
  market_min: number;
  market_max: number;
  recommendation: string;
  recommended_rate_min: number;
  recommended_rate_max: number;
  reason: string;
  evidence: string[];
  source: string;
  data_status: string;
}

export interface MatchedRoom {
  room_number: number;
  room_type: string;
  base_rate: number;
  status: string;
  floor: number | null;
  match_score: number;
  match_reason: string;
  explanation: string;
}

export interface ParsedRequirements {
  room_type: string | null;
  max_price: number | null;
  min_price: number | null;
  unsupported_requirements: string[];
}

export interface RoomMatchResponse {
  query: string;
  parsed_requirements: ParsedRequirements;
  matches: MatchedRoom[];
  source: string;
  data_status: string;
  warning: string | null;
}

export interface AuditLogResponse {
  id: number;
  action: string;
  user_id: number | null;
  resource_type: string;
  resource_id: number;
  details_json: any | null;
  created_at: string;
}

export interface EventSignal {
  name: string;
  category: string;
  importance: string;
}

export interface DailyDemandForecast {
  date: string;
  predicted_demand: number;
  event: EventSignal | null;
  planning_signal: string | null;
}

export interface DemandForecastResponse {
  model_name: string;
  model_version: string;
  horizon_days: number;
  forecast: DailyDemandForecast[];
  source: string;
  disclaimer: string;
  metrics: any;
  explanation: string[];
}

// ============================================================================
// API Methods
// ============================================================================

export const api = {
  getHealth: () => fetchAPI('/health'),
  
  createComplaint: async (payload: ComplaintCreatePayload): Promise<ComplaintResponse> => {
    const formData = new FormData();
    formData.append('guest_id', payload.guest_id.toString());
    formData.append('room_number', payload.room_number.toString());
    formData.append('text', payload.text);
    formData.append('language', payload.language);
    formData.append('request_category', 'complaint');
    if (payload.photo) {
      formData.append('photo', payload.photo);
    }
    
    const response = await fetch(`${API_BASE_URL}/api/complaints`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      let errorMessage = 'Submission failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {}
      throw new APIError(response.status, errorMessage);
    }
    return response.json();
  },
    
  getComplaints: (): Promise<ComplaintResponse[]> => 
    fetchAPI<ComplaintResponse[]>('/api/complaints'),
    
  getComplaint: (id: number): Promise<ComplaintResponse> => 
    fetchAPI<ComplaintResponse>(`/api/complaints/${id}`),
    
  getTasks: (): Promise<TaskResponse[]> => 
    fetchAPI<TaskResponse[]>('/api/tasks'),
    
  getAttentionTasks: (): Promise<TaskResponse[]> => 
    fetchAPI<TaskResponse[]>('/api/tasks/attention'),

  getReassignmentCandidates: (taskId: number): Promise<any> =>
    fetchAPI<any>(`/api/tasks/${taskId}/reassignment-candidates`),

  reassignTask: (taskId: number, newStaffId: number, reason?: string): Promise<TaskResponse> =>
    fetchAPI<TaskResponse>(`/api/tasks/${taskId}/reassign`, {
      method: 'POST',
      body: JSON.stringify({ new_staff_id: newStaffId, reason: reason ?? 'Manager-initiated reassignment' }),
    }),
    
  getTask: (id: number): Promise<TaskResponse> => 
    fetchAPI<TaskResponse>(`/api/tasks/${id}`),
    
  updateTaskStatus: (id: number, status: string): Promise<TaskResponse> => 
    fetchAPI<TaskResponse>(`/api/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
    
  uploadCompletionProof: async (id: number, file: File): Promise<TaskResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    // We cannot use fetchAPI directly because we shouldn't set Content-Type: application/json
    const url = `${API_BASE_URL}/api/tasks/${id}/completion-proof`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      let errorMessage = 'Upload failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch (e) {}
      throw new APIError(response.status, errorMessage);
    }
    
    return response.json();
  },

  // ── Day 3: Resort 360 endpoints ──────────────────────────────────────────
  getStaff: (): Promise<StaffMemberResponse[]> =>
    fetchAPI<StaffMemberResponse[]>('/api/staff'),

  updateStaffAvailability: (staffId: number, available: boolean): Promise<StaffMemberResponse> =>
    fetchAPI<StaffMemberResponse>(`/api/staff/${staffId}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ available }),
    }),

  getStats: (): Promise<ResortStatsResponse> =>
    fetchAPI<ResortStatsResponse>('/api/stats'),

  getRooms: (viewDate?: string): Promise<RoomResponse[]> =>
    fetchAPI<RoomResponse[]>(viewDate ? `/api/rooms?view_date=${viewDate}` : '/api/rooms'),

  // ── Bookings ─────────────────────────────────────────────────────────────
  getRoomCategories: (): Promise<RoomCategoryResponse[]> =>
    fetchAPI<RoomCategoryResponse[]>('/api/rooms/categories'),
    
  getAvailableRooms: (checkIn: string, checkOut: string, category?: string, adults?: number): Promise<RoomResponse[]> => {
    let url = `/api/rooms/available?check_in=${checkIn}&check_out=${checkOut}`;
    if (category) url += `&category=${category}`;
    if (adults) url += `&adults=${adults}`;
    return fetchAPI<RoomResponse[]>(url);
  },
  
  getAllBookings: (): Promise<BookingWithRoomResponse[]> =>
    fetchAPI<BookingWithRoomResponse[]>('/api/bookings'),
    
  createBooking: (payload: any): Promise<BookingResponse> =>
    fetchAPI<BookingResponse>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
    
  cancelBooking: (bookingId: number): Promise<BookingResponse> =>
    fetchAPI<BookingResponse>(`/api/bookings/${bookingId}/cancel`, {
      method: 'POST'
    }),

  getNextAction: (): Promise<RecommendationResponse> =>
    fetchAPI<RecommendationResponse>('/api/intelligence/next-action'),
    
  getSystemicIssues: (): Promise<SystemicIssueResponse> =>
    fetchAPI<SystemicIssueResponse>('/api/intelligence/systemic-issues'),
    
  getPricingAnalysis: (roomType: string = "AC Deluxe"): Promise<PricingAnalysisResponse> =>
    fetchAPI<PricingAnalysisResponse>(`/api/pricing/competitive-analysis?room_type=${encodeURIComponent(roomType)}`),

  getRoomRecommendation: (query: string): Promise<RoomMatchResponse> =>
    fetchAPI<RoomMatchResponse>('/api/recommendations/room-match', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  getAuditLogs: (limit: number = 50): Promise<AuditLogResponse[]> =>
    fetchAPI<AuditLogResponse[]>(`/api/audit?limit=${limit}`),

  downloadOperationsReport: async (): Promise<void> => {
    const url = `${API_BASE_URL}/api/reports/operations`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to download report');
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'smart-resort-operations-report.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },

  analyzeCancellationRisk: async (payload: any): Promise<any> => {
    return fetchAPI<any>('/api/ml/cancellation-risk', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getDemandForecast: (): Promise<DemandForecastResponse> =>
    fetchAPI<DemandForecastResponse>('/api/ml/demand-forecast'),
    
  // ── Guest Portal ─────────────────────────────────────────────────────────────
  
  getGuestRequests: (guestId: number): Promise<GuestRequestResponse[]> =>
    fetchAPI(`/api/guest/${guestId}/requests`),
    
  createGuestRequest: async (guestId: number, category: string, text: string, roomNumber: number, photo?: File): Promise<ComplaintResponse> => {
    const formData = new FormData();
    formData.append('guest_id', guestId.toString());
    formData.append('room_number', roomNumber.toString());
    formData.append('text', text);
    formData.append('request_category', category);
    formData.append('language', 'en'); // default
    if (photo) formData.append('photo', photo);
    
    const response = await fetch(`${API_BASE_URL}/api/guest/${guestId}/requests`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
        throw new Error("Failed to create request");
    }
    return response.json();
  },
  
  getGuestNotifications: (guestId: number): Promise<NotificationResponse[]> =>
    fetchAPI(`/api/guest/${guestId}/notifications`),
    
  markNotificationRead: (guestId: number, notificationId: number) =>
    fetchAPI(`/api/guest/${guestId}/notifications/${notificationId}/read`, { method: 'POST' }),

  getCurrentWeather: (): Promise<CurrentWeatherResponse> =>
    fetchAPI('/api/weather/current'),

  getWeatherForecast: (): Promise<WeatherForecastResponse> =>
    fetchAPI('/api/weather/forecast'),

  getWeatherSeverity: (params?: { rainfall?: number; temperature?: number; wind?: number; condition?: string }): Promise<WeatherSeverityResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.rainfall !== undefined) searchParams.append('rainfall', params.rainfall.toString());
    if (params?.temperature !== undefined) searchParams.append('temperature', params.temperature.toString());
    if (params?.wind !== undefined) searchParams.append('wind', params.wind.toString());
    if (params?.condition !== undefined) searchParams.append('condition', params.condition);
    const query = searchParams.toString();
    return fetchAPI(`/api/weather/severity${query ? `?${query}` : ''}`);
  },

  simulateDigitalTwin: (payload: DigitalTwinSimulationRequest): Promise<DigitalTwinSimulationResponse> => {
    const rawRain = typeof payload.rainfall === 'number' ? payload.rainfall : parseFloat(payload.rainfall as any);
    const rawTemp = typeof payload.temperature === 'number' ? payload.temperature : parseFloat(payload.temperature as any);
    const rawDur = typeof payload.duration_hours === 'number' ? payload.duration_hours : parseFloat(payload.duration_hours as any);
    const rawWind = typeof payload.wind === 'number' ? payload.wind : parseFloat(payload.wind as any);
    const rawHum = typeof payload.humidity === 'number' ? payload.humidity : parseFloat(payload.humidity as any);

    const sanitized = {
      rainfall: !isNaN(rawRain) ? Math.max(0, rawRain) : 0.0,
      temperature: !isNaN(rawTemp) ? rawTemp : 25.0,
      duration_hours: !isNaN(rawDur) ? Math.max(0.1, rawDur) : 3.0,
      duration: !isNaN(rawDur) ? Math.max(0.1, rawDur) : 3.0,
      wind: !isNaN(rawWind) ? Math.max(0, rawWind) : 12.0,
      wind_speed: !isNaN(rawWind) ? Math.max(0, rawWind) : 12.0,
      humidity: !isNaN(rawHum) ? Math.min(100, Math.max(0, rawHum)) : 68.0,
      ...(payload.current_occupancy !== undefined ? { current_occupancy: payload.current_occupancy } : {}),
      ...(payload.day_of_week !== undefined ? { day_of_week: payload.day_of_week } : {}),
    };
    return fetchAPI('/api/digital-twin/simulate', {
      method: 'POST',
      body: JSON.stringify(sanitized),
    });
  },

  getPublicSignals: (params?: { rainfall?: number; temperature?: number }): Promise<PublicSignalsResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.rainfall !== undefined) searchParams.append('rainfall', params.rainfall.toString());
    if (params?.temperature !== undefined) searchParams.append('temperature', params.temperature.toString());
    const query = searchParams.toString();
    return fetchAPI(`/api/digital-twin/public-signals${query ? `?${query}` : ''}`);
  },

  getGuestWeatherExperience: (params?: { rainfall?: number; temperature?: number; condition?: string; guest_id?: number }): Promise<GuestExperienceWeatherResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.rainfall !== undefined) searchParams.append('rainfall', params.rainfall.toString());
    if (params?.temperature !== undefined) searchParams.append('temperature', params.temperature.toString());
    if (params?.condition !== undefined) searchParams.append('condition', params.condition);
    if (params?.guest_id !== undefined) searchParams.append('guest_id', params.guest_id.toString());
    const query = searchParams.toString();
    return fetchAPI(`/api/weather/guest-experience${query ? `?${query}` : ''}`);
  },
};

export interface SystemicIssue {
  type: string;
  title: string;
  severity: string;
  summary: string;
  evidence: string[];
  source: string;
}

export interface SystemicIssueResponse {
  issues: SystemicIssue[];
}

export interface CurrentWeatherResponse {
  temperature: number;
  humidity: number;
  rainfall: number;
  rain_probability: number;
  wind_speed: number;
  condition: string;
  timestamp: string;
  location: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | string;
  severity_reason: string;
  is_live: boolean;
}

export interface DailyForecastItem {
  date: string;
  temperature_max: number;
  temperature_min: number;
  rainfall: number;
  rain_probability: number;
  wind_speed: number;
  condition: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | string;
  severity_reason: string;
}

export interface WeatherForecastResponse {
  location: string;
  timestamp: string;
  current: CurrentWeatherResponse;
  forecast: DailyForecastItem[];
}

export interface WeatherSeverityResponse {
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | string;
  severity_reason: string;
  rainfall: number;
  temperature: number;
  wind: number;
  condition: string;
}

export interface DigitalTwinSimulationRequest {
  rainfall: number;
  temperature: number;
  duration_hours: number;
  humidity?: number;
  wind?: number;
  day_of_week?: number;
  current_occupancy?: number;
}

export interface AffectedActivity {
  name: string;
  venue: string;
  status: 'Suspended' | 'Relocated' | 'Operational' | string;
  reason: string;
  impact_level: 'High' | 'Medium' | 'Low' | string;
}

export interface IndoorActivityAlternative {
  name: string;
  venue: string;
  suitable_for: string;
  status: string;
  highlights: string;
}

export interface ActivitiesIntegration {
  affected_outdoor_activities: AffectedActivity[];
  suggested_indoor_alternatives: IndoorActivityAlternative[];
  summary: string;
}

export interface DiningIntegration {
  baseline_demand_pct: number;
  simulated_demand_pct: number;
  predicted_increase_pct: number;
  in_room_dining_surge: boolean;
  estimated_covers: number;
  impacted_venues: string[];
  operational_recommendation: string;
}

export interface StaffDepartmentBreakdown {
  department: string;
  current_available: number;
  additional_required: number;
  primary_task: string;
}

export interface StaffingIntegration {
  total_current_available: number;
  total_additional_required: number;
  departments: StaffDepartmentBreakdown[];
  recommendation: string;
}

export interface IndoorExperience {
  title: string;
  category: string;
  location: string;
  availability_status: string;
  duration: string;
  description: string;
}

export interface GuestExperienceIntegration {
  experiences: IndoorExperience[];
  curation_rationale: string;
}

export interface WeatherNotificationPreview {
  title: string;
  target_audience: string;
  channel: string;
  preview_message: string;
  urgency: string;
  dispatch_advice: string;
  is_simulation_only: boolean;
}

export interface GeospatialLocationImpact {
  id: string;
  name: string;
  category: 'resort' | 'pool' | 'restaurant' | 'spa' | 'outdoor activity area' | string;
  latitude: number;
  longitude: number;
  impact_state: 'LOW' | 'MODERATE' | 'HIGH';
  status_label: string;
  weather_condition: string;
  operational_action: string;
  demand_or_capacity_pct: number;
}

export interface DigitalTwinIntegrations {
  is_heavy_weather: boolean;
  weather_severity: string;
  activities: ActivitiesIntegration;
  dining: DiningIntegration;
  staffing: StaffingIntegration;
  guest_experience: GuestExperienceIntegration;
  notification: WeatherNotificationPreview;
  geospatial_locations?: GeospatialLocationImpact[];
}

export interface PublicSignal {
  id: string;
  source: string;
  summary: string;
  timestamp: string;
  relevance: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  impact_type: 'weather' | 'travel_disruption' | 'flooding' | 'road_conditions' | 'traveler_reports' | string;
  location_reference?: string;
  verified: boolean;
}

export interface PublicSignalsResponse {
  signals: PublicSignal[];
  total_signals: number;
  primary_source: string;
  last_updated: string;
  context_advice: string;
}

export interface DigitalTwinSimulationResponse {
  outdoor_activity_demand: number;
  dining_demand: number;
  spa_demand: number;
  guest_request_volume: number;
  additional_staff_requirement: number;
  impact_severity: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' | string;
  occupancy: number;
  explanation: {
    occupancy?: string;
    outdoor_activity_demand?: string;
    dining_demand?: string;
    spa_demand?: string;
    guest_request_volume?: string;
    additional_staff_requirement?: string;
    impact_severity?: string;
    [key: string]: string | undefined;
  };
  simulation_metadata?: Record<string, any>;
  integrations?: DigitalTwinIntegrations;
  public_signals?: PublicSignalsResponse;
}

export interface IndoorExperienceItem {
  id: string;
  title: string;
  category: string;
  location: string;
  availability_status: string;
  duration: string;
  description: string;
  booking_category: string;
}

export interface GuestExperienceWeatherResponse {
  high_outdoor_impact: boolean;
  weather_condition: string;
  temperature: number;
  rainfall: number;
  severity: string;
  alert_title: string;
  alert_message: string;
  indoor_experiences: IndoorExperienceItem[];
  notification_synced: boolean;
}


