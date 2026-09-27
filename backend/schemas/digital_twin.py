from pydantic import BaseModel, Field, model_validator
from typing import Optional, Dict, Any, List
from backend.schemas.public_signal import PublicSignalsResponse

class AffectedActivity(BaseModel):
    name: str = Field(..., description="Activity name")
    venue: str = Field(..., description="Venue location")
    status: str = Field(..., description="Suspended, Relocated, or Weather Warning")
    reason: str = Field(..., description="Weather reason for impact")
    impact_level: str = Field(..., description="High, Medium, or Low")

class IndoorActivityAlternative(BaseModel):
    name: str = Field(..., description="Indoor activity name")
    venue: str = Field(..., description="Indoor venue location")
    suitable_for: str = Field(..., description="Target audience")
    status: str = Field(..., description="Open or Available")
    highlights: str = Field(..., description="Key activity highlight")

class ActivitiesIntegration(BaseModel):
    affected_outdoor_activities: List[AffectedActivity] = Field(default_factory=list)
    suggested_indoor_alternatives: List[IndoorActivityAlternative] = Field(default_factory=list)
    summary: str = Field(..., description="Executive summary of activities shift")

class DiningIntegration(BaseModel):
    baseline_demand_pct: float = Field(..., description="Baseline dining demand percentage")
    simulated_demand_pct: float = Field(..., description="Simulated dining demand percentage")
    predicted_increase_pct: float = Field(..., description="Predicted percentage increase in dining demand")
    in_room_dining_surge: bool = Field(..., description="Whether in-room dining is experiencing high surge")
    estimated_covers: int = Field(..., description="Projected meal covers on-property")
    impacted_venues: List[str] = Field(default_factory=list, description="List of F&B venues affected")
    operational_recommendation: str = Field(..., description="Actionable F&B recommendation")

class StaffDepartmentBreakdown(BaseModel):
    department: str = Field(..., description="Department name")
    current_available: int = Field(..., description="Staff currently available")
    additional_required: int = Field(..., description="Extra staff required during storm")
    primary_task: str = Field(..., description="Primary weather operational responsibility")

class StaffingIntegration(BaseModel):
    total_current_available: int = Field(..., description="Total available staff currently")
    total_additional_required: int = Field(..., description="Total additional staff needed")
    departments: List[StaffDepartmentBreakdown] = Field(default_factory=list)
    recommendation: str = Field(..., description="Staffing action plan")

class IndoorExperience(BaseModel):
    title: str = Field(..., description="Indoor experience title")
    category: str = Field(..., description="Category like Wellness, Culinary, Recreation")
    location: str = Field(..., description="Location on property")
    availability_status: str = Field(..., description="Current availability")
    duration: str = Field(..., description="Duration of experience")
    description: str = Field(..., description="Experience description")

class GuestExperienceIntegration(BaseModel):
    experiences: List[IndoorExperience] = Field(default_factory=list)
    curation_rationale: str = Field(..., description="Rationale for experience selection")

class WeatherNotificationPreview(BaseModel):
    title: str = Field(..., description="Notification title")
    target_audience: str = Field(..., description="Target guest audience")
    channel: str = Field(..., description="Delivery channels")
    preview_message: str = Field(..., description="Ready-to-dispatch notification text")
    urgency: str = Field(..., description="Advisory, Caution, or Urgent")
    dispatch_advice: str = Field(..., description="Advice on when/how to broadcast")
    is_simulation_only: bool = Field(default=True, description="Strictly simulation flag")

class GeospatialLocationImpact(BaseModel):
    id: str = Field(..., description="Unique location identifier")
    name: str = Field(..., description="Display name of resort area")
    category: str = Field(..., description="resort, pool, restaurant, spa, or outdoor activity")
    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")
    impact_state: str = Field(..., description="LOW, MODERATE, or HIGH")
    status_label: str = Field(..., description="Operational status message")
    weather_condition: str = Field(..., description="Weather effect on area")
    operational_action: str = Field(..., description="Actionable response directive")
    demand_or_capacity_pct: float = Field(..., description="Simulated demand or load percentage")

class DigitalTwinIntegrations(BaseModel):
    is_heavy_weather: bool = Field(..., description="True if weather warrants operational shifting")
    weather_severity: str = Field(..., description="Weather severity classification")
    activities: ActivitiesIntegration = Field(...)
    dining: DiningIntegration = Field(...)
    staffing: StaffingIntegration = Field(...)
    guest_experience: GuestExperienceIntegration = Field(...)
    notification: WeatherNotificationPreview = Field(...)
    geospatial_locations: List[GeospatialLocationImpact] = Field(default_factory=list, description="Resort map location impact markers")

class DigitalTwinSimulationRequest(BaseModel):
    rainfall: float = Field(default=0.0, description="Precipitation in millimeters")
    temperature: float = Field(default=25.0, description="Ambient temperature in Celsius")
    duration_hours: float = Field(default=3.0, ge=0.1, le=168.0, description="Duration of the weather event in hours")
    humidity: Optional[float] = Field(default=68.0, ge=0.0, le=100.0, description="Relative humidity percentage")
    wind: Optional[float] = Field(default=12.0, ge=0.0, description="Wind speed in km/h")
    wind_speed: Optional[float] = Field(default=None, description="Optional alias for wind")
    duration: Optional[float] = Field(default=None, description="Optional alias for duration_hours")
    day_of_week: Optional[int] = Field(None, ge=0, le=6, description="Day of week (0=Monday, 6=Sunday)")
    current_occupancy: Optional[float] = Field(None, ge=0.0, le=100.0, description="Optional occupancy percentage override (0-100)")

    @model_validator(mode="before")
    @classmethod
    def normalize_simulation_payload(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "duration_hours" not in data or data["duration_hours"] is None:
                data["duration_hours"] = data.get("duration", 3.0) or 3.0
            if "wind" not in data or data["wind"] is None:
                data["wind"] = data.get("wind_speed", 12.0) if data.get("wind_speed") is not None else 12.0
            if "rainfall" not in data or data["rainfall"] is None:
                data["rainfall"] = 0.0
            if "temperature" not in data or data["temperature"] is None:
                data["temperature"] = 25.0
            if "humidity" not in data or data["humidity"] is None:
                data["humidity"] = 68.0
        return data

class DigitalTwinSimulationResponse(BaseModel):
    outdoor_activity_demand: float = Field(..., description="Simulated outdoor activity demand percentage (0-100)")
    dining_demand: float = Field(..., description="Simulated dining/F&B demand percentage (0-100)")
    spa_demand: float = Field(..., description="Simulated spa/indoor wellness demand percentage (0-100)")
    guest_request_volume: int = Field(..., description="Simulated guest request/complaint volume during event")
    additional_staff_requirement: int = Field(..., description="Additional on-duty staff required above baseline roster")
    impact_severity: str = Field(..., description="Operational severity classification: LOW, MODERATE, HIGH, EXTREME")
    occupancy: float = Field(..., description="Simulated/active resort occupancy percentage")
    explanation: Dict[str, str] = Field(default_factory=dict, description="Explainable rationales for each simulation dimension")
    simulation_metadata: Dict[str, Any] = Field(default_factory=dict, description="Model parameters and context")
    integrations: Optional[DigitalTwinIntegrations] = Field(None, description="Connected module simulation recommendations")
    public_signals: Optional[PublicSignalsResponse] = Field(None, description="Normalized real-world public signals context")
