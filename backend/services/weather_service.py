import os
import time
import json
import logging
import urllib.request
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional

from backend.schemas.weather import (
    CurrentWeatherResponse,
    DailyForecastItem,
    WeatherForecastResponse,
    IndoorExperienceItem,
    GuestExperienceWeatherResponse,
)

logger = logging.getLogger(__name__)

# WMO Weather interpretation codes (WW)
WMO_CODE_MAP = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    56: "Light Freezing Drizzle",
    57: "Dense Freezing Drizzle",
    61: "Slight Rain",
    62: "Rain Showers",
    63: "Moderate Rain",
    65: "Heavy Rain",
    66: "Light Freezing Rain",
    67: "Heavy Freezing Rain",
    71: "Slight Snow Fall",
    73: "Moderate Snow Fall",
    75: "Heavy Snow Fall",
    77: "Snow Grains",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    85: "Slight Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Slight Hail",
    99: "Thunderstorm with Heavy Hail",
}

# Cache store
_cache: Dict[str, Any] = {}
CACHE_TTL_SECONDS = 300  # 5 minutes


def _get_resort_config() -> Tuple[float, float, str]:
    """Retrieve resort coordinates and display name from environment variables."""
    lat_str = os.getenv("RESORT_LATITUDE", "15.2993")
    lon_str = os.getenv("RESORT_LONGITUDE", "74.1240")
    location_name = os.getenv("RESORT_LOCATION_NAME", "Smart Resort 360, South Goa")

    try:
        latitude = float(lat_str)
        longitude = float(lon_str)
    except ValueError:
        latitude, longitude = 15.2993, 74.1240

    return latitude, longitude, location_name


SEVERITY_LEVELS = ["LOW", "MODERATE", "HIGH", "EXTREME"]


