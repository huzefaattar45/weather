import os
import sys

_root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _root_dir not in sys.path:
    sys.path.insert(0, _root_dir)

from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal
from backend.models import Booking, User, Staff, Room, Complaint, Task

client = TestClient(app)

def test_digital_twin_normal_weather():
    payload = {
        "rainfall": 0.0,
        "temperature": 27.5,
        "duration_hours": 2.0,
        "wind": 10.0,
        "humidity": 60.0
    }
    response = client.post("/api/digital-twin/simulate", json=payload)
    assert response.status_code == 200, f"Simulation failed: {response.text}"
    data = response.json()

    # Verify all 6 mandatory output fields
    for field in [
        "outdoor_activity_demand",
        "dining_demand",
        "spa_demand",
        "guest_request_volume",
        "additional_staff_requirement",
        "impact_severity",
    ]:
        assert field in data, f"Missing output field: {field}"

    # Normal weather expectations
    assert data["outdoor_activity_demand"] >= 75.0, "Outdoor activity should remain high in normal weather"
    assert data["dining_demand"] <= 70.0, "Dining demand should remain at normal baseline"
    assert data["spa_demand"] <= 50.0, "Spa demand should remain at baseline"
    assert data["additional_staff_requirement"] == 0, "No extra staff needed under optimal weather"
    assert data["impact_severity"] == "LOW", f"Expected LOW severity, got {data['impact_severity']}"
    assert "occupancy" in data
    assert 0.0 <= data["occupancy"] <= 100.0


def test_digital_twin_light_rain():
    payload = {
        "rainfall": 3.5,
        "temperature": 24.0,
        "duration_hours": 3.0,
        "wind": 14.0,
        "humidity": 78.0
    }
    response = client.post("/api/digital-twin/simulate", json=payload)
    assert response.status_code == 200, f"Simulation failed: {response.text}"
    data = response.json()

    # Light rain expectations: moderate shift
    assert data["outdoor_activity_demand"] < 70.0, "Outdoor demand should drop during light rain"
    assert data["dining_demand"] > 60.0, "Dining demand should rise as guests move indoors"
    assert data["spa_demand"] > 50.0, "Spa demand should rise as guests seek indoor wellness"
    assert data["guest_request_volume"] > 0
    assert data["additional_staff_requirement"] in [1, 2], "Light rain should require 1-2 extra runners"
    assert data["impact_severity"] == "MODERATE", f"Expected MODERATE severity, got {data['impact_severity']}"


def test_digital_twin_heavy_rain():
    payload = {
        "rainfall": 26.0,
        "temperature": 21.0,
        "duration_hours": 5.0,
        "wind": 35.0,
        "humidity": 92.0
    }
    response = client.post("/api/digital-twin/simulate", json=payload)
    assert response.status_code == 200, f"Simulation failed: {response.text}"
    data = response.json()

    # Heavy rain expectations: severe disruption
    assert data["outdoor_activity_demand"] <= 20.0, "Outdoor activities should be mostly shut down"
    assert data["dining_demand"] >= 75.0, "Dining demand should surge near capacity"
    assert data["spa_demand"] >= 75.0, "Spa demand should surge significantly"
    assert data["guest_request_volume"] >= 12, "Service calls should increase significantly"
    assert data["additional_staff_requirement"] >= 3, "Heavy rain should require multiple extra staff members"
    assert data["impact_severity"] in ["HIGH", "EXTREME"], f"Expected HIGH or EXTREME severity, got {data['impact_severity']}"


