import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from backend.main import app
from backend.services.weather_service import get_guest_weather_experience
from backend.database import SessionLocal
from backend.models.notification import Notification

client = TestClient(app)

def test_weather_guest_experience_service():
    db = SessionLocal()
    try:
        # 1. Test high outdoor impact (Heavy rain 15mm)
        res = get_guest_weather_experience(
            rainfall_override=15.0,
            temperature_override=26.0,
            guest_id=1,
            db=db,
        )
        assert res.high_outdoor_impact is True, "Expected high outdoor impact for 15mm rain"
        assert "Heavy rain may affect outdoor activities." in res.alert_message, "Missing required alert string"
        assert "Here are indoor experiences available now." in res.alert_message, "Missing required indoor experiences string"
        assert len(res.indoor_experiences) >= 3, "Expected at least 3 recommended indoor experiences"
        
        # Verify indoor experiences fields
        for exp in res.indoor_experiences:
            assert exp.id
            assert exp.title
            assert exp.category
            assert exp.location
            assert exp.availability_status
            assert exp.duration
            assert exp.description
            assert exp.booking_category

        # Verify existing notification system integration
        notif = db.query(Notification).filter(
            Notification.guest_id == 1,
            Notification.message.like("%Heavy rain may affect outdoor activities%"),
        ).order_by(Notification.id.desc()).first()
        assert notif is not None, "Notification must be saved into existing notification table"
        print("[OK] Weather intelligence to guest experience service & notification integration verified")

        # 2. Test low outdoor impact (Sunny/Clear 0mm)
        res_clear = get_guest_weather_experience(
            rainfall_override=0.0,
            temperature_override=28.0,
            condition_override="Clear Sky",
        )
        assert res_clear.high_outdoor_impact is False, "Expected false for clear weather"
        print("[OK] Clear weather condition verified")

    finally:
        db.close()

def test_api_endpoint():
    # Test GET /api/weather/guest-experience with simulated rainfall
    resp = client.get("/api/weather/guest-experience?rainfall=18.0&temperature=25.0")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert data["high_outdoor_impact"] is True
    assert "Heavy rain may affect outdoor activities." in data["alert_message"]
    assert len(data["indoor_experiences"]) >= 3
    print("[OK] GET /api/weather/guest-experience endpoint verified")

if __name__ == "__main__":
    test_weather_guest_experience_service()
    test_api_endpoint()
    print("All weather guest experience tests passed!")
