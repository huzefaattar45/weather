from pydantic import BaseModel, Field
from typing import List, Optional

class CurrentWeatherResponse(BaseModel):
    temperature: float = Field(..., description="Current temperature in Celsius")
    humidity: float = Field(..., description="Relative humidity percentage")
    rainfall: float = Field(..., description="Precipitation in millimeters")
    rain_probability: float = Field(..., description="Probability of precipitation percentage")
    wind_speed: float = Field(..., description="Wind speed in km/h")
    condition: str = Field(..., description="Human-readable weather condition")
    timestamp: str = Field(..., description="ISO formatted timestamp of measurement")
    location: str = Field(..., description="Location name of the resort")
    severity: str = Field(..., description="Deterministic severity: LOW, MODERATE, HIGH, EXTREME")
    severity_reason: str = Field(..., description="Explainable rationale for the severity rating")
    is_live: bool = Field(True, description="Whether data was fetched live from provider")

class DailyForecastItem(BaseModel):
    date: str = Field(..., description="Forecast date (YYYY-MM-DD)")
    temperature_max: float = Field(..., description="Daily maximum temperature in Celsius")
    temperature_min: float = Field(..., description="Daily minimum temperature in Celsius")
    rainfall: float = Field(..., description="Expected precipitation in mm")
    rain_probability: float = Field(..., description="Precipitation probability percentage")
    wind_speed: float = Field(..., description="Expected peak wind speed in km/h")
    condition: str = Field(..., description="Weather condition summary")
    severity: str = Field(..., description="Daily severity: LOW, MODERATE, HIGH, EXTREME")
    severity_reason: str = Field(..., description="Explainable rationale for forecast severity")

class WeatherForecastResponse(BaseModel):
    location: str
    timestamp: str
    current: CurrentWeatherResponse
    forecast: List[DailyForecastItem]

class WeatherSeverityRequest(BaseModel):
    rainfall: float = Field(0.0, description="Precipitation in millimeters")
    temperature: float = Field(25.0, description="Ambient temperature in Celsius")
    wind: float = Field(10.0, description="Wind speed in km/h")
    condition: str = Field("Clear", description="Human-readable weather condition")

class WeatherSeverityResponse(BaseModel):
    severity: str = Field(..., description="Deterministic severity: LOW, MODERATE, HIGH, EXTREME")
    severity_reason: str = Field(..., description="Explainable rationale for the severity rating")
    rainfall: float = Field(..., description="Precipitation in millimeters")
    temperature: float = Field(..., description="Ambient temperature in Celsius")
    wind: float = Field(..., description="Wind speed in km/h")
    condition: str = Field(..., description="Human-readable weather condition")

class IndoorExperienceItem(BaseModel):
    id: str = Field(..., description="Unique experience ID")
    title: str = Field(..., description="Indoor experience title")
    category: str = Field(..., description="Category (Spa & Wellness, Culinary, Recreation, Cultural)")
    location: str = Field(..., description="Resort location venue")
    availability_status: str = Field(..., description="Live availability status")
    duration: str = Field(..., description="Duration of experience")
    description: str = Field(..., description="Detailed description")
    booking_category: str = Field(default="Concierge Request", description="Category for existing request system")

class GuestExperienceWeatherResponse(BaseModel):
    high_outdoor_impact: bool = Field(..., description="Whether outdoor activities have high impact")
    weather_condition: str = Field(..., description="Weather condition")
    temperature: float = Field(..., description="Temperature in Celsius")
    rainfall: float = Field(..., description="Rainfall in mm")
    severity: str = Field(..., description="Weather severity")
    alert_title: str = Field(..., description="Alert title shown to guest")
    alert_message: str = Field(..., description="Alert message shown to guest")
    indoor_experiences: List[IndoorExperienceItem] = Field(default_factory=list, description="Available indoor experiences")
    notification_synced: bool = Field(False, description="Whether notification was synced to existing notification system")