def classify_weather_severity(
    rainfall: float,
    temperature: float,
    wind: float,
    condition: str,
) -> Tuple[str, str]:
    """
    Lightweight, deterministic, and explainable weather severity classification.

    Inputs:
    - rainfall: precipitation in millimeters
    - temperature: ambient temperature in Celsius
    - wind: wind speed in km/h
    - weather condition: textual weather condition summary / WMO description

    Output:
    - Tuple of (severity, severity_reason)
      Severity is one of: 'LOW', 'MODERATE', 'HIGH', 'EXTREME'
      Severity reason provides human-readable, deterministic rationale.
    """
    try:
        rainfall_val = float(rainfall) if rainfall is not None else 0.0
    except (TypeError, ValueError):
        rainfall_val = 0.0

    try:
        temp_val = float(temperature) if temperature is not None else 25.0
    except (TypeError, ValueError):
        temp_val = 25.0

    try:
        wind_val = float(wind) if wind is not None else 0.0
    except (TypeError, ValueError):
        wind_val = 0.0

    cond_str = str(condition).strip() if condition is not None else "Clear"
    cond_lower = cond_str.lower()

    # Track component level (0=LOW, 1=MODERATE, 2=HIGH, 3=EXTREME) and diagnostic messages
    reasons = []

    # 1. Rainfall evaluation
    rain_lvl = 0
    if rainfall_val >= 35.0:
        rain_lvl = 3
        reasons.append((3, f"Torrential downpour ({rainfall_val:.1f} mm)"))
    elif rainfall_val >= 15.0:
        rain_lvl = 2
        reasons.append((2, f"Heavy rainfall ({rainfall_val:.1f} mm)"))
    elif rainfall_val >= 2.0:
        rain_lvl = 1
        reasons.append((1, f"Moderate rain ({rainfall_val:.1f} mm)"))

    # 2. Wind evaluation
    wind_lvl = 0
    if wind_val >= 60.0:
        wind_lvl = 3
        reasons.append((3, f"Gale-force wind ({wind_val:.1f} km/h)"))
    elif wind_val >= 40.0:
        wind_lvl = 2
        reasons.append((2, f"High wind speed ({wind_val:.1f} km/h)"))
    elif wind_val >= 25.0:
        wind_lvl = 1
        reasons.append((1, f"Brisk breeze ({wind_val:.1f} km/h)"))

    # 3. Temperature evaluation
    temp_lvl = 0
    if temp_val >= 42.0:
        temp_lvl = 3
        reasons.append((3, f"Extreme heatwave ({temp_val:.1f}°C)"))
    elif temp_val <= 0.0:
        temp_lvl = 3
        reasons.append((3, f"Freezing temperature ({temp_val:.1f}°C)"))
    elif temp_val >= 38.0:
        temp_lvl = 2
        reasons.append((2, f"Severe high temperature ({temp_val:.1f}°C)"))
    elif temp_val <= 5.0:
        temp_lvl = 2
        reasons.append((2, f"Near-freezing cold ({temp_val:.1f}°C)"))
    elif temp_val >= 34.0:
        temp_lvl = 1
        reasons.append((1, f"Elevated heat ({temp_val:.1f}°C)"))
    elif temp_val <= 12.0:
        temp_lvl = 1
        reasons.append((1, f"Chilly temperature ({temp_val:.1f}°C)"))

    # 4. Condition evaluation
    cond_lvl = 0
    if any(k in cond_lower for k in ["hurricane", "cyclone", "tornado", "violent", "heavy hail", "blizzard"]):
        cond_lvl = 3
        reasons.append((3, f"Hazardous condition: {cond_str}"))
    elif any(k in cond_lower for k in ["thunderstorm", "squall", "hail"]):
        cond_lvl = 2
        reasons.append((2, f"Severe convective storm: {cond_str}"))
    elif any(k in cond_lower for k in ["heavy rain", "heavy snow"]):
        cond_lvl = 2
        reasons.append((2, f"Severe precipitation condition: {cond_str}"))
    elif any(k in cond_lower for k in ["rain", "drizzle", "shower", "snow", "fog", "sleet"]):
        cond_lvl = 1
        reasons.append((1, f"Inclement condition: {cond_str}"))

    # Determine maximum individual severity level
    max_lvl = max(rain_lvl, wind_lvl, temp_lvl, cond_lvl)

    # Compound multi-hazard escalation:
    # If 2 or more distinct physical hazard categories (rain, wind, temperature, convective storm) are HIGH,
    # escalate to EXTREME
    distinct_high_hazards = sum([
        1 if rain_lvl >= 2 else 0,
        1 if wind_lvl >= 2 else 0,
        1 if temp_lvl >= 2 else 0,
        1 if cond_lvl >= 2 and ("thunderstorm" in cond_lower or "squall" in cond_lower) else 0,
    ])
    compound_escalation = False
    if distinct_high_hazards >= 2 and max_lvl < 3:
        max_lvl = 3
        compound_escalation = True

    severity = SEVERITY_LEVELS[max_lvl]

    # Filter reasons matching the active severity level or any elevated triggers
    active_reasons = [r for lvl, r in reasons if lvl >= max(1, max_lvl)]
    if not active_reasons and reasons:
        active_reasons = [r for _, r in reasons]

    if active_reasons:
        details = ", ".join(active_reasons)
        if compound_escalation:
            reason = f"Compound severe multi-hazard condition: {details}"
        else:
            reason = f"{severity} severity due to {details}"
    else:
        reason = f"Optimal conditions: {cond_str}, {temp_val:.1f}°C, {wind_val:.1f} km/h wind, no significant rainfall"

    return severity, reason


def _calculate_severity(
    rainfall: float,
    wind_speed: float,
    rain_probability: float,
    condition: str,
) -> str:
    """Legacy helper wrapped around deterministic classify_weather_severity."""
    severity, _ = classify_weather_severity(
        rainfall=rainfall,
        temperature=25.0,
        wind=wind_speed,
        condition=condition,
    )
    return severity


