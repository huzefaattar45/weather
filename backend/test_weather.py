import os
import sys

_root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

from fastapi.testclient import TestClient
from backend.main import app
from backend.services.weather_service import classify_weather_severity

client = TestClient(app)

def test_get_current_weather():
    response = client.get("/api/weather/current")
    assert response.status_code == 200
    data = response.json()
    
    # Required fields verification
    required_fields = [
        "temperature",
        "humidity",
        "rainfall",
        "rain_probability",
        "wind_speed",
        "condition",
        "timestamp",
        "location",
        "severity",
        "severity_reason",
    ]
    for field in required_fields:
        assert field in data, f"Missing required field: {field}"
        assert data[field] is not None, f"Field {field} should not be None"
        
    # Value types verification
    assert isinstance(data["temperature"], (int, float))
    assert isinstance(data["humidity"], (int, float))
    assert isinstance(data["rainfall"], (int, float))
    assert isinstance(data["rain_probability"], (int, float))
    assert isinstance(data["wind_speed"], (int, float))
    assert isinstance(data["condition"], str)
    assert isinstance(data["location"], str)
    assert data["severity"] in ["LOW", "MODERATE", "HIGH", "EXTREME"]
    assert isinstance(data["severity_reason"], str)
    assert len(data["severity_reason"]) > 0
    
    # Ensure no API keys or secrets are leaked in response
    assert "api_key" not in data
    assert "key" not in data
    assert "secret" not in data

def test_get_weather_forecast():
    response = client.get("/api/weather/forecast")
    assert response.status_code == 200
    data = response.json()
    
    assert "location" in data
    assert "timestamp" in data
    assert "current" in data
    assert "forecast" in data
    assert isinstance(data["forecast"], list)
    assert len(data["forecast"]) > 0
    
    first_day = data["forecast"][0]
    for field in [
        "date",
        "temperature_max",
        "temperature_min",
        "rainfall",
        "rain_probability",
        "wind_speed",
        "condition",
        "severity",
        "severity_reason",
    ]:
        assert field in first_day, f"Missing forecast field: {field}"
    assert first_day["severity"] in ["LOW", "MODERATE", "HIGH", "EXTREME"]
    assert isinstance(first_day["severity_reason"], str)
    assert len(first_day["severity_reason"]) > 0

def test_classify_weather_severity_deterministic():
    # 1. LOW: calm, safe baseline
    sev, reason = classify_weather_severity(rainfall=0.0, temperature=26.0, wind=12.0, condition="Clear Sky")
    assert sev == "LOW"
    assert "Optimal conditions" in reason

    # 2. MODERATE: triggered by individual moderate factors
    # Rain factor
    sev, reason = classify_weather_severity(rainfall=5.0, temperature=25.0, wind=10.0, condition="Partly Cloudy")
    assert sev == "MODERATE"
    assert "Moderate rain" in reason

    # Temp factor (elevated heat)
    sev, reason = classify_weather_severity(rainfall=0.0, temperature=35.0, wind=10.0, condition="Sunny")
    assert sev == "MODERATE"
    assert "Elevated heat" in reason

    # Wind factor (brisk breeze)
    sev, reason = classify_weather_severity(rainfall=0.0, temperature=25.0, wind=28.0, condition="Clear")
    assert sev == "MODERATE"
    assert "Brisk breeze" in reason

    # Condition factor (rain showers)
    sev, reason = classify_weather_severity(rainfall=0.0, temperature=25.0, wind=10.0, condition="Light Drizzle")
    assert sev == "MODERATE"
    assert "Inclement condition" in reason

    # 3. HIGH: triggered by high thresholds
    # Heavy rain
    sev, reason = classify_weather_severity(rainfall=18.0, temperature=25.0, wind=10.0, condition="Cloudy")
    assert sev == "HIGH"
    assert "Heavy rainfall" in reason

    # Severe temperature (hot)
    sev, reason = classify_weather_severity(rainfall=0.0, temperature=39.0, wind=10.0, condition="Sunny")
    assert sev == "HIGH"
    assert "Severe high temperature" in reason

    # Severe temperature (near-freezing)
    sev, reason = classify_weather_severity(rainfall=0.0, temperature=4.0, wind=10.0, condition="Cloudy")
    assert sev == "HIGH"
    assert "Near-freezing cold" in reason

    # High winds
    sev, reason = classify_weather_severity(rainfall=0.0, temperature=25.0, wind=45.0, condition="Clear")
    assert sev == "HIGH"
    assert "High wind speed" in reason

    # Adverse storm condition
    sev, reason = classify_weather_severity(rainfall=0.0, temperature=25.0, wind=10.0, condition="Thunderstorm")
    assert sev == "HIGH"
    assert "Severe convective storm" in reason

    # 4. EXTREME: dangerous triggers
    # Torrential rainfall
    sev, reason = classify_weather_severity(rainfall=45.0, temperature=25.0, wind=15.0, condition="Rain")
    assert sev == "EXTREME"
    assert "Torrential downpour" in reason

    # Gale-force wind
    sev, reason = classify_weather_severity(rainfall=0.0, temperature=25.0, wind=65.0, condition="Clear")
    assert sev == "EXTREME"
    assert "Gale-force wind" in reason

    # Extreme heatwave
    sev, reason = classify_weather_severity(rainfall=0.0, temperature=44.0, wind=10.0, condition="Clear")
    assert sev == "EXTREME"
    assert "Extreme heatwave" in reason

    # Extreme freezing
    sev, reason = classify_weather_severity(rainfall=0.0, temperature=-2.0, wind=10.0, condition="Clear")
    assert sev == "EXTREME"
    assert "Freezing temperature" in reason

    # Hazardous condition
    sev, reason = classify_weather_severity(rainfall=0.0, temperature=25.0, wind=10.0, condition="Tropical Cyclone Warning")
    assert sev == "EXTREME"
    assert "Hazardous condition" in reason

    # 5. Compound escalation (multiple distinct HIGH factors escalate to EXTREME)
    sev, reason = classify_weather_severity(rainfall=20.0, temperature=25.0, wind=48.0, condition="Cloudy")
    assert sev == "EXTREME"
    assert "Compound severe multi-hazard" in reason

def test_weather_severity_api_endpoints():
    # GET endpoint test
    res = client.get("/api/weather/severity?rainfall=16.5&temperature=27.0&wind=14.0&condition=Heavy Rain")
    assert res.status_code == 200
    data = res.json()
    assert data["severity"] in ["HIGH", "EXTREME"]
    assert "severity_reason" in data
    assert data["rainfall"] == 16.5
    assert data["temperature"] == 27.0

    # POST endpoint test
    post_res = client.post("/api/weather/severity", json={
        "rainfall": 0.0,
        "temperature": 24.5,
        "wind": 10.0,
        "condition": "Mainly Clear"
    })
    assert post_res.status_code == 200
    post_data = post_res.json()
    assert post_data["severity"] == "LOW"
    assert "Optimal conditions" in post_data["severity_reason"]

if __name__ == "__main__":
    test_get_current_weather()
    test_get_weather_forecast()
    test_classify_weather_severity_deterministic()
    test_weather_severity_api_endpoints()
    print("All weather tests passed successfully!")
