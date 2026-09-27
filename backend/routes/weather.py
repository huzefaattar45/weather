from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.schemas.weather import (
    CurrentWeatherResponse,
    WeatherForecastResponse,
    WeatherSeverityRequest,
    WeatherSeverityResponse,
    GuestExperienceWeatherResponse,
)
from backend.services.weather_service import (
    get_current_weather,
    get_weather_forecast,
    classify_weather_severity,
    get_guest_weather_experience,
)

router = APIRouter(prefix="/api/weather", tags=["weather"])

@router.get("/current", response_model=CurrentWeatherResponse)
def get_current():
    """Retrieve normalized live weather conditions for the resort."""
    return get_current_weather()

@router.get("/forecast", response_model=WeatherForecastResponse)
def get_forecast():
    """Retrieve normalized current weather and multi-day forecast for the resort."""
    return get_weather_forecast()

@router.get("/severity", response_model=WeatherSeverityResponse)
def get_severity(
    rainfall: float = 0.0,
    temperature: float = 25.0,
    wind: float = 10.0,
    condition: str = "Clear",
):
    """Classify weather severity deterministically with explainability."""
    severity, reason = classify_weather_severity(
        rainfall=rainfall,
        temperature=temperature,
        wind=wind,
        condition=condition,
    )
    return WeatherSeverityResponse(
        severity=severity,
        severity_reason=reason,
        rainfall=rainfall,
        temperature=temperature,
        wind=wind,
        condition=condition,
    )

@router.post("/severity", response_model=WeatherSeverityResponse)
def post_severity(payload: WeatherSeverityRequest):
    """Classify weather severity deterministically with explainability via JSON payload."""
    severity, reason = classify_weather_severity(
        rainfall=payload.rainfall,
        temperature=payload.temperature,
        wind=payload.wind,
        condition=payload.condition,
    )
    return WeatherSeverityResponse(
        severity=severity,
        severity_reason=reason,
        rainfall=payload.rainfall,
        temperature=payload.temperature,
        wind=payload.wind,
        condition=payload.condition,
    )

@router.get("/guest-experience", response_model=GuestExperienceWeatherResponse)
def get_weather_guest_experience(
    rainfall: Optional[float] = None,
    temperature: Optional[float] = None,
    condition: Optional[str] = None,
    guest_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """
    Connect Weather Intelligence & Digital Twin impact to Guest Experience.
    When outdoor activities are impacted:
    1. Returns weather alert ("Heavy rain may affect outdoor activities. Here are indoor experiences available now.")
    2. Recommends available indoor experiences
    3. Reuses existing notification system by adding to guest notifications
    """
    return get_guest_weather_experience(
        rainfall_override=rainfall,
        temperature_override=temperature,
        condition_override=condition,
        guest_id=guest_id,
        db=db,
    )

