import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from backend.main import app
from backend.services.public_signals_service import get_public_signals

client = TestClient(app)

def test_public_signals_normalization():
    # 1. Test unit service with heavy rain (flooding scenario)
    res = get_public_signals(rainfall_override=20.0, temperature_override=24.0)
    assert res.total_signals > 0, "Expected signals to be generated"
    assert res.primary_source != "", "Primary source must be defined"
    
    # Check normalization of every signal
    found_required_example = False
    for sig in res.signals:
        assert sig.source, f"Signal {sig.id} missing source"
        assert sig.summary, f"Signal {sig.id} missing summary"
        assert sig.timestamp, f"Signal {sig.id} missing timestamp"
        assert sig.relevance in ("HIGH", "MEDIUM", "LOW"), f"Invalid relevance: {sig.relevance}"
        assert sig.impact_type in (
            "weather",
            "travel_disruption",
            "flooding",
            "road_conditions",
            "traveler_reports",
        ), f"Invalid impact_type: {sig.impact_type}"

        if sig.summary == "Multiple public reports indicate waterlogging near the resort access route.":
            found_required_example = True

    assert found_required_example, "Required example 'Multiple public reports indicate waterlogging near the resort access route.' was not found!"
    print("[OK] Normalization & exact example verified for heavy rain scenario")

def test_public_signals_endpoints():
    # 2. Test GET /api/digital-twin/public-signals
    resp = client.get("/api/digital-twin/public-signals?rainfall=25.0")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
    data = resp.json()
    assert "signals" in data
    assert any(
        s["summary"] == "Multiple public reports indicate waterlogging near the resort access route."
        for s in data["signals"]
    )
    print("[OK] GET /api/digital-twin/public-signals returns normalized signals")

    # 3. Test GET /api/public-signals
    resp2 = client.get("/api/public-signals")
    assert resp2.status_code == 200, f"Expected 200, got {resp2.status_code}"
    data2 = resp2.json()
    assert "signals" in data2
    print("[OK] GET /api/public-signals endpoint works")

    # 4. Test POST /api/digital-twin/simulate includes public_signals
    sim_resp = client.post(
        "/api/digital-twin/simulate",
        json={"rainfall": 18.0, "temperature": 24.0, "duration_hours": 3.0},
    )
    assert sim_resp.status_code == 200, f"Expected 200, got {sim_resp.status_code}"
    sim_data = sim_resp.json()
    assert "public_signals" in sim_data, "public_signals missing from simulation response"
    assert sim_data["public_signals"] is not None
    assert any(
        s["summary"] == "Multiple public reports indicate waterlogging near the resort access route."
        for s in sim_data["public_signals"]["signals"]
    )
    print("[OK] Digital Twin simulation dynamically attaches contextual public signals")

if __name__ == "__main__":
    test_public_signals_normalization()
    test_public_signals_endpoints()
    print("All Real-World Public Signal tests passed successfully!")