def _fetch_from_provider() -> Dict[str, Any]:
    """Fetch live forecast data from WeatherAPI.com."""
    latitude, longitude, _ = _get_resort_config()
    api_key = os.getenv("WEATHER_API_KEY", "")

    if not api_key:
        raise RuntimeError("WEATHER_API_KEY is not set in environment variables.")

    # WeatherAPI.com forecast endpoint — 7 days, includes current + daily
    api_url = (
        f"http://api.weatherapi.com/v1/forecast.json"
        f"?key={api_key}"
        f"&q={latitude},{longitude}"
        f"&days=7"
        f"&aqi=no"
        f"&alerts=no"
    )

    req = urllib.request.Request(
        api_url,
        headers={"User-Agent": "SmartResort360-WeatherEngine/1.0"},
    )
    with urllib.request.urlopen(req, timeout=8) as response:
        if response.status != 200:
            raise RuntimeError(f"WeatherAPI.com returned status {response.status}")
        raw_body = response.read().decode("utf-8")
        return json.loads(raw_body)


def _get_fallback_weather() -> Dict[str, Any]:
    """Graceful fallback if provider is temporarily unreachable or offline."""
    now_iso = datetime.now(timezone.utc).isoformat()
    _, _, location_name = _get_resort_config()
    fb_temp = 28.5
    fb_humidity = 68.0
    fb_rainfall = 0.0
    fb_rain_probability = 15.0
    fb_wind_speed = 14.2
    fb_condition = "Partly Cloudy"
    severity, severity_reason = classify_weather_severity(
        rainfall=fb_rainfall,
        temperature=fb_temp,
        wind=fb_wind_speed,
        condition=fb_condition,
    )
    return {
        "temperature": fb_temp,
        "humidity": fb_humidity,
        "rainfall": fb_rainfall,
        "rain_probability": fb_rain_probability,
        "wind_speed": fb_wind_speed,
        "condition": fb_condition,
        "timestamp": now_iso,
        "location": location_name,
        "severity": severity,
        "severity_reason": severity_reason,
        "is_live": False,
    }


def get_current_weather() -> CurrentWeatherResponse:
    """Retrieve normalized current weather from WeatherAPI.com."""
    now = time.time()
    cache_key = "current_weather"

    if cache_key in _cache:
        cached_entry, expiry = _cache[cache_key]
        if now < expiry:
            return cached_entry

    _, _, location_name = _get_resort_config()

    try:
        data = _fetch_from_provider()

        # WeatherAPI.com response structure
        current = data.get("current", {})
        location_data = data.get("location", {})
        condition_obj = current.get("condition", {})

        temp        = float(current.get("temp_c", 28.0))
        humidity    = float(current.get("humidity", 65.0))
        rainfall    = float(current.get("precip_mm", 0.0))
        wind_speed  = float(current.get("wind_kph", 12.0))
        condition   = condition_obj.get("text", "Clear")

        # WeatherAPI.com provides chance_of_rain inside forecast/hour — approximate from precip
        # Use today's forecast day for rain probability if available
        rain_prob = 0.0
        try:
            today_day = data["forecast"]["forecastday"][0]["day"]
            rain_prob = float(today_day.get("daily_chance_of_rain", 0))
        except (KeyError, IndexError, TypeError):
            rain_prob = 80.0 if rainfall > 0 else 10.0

        # Timestamp from API or now
        ts_str = current.get("last_updated", "")
        try:
            timestamp = datetime.fromisoformat(ts_str).isoformat() if ts_str else datetime.now(timezone.utc).isoformat()
        except Exception:
            timestamp = datetime.now(timezone.utc).isoformat()

        display_location = location_data.get("name", location_name)
        if location_data.get("region"):
            display_location = f"{display_location}, {location_data['region']}"

        severity, severity_reason = classify_weather_severity(
            rainfall=rainfall,
            temperature=temp,
            wind=wind_speed,
            condition=condition,
        )

        result = CurrentWeatherResponse(
            temperature=round(temp, 1),
            humidity=round(humidity, 1),
            rainfall=round(rainfall, 1),
            rain_probability=round(rain_prob, 1),
            wind_speed=round(wind_speed, 1),
            condition=condition,
            timestamp=timestamp,
            location=display_location,
            severity=severity,
            severity_reason=severity_reason,
            is_live=True,
        )

        _cache[cache_key] = (result, now + CACHE_TTL_SECONDS)
        return result

    except Exception as e:
        logger.warning("WeatherAPI.com fetch failed: %s. Using fallback.", e)
        fallback = _get_fallback_weather()
        return CurrentWeatherResponse(**fallback)