def test_digital_twin_never_modifies_real_state():
    """
    CRITICAL SAFETY TEST:
    Verify that simulations NEVER modify:
    - real bookings
    - real guest / user records
    - staff records
    - actual operational tasks and complaints
    - room statuses
    """
    db = SessionLocal()
    try:
        # Capture baseline state before simulation
        bookings_before = db.query(Booking).count()
        users_before = db.query(User).count()
        staff_before = db.query(Staff).count()
        rooms_before = db.query(Room).count()
        complaints_before = db.query(Complaint).count()
        tasks_before = db.query(Task).count()

        staff_availabilities_before = [(s.id, s.available) for s in db.query(Staff).all()]
        room_statuses_before = [(r.id, r.status) for r in db.query(Room).all()]
    finally:
        db.close()

    # Execute multiple diverse simulations
    scenarios = [
        {"rainfall": 0.0, "temperature": 28.0, "duration_hours": 1.0},
        {"rainfall": 4.5, "temperature": 23.0, "duration_hours": 3.0},
        {"rainfall": 42.0, "temperature": 19.0, "duration_hours": 6.0},
    ]
    for sc in scenarios:
        res = client.post("/api/digital-twin/simulate", json=sc)
        assert res.status_code == 200

    # Verify baseline state is 100% UNCHANGED after simulations
    db = SessionLocal()
    try:
        assert db.query(Booking).count() == bookings_before, "Simulation modified real bookings count!"
        assert db.query(User).count() == users_before, "Simulation modified real user records!"
        assert db.query(Staff).count() == staff_before, "Simulation modified real staff count!"
        assert db.query(Room).count() == rooms_before, "Simulation modified real room count!"
        assert db.query(Complaint).count() == complaints_before, "Simulation created complaints!"
        assert db.query(Task).count() == tasks_before, "Simulation created tasks!"

        staff_availabilities_after = [(s.id, s.available) for s in db.query(Staff).all()]
        room_statuses_after = [(r.id, r.status) for r in db.query(Room).all()]

        assert staff_availabilities_after == staff_availabilities_before, "Simulation mutated staff availability!"
        assert room_statuses_after == room_statuses_before, "Simulation mutated room statuses!"
    finally:
        db.close()


def test_digital_twin_module_integrations_heavy_weather():
    """
    Verify connected module recommendations when heavy weather is simulated:
    - Activities: affected outdoor activities & indoor alternatives
    - Dining: predicted increase in dining demand
    - Staff: additional staffing requirement & department breakdown
    - Guest Experience: indoor experiences relevant to resort availability
    - Notifications: weather-related guest notification generated
    """
    payload = {
        "rainfall": 28.0,
        "temperature": 22.0,
        "duration_hours": 4.5,
        "wind": 38.0,
        "humidity": 94.0
    }
    response = client.post("/api/digital-twin/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "integrations" in data and data["integrations"] is not None, "Missing integrations block"
    integ = data["integrations"]

    assert integ["is_heavy_weather"] is True

    # 1. Activities
    act = integ["activities"]
    assert len(act["affected_outdoor_activities"]) >= 3, "Should list affected outdoor activities"
    assert len(act["suggested_indoor_alternatives"]) >= 3, "Should suggest indoor alternatives"
    assert any(a["status"] in ["Suspended", "Relocated"] for a in act["affected_outdoor_activities"])

    # 2. Dining
    dining = integ["dining"]
    assert dining["predicted_increase_pct"] > 0, "Dining should show predicted increase"
    assert dining["in_room_dining_surge"] is True, "Should flag in-room dining surge in heavy rain"
    assert len(dining["impacted_venues"]) > 0

    # 3. Staffing
    staff = integ["staffing"]
    assert staff["total_additional_required"] >= 3, "Staffing should require additional members"
    assert len(staff["departments"]) >= 3, "Should breakdown across departments"

    # 4. Guest Experience
    gx = integ["guest_experience"]
    assert len(gx["experiences"]) >= 3, "Should show indoor experiences"

    # 5. Notifications
    notif = integ["notification"]
    assert len(notif["title"]) > 0
    assert len(notif["preview_message"]) > 0
    assert notif["is_simulation_only"] is True

    # 6. Geospatial Locations
    geos = integ.get("geospatial_locations", [])
    assert len(geos) == 5, f"Expected 5 locations, got {len(geos)}"
    categories = [g["category"] for g in geos]
    for required_cat in ["resort", "pool", "restaurant", "spa", "outdoor activity area"]:
        assert required_cat in categories, f"Missing location category: {required_cat}"
    for g in geos:
        assert "latitude" in g and isinstance(g["latitude"], float)
        assert "longitude" in g and isinstance(g["longitude"], float)
        assert g["impact_state"] in ["LOW", "MODERATE", "HIGH"]



if __name__ == "__main__":
    test_digital_twin_normal_weather()
    test_digital_twin_light_rain()
    test_digital_twin_heavy_rain()
    test_digital_twin_never_modifies_real_state()
    test_digital_twin_module_integrations_heavy_weather()
    print("All digital twin tests including module integrations passed successfully!")