def get_weather_forecast() -> WeatherForecastResponse:
    """Retrieve normalized current weather and 7-day forecast from WeatherAPI.com."""
    now = time.time()
    cache_key = "forecast_weather"

    if cache_key in _cache:
        cached_entry, expiry = _cache[cache_key]
        if now < expiry:
            return cached_entry

    current_data = get_current_weather()
    _, _, location_name = _get_resort_config()

    try:
        data = _fetch_from_provider()
        forecast_days = data.get("forecast", {}).get("forecastday", [])

        forecast_list = []
        for day_data in forecast_days:
            d_date = day_data.get("date", "")
            day   = day_data.get("day", {})
            cond  = day.get("condition", {})

            d_max  = float(day.get("maxtemp_c", current_data.temperature + 2.0))
            d_min  = float(day.get("mintemp_c", current_data.temperature - 3.0))
            d_rain = float(day.get("totalprecip_mm", 0.0))
            d_prob = float(day.get("daily_chance_of_rain", 10.0))
            d_wind = float(day.get("maxwind_kph", 15.0))
            d_cond = cond.get("text", "Partly Cloudy")

            d_sev, d_reason = classify_weather_severity(
                rainfall=d_rain,
                temperature=d_max,
                wind=d_wind,
                condition=d_cond,
            )

            forecast_list.append(
                DailyForecastItem(
                    date=d_date,
                    temperature_max=round(d_max, 1),
                    temperature_min=round(d_min, 1),
                    rainfall=round(d_rain, 1),
                    rain_probability=round(d_prob, 1),
                    wind_speed=round(d_wind, 1),
                    condition=d_cond,
                    severity=d_sev,
                    severity_reason=d_reason,
                )
            )

        response = WeatherForecastResponse(
            location=location_name,
            timestamp=datetime.now(timezone.utc).isoformat(),
            current=current_data,
            forecast=forecast_list,
        )

        _cache[cache_key] = (response, now + CACHE_TTL_SECONDS)
        return response

    except Exception as e:
        logger.warning("Failed to fetch weather forecast: %s. Using basic daily extrapolation.", e)
        # Generate safe placeholder daily forecast
        today_date = datetime.now(timezone.utc).date()
        from datetime import timedelta

        fallback_forecast = []
        for i in range(5):
            f_date = (today_date + timedelta(days=i)).strftime("%Y-%m-%d")
            fallback_forecast.append(
                DailyForecastItem(
                    date=f_date,
                    temperature_max=round(current_data.temperature + 2.0, 1),
                    temperature_min=round(current_data.temperature - 3.0, 1),
                    rainfall=current_data.rainfall,
                    rain_probability=current_data.rain_probability,
                    wind_speed=current_data.wind_speed,
                    condition=current_data.condition,
                    severity=current_data.severity,
                    severity_reason=current_data.severity_reason,
                )
            )

        response = WeatherForecastResponse(
            location=location_name,
            timestamp=datetime.now(timezone.utc).isoformat(),
            current=current_data,
            forecast=fallback_forecast,
        )
        return response


def get_guest_weather_experience(
    rainfall_override: Optional[float] = None,
    temperature_override: Optional[float] = None,
    condition_override: Optional[str] = None,
    guest_id: Optional[int] = None,
    db: Optional[Any] = None,
) -> GuestExperienceWeatherResponse:
    """
    Connect Weather Intelligence and Digital Twin impact to Guest Experience.
    If Digital Twin / Weather Intelligence detects high impact on outdoor activities:
    1. Show weather alert to guest:
       "Heavy rain may affect outdoor activities.
        Here are indoor experiences available now."
    2. Recommend available indoor experiences.
    3. Reuses existing activity and booking logic.
    4. Reuses existing notification system.
    """
    current = get_current_weather()
    eff_rainfall = rainfall_override if rainfall_override is not None else current.rainfall
    eff_temp = temperature_override if temperature_override is not None else current.temperature
    eff_cond = condition_override if condition_override is not None else current.condition

    # Severity classification
    sev, _ = classify_weather_severity(
        rainfall=eff_rainfall,
        temperature=eff_temp,
        wind=current.wind_speed,
        condition=eff_cond,
    )

    # High impact on outdoor activities:
    # Triggered when precipitation is >= 5.0mm, or severity is HIGH/EXTREME,
    # or conditions are stormy/squally.
    is_high_impact = (
        eff_rainfall >= 5.0
        or sev in ("HIGH", "EXTREME")
        or any(w in eff_cond.lower() for w in ["heavy", "thunderstorm", "monsoon", "squall", "violent"])
    )

    indoor_experiences: List[IndoorExperienceItem] = []
    notif_synced = False

    if is_high_impact:
        alert_title = "Weather Advisory: Outdoor Activities Affected"
        alert_message = "Heavy rain may affect outdoor activities.\nHere are indoor experiences available now."
        indoor_experiences = [
            IndoorExperienceItem(
                id="exp-spa-01",
                title="Ayurvedic Monsoon Warm Herbal Therapy",
                category="Wellness & Spa",
                location="Celestial Spa Pavilion (Suites 1-4)",
                availability_status="Available (3 Private Suites Open)",
                duration="60 mins",
                description="Deeply warming sesame and camphor herbal oil therapy tailored for wet-weather relaxation.",
                booking_category="Spa / Wellness",
            ),
            IndoorExperienceItem(
                id="exp-tea-02",
                title="Single-Estate Goan Tea & Chai Tasting",
                category="Culinary & Tasting",
                location="The Spice Pavilion Atrium",
                availability_status="Open Walk-In (Hosted every 30m)",
                duration="45 mins",
                description="Curated pairing of five local artisan teas with traditional freshly-baked Goan delicacies.",
                booking_category="Dining / Culinary",
            ),
            IndoorExperienceItem(
                id="exp-mix-03",
                title="Indoor Mixology & Botanical Mocktail Workshop",
                category="Culinary & Tasting",
                location="The Palm Lounge Bar",
                availability_status="Available (6 Spots Reserved for In-House)",
                duration="45 mins",
                description="Interactive hands-on session crafting signature spices and tropical infusions.",
                booking_category="Dining / Culinary",
            ),
            IndoorExperienceItem(
                id="exp-art-04",
                title="Family Pottery & Terracotta Studio",
                category="Recreation & Arts",
                location="Creative Arts Studio (West Wing)",
                availability_status="Open Drop-In",
                duration="60 mins",
                description="Hands-on clay sculpting and traditional Goan tile painting under master artisan guidance.",
                booking_category="Recreation / Arts",
            ),
        ]

        # Reuse existing notification system if guest_id and db are provided
        if guest_id and db:
            try:
                from backend.models.notification import Notification
                # Check for recent unread weather notification
                existing = db.query(Notification).filter(
                    Notification.guest_id == guest_id,
                    Notification.message.like("%Heavy rain may affect outdoor activities%"),
                    Notification.read == False
                ).first()
                if not existing:
                    notif = Notification(
                        guest_id=guest_id,
                        message="Heavy rain may affect outdoor activities.\nHere are indoor experiences available now.",
                        read=False,
                        created_at=datetime.now(timezone.utc),
                    )
                    db.add(notif)
                    db.commit()
                notif_synced = True
            except Exception as e:
                logger.warning("Could not sync to notification system: %s", e)
    else:
        alert_title = "Optimal Weather: Outdoor Activities Active"
        alert_message = "All outdoor pools, beachfront recreation, and lawns are currently operational."

    return GuestExperienceWeatherResponse(
        high_outdoor_impact=is_high_impact,
        weather_condition=eff_cond,
        temperature=eff_temp,
        rainfall=eff_rainfall,
        severity=sev,
        alert_title=alert_title,
        alert_message=alert_message,
        indoor_experiences=indoor_experiences,
        notification_synced=notif_synced,
    )

