"""
Digital Twin Simulation Service — Smart Resort 360
===================================================
Simulates the operational impact of weather scenarios on resort dynamics:
- Occupancy & guest count
- Outdoor activity demand
- Dining / F&B demand
- Spa & indoor wellness demand
- Guest request & complaint volume
- Additional staff requirements
- Operational impact severity

SAFETY GUARANTEE:
This simulation engine is strictly read-only regarding database records.
It NEVER modifies:
- real bookings
- real guest records
- staff records
- actual operational tasks/complaints
All simulation state is computed in-memory and returned statelessly.
"""

import math
import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
import numpy as np

from backend.schemas.digital_twin import (
    DigitalTwinSimulationRequest,
    DigitalTwinSimulationResponse,
    DigitalTwinIntegrations,
    ActivitiesIntegration,
    AffectedActivity,
    IndoorActivityAlternative,
    DiningIntegration,
    StaffingIntegration,
    StaffDepartmentBreakdown,
    GuestExperienceIntegration,
    IndoorExperience,
    WeatherNotificationPreview,
    GeospatialLocationImpact,
)
from backend.models.room import Room
from backend.models.staff import Staff
from backend.models.booking import Booking
from backend.services.ml_service import predict_demand_forecast
from backend.services.weather_service import classify_weather_severity
from backend.services.public_signals_service import get_public_signals


def simulate_digital_twin(
    payload: DigitalTwinSimulationRequest,
    db: Session,
) -> DigitalTwinSimulationResponse:
    """
    Run a lightweight, deterministic, and explainable Digital Twin simulation
    for a given weather scenario.
    """
    # ── 1. READ-ONLY BASELINE CONTEXT ──────────────────────────────────────────
    # Query room inventory and real-time occupancy (READ-ONLY)
    total_rooms = db.query(Room).count()
    if total_rooms == 0:
        total_rooms = 20  # Smart Resort 360 standard demo capacity

    occupied_rooms_count = db.query(Room).filter(Room.status == "occupied").count()
    
    # Active confirmed bookings today
    today_date = datetime.date.today()
    try:
        active_bookings = (
            db.query(Booking)
            .filter(
                Booking.status == "confirmed",
                Booking.check_in <= today_date,
                Booking.check_out >= today_date,
            )
            .count()
        )
    except Exception:
        active_bookings = 0

    # Determine baseline occupancy percentage
    if payload.current_occupancy is not None:
        occupancy_pct = float(payload.current_occupancy)
        occupancy_source = "User-specified override"
    elif occupied_rooms_count > 0:
        occupancy_pct = round((occupied_rooms_count / total_rooms) * 100.0, 1)
        occupancy_source = f"Live room inventory ({occupied_rooms_count}/{total_rooms} occupied)"
    elif active_bookings > 0:
        occupancy_pct = min(100.0, round((active_bookings / total_rooms) * 100.0, 1))
        occupancy_source = f"Confirmed bookings ({active_bookings}/{total_rooms} rooms)"
    else:
        # Default baseline resort occupancy (75% typical occupancy)
        occupancy_pct = 75.0
        occupancy_source = "Resort historical baseline average (75%)"

    # Query baseline staff available (READ-ONLY)
    available_staff_count = db.query(Staff).filter(Staff.available == True).count()
    if available_staff_count == 0:
        available_staff_count = max(1, db.query(Staff).count())
    if available_staff_count == 0:
        available_staff_count = 8  # Standard shift roster

    # ── 2. ML DEMAND FORECAST INTEGRATION ────────────────────────────────────
    # Leverage existing demand forecaster module for baseline macro demand
    try:
        demand_forecast = predict_demand_forecast(today_date)
        baseline_predicted_demand = (
            demand_forecast.forecast[0].predicted_demand
            if demand_forecast and demand_forecast.forecast
            else 95
        )
    except Exception:
        baseline_predicted_demand = 95

    # Estimated active in-house guests (avg 1.8 guests per occupied room)
    estimated_guests = max(5, int(round((total_rooms * (occupancy_pct / 100.0)) * 1.8)))

    # ── 3. EXTRACT INPUTS ───────────────────────────────────────────────────
    try:
        rainfall = max(0.0, float(payload.rainfall)) if payload.rainfall is not None and not math.isnan(float(payload.rainfall)) else 0.0
    except (TypeError, ValueError):
        rainfall = 0.0

    try:
        temperature = float(payload.temperature) if payload.temperature is not None and not math.isnan(float(payload.temperature)) else 25.0
    except (TypeError, ValueError):
        temperature = 25.0

    try:
        raw_dur = payload.duration_hours if payload.duration_hours is not None else getattr(payload, "duration", 3.0)
        duration_hours = max(0.1, float(raw_dur)) if raw_dur is not None and not math.isnan(float(raw_dur)) else 3.0
    except (TypeError, ValueError):
        duration_hours = 3.0

    try:
        humidity = float(payload.humidity) if payload.humidity is not None and not math.isnan(float(payload.humidity)) else 68.0
    except (TypeError, ValueError):
        humidity = 68.0

    try:
        raw_wind = payload.wind if payload.wind is not None else getattr(payload, "wind_speed", 12.0)
        wind = max(0.0, float(raw_wind)) if raw_wind is not None and not math.isnan(float(raw_wind)) else 12.0
    except (TypeError, ValueError):
        wind = 12.0

    day_of_week = int(payload.day_of_week) if payload.day_of_week is not None else today_date.weekday()
    is_weekend = day_of_week in (4, 5, 6)  # Fri, Sat, Sun

    # ── 4. DIGITAL TWIN BEHAVIORAL MODEL ────────────────────────────────────
    # 4.1 Outdoor Activity Demand
    # Base: 85% on clear comfortable days (+5% weekend boost)
    base_outdoor = 90.0 if is_weekend else 85.0

    # Temperature impact
    temp_penalty = 0.0
    if temperature >= 40.0:
        temp_penalty = 35.0  # Extreme heat discourages outdoor exposure
    elif temperature >= 35.0:
        temp_penalty = 15.0
    elif temperature <= 10.0:
        temp_penalty = 30.0
    elif temperature <= 18.0:
        temp_penalty = 12.0

    # Wind impact
    wind_penalty = 0.0
    if wind >= 50.0:
        wind_penalty = 40.0
    elif wind >= 30.0:
        wind_penalty = 20.0
    elif wind >= 20.0:
        wind_penalty = 8.0

    # Rain impact (dominant driver)
    rain_penalty = 0.0
    if rainfall >= 25.0:
        rain_penalty = 90.0  # Torrential rain shutters pool, water sports, garden
    elif rainfall >= 15.0:
        rain_penalty = 75.0  # Heavy rain closes outdoor venues
    elif rainfall >= 5.0:
        rain_penalty = 50.0  # Moderate rain dampens outdoor activities
    elif rainfall >= 1.0:
        rain_penalty = 28.0  # Light rain curtails sunbathing and lawn sports
    elif rainfall > 0.0:
        rain_penalty = 12.0  # Drizzle

    # Duration amplification: prolonged rain locks guests indoors
    duration_factor = min(1.3, 1.0 + (max(0.0, duration_hours - 2.0) * 0.05))
    if rainfall > 0.5:
        total_outdoor_penalty = (rain_penalty + wind_penalty + temp_penalty) * duration_factor
    else:
        total_outdoor_penalty = temp_penalty + wind_penalty

    outdoor_activity_demand = max(0.0, min(100.0, round(base_outdoor - total_outdoor_penalty, 1)))

    # 4.2 Dining Demand
    # Base dining demand on property: ~55% (guests often explore external restaurants on nice days)
    base_dining = 55.0
    # When rain occurs, guests cannot eat outdoors or go off-resort, driving indoor dining & room service
    dining_surge = 0.0
    if rainfall >= 20.0:
        dining_surge = 38.0
    elif rainfall >= 10.0:
        dining_surge = 28.0
    elif rainfall >= 2.0:
        dining_surge = 18.0
    elif rainfall > 0.0:
        dining_surge = 8.0

    # Extended event duration keeps guests on-property through meal windows
    duration_dining_boost = min(10.0, duration_hours * 1.5)

    dining_demand = max(
        15.0,
        min(100.0, round(base_dining + dining_surge + duration_dining_boost, 1)),
    )

    # 4.3 Spa Demand
    # Base indoor spa demand: ~35% on sunny days
    base_spa = 35.0
    # When outdoor activities collapse, spa and wellness are the primary leisure alternative
    spa_surge = 0.0
    if rainfall >= 15.0:
        spa_surge = 52.0  # Spa bookings surge near capacity
    elif rainfall >= 5.0:
        spa_surge = 38.0
    elif rainfall >= 1.0:
        spa_surge = 22.0
    elif rainfall > 0.0:
        spa_surge = 10.0

    # Chilly weather adds to thermal / hot stone / steam spa appeal
    if temperature < 22.0:
        spa_surge += 8.0

    # Duration factor: long rain events lead to spa appointment bookings
    duration_spa_boost = min(12.0, (duration_hours - 1.0) * 2.0) if duration_hours > 1.0 else 0.0

    spa_demand = max(10.0, min(100.0, round(base_spa + spa_surge + duration_spa_boost, 1)))

    # 4.4 Guest Request & Complaint Volume
    # Baseline requests: combination of resort facility operations and resident guest calls
    base_facility_rate = 1.0  # requests/hr across public areas, reception, maintenance
    base_guest_rate = (estimated_guests / 6.0)
    base_requests_for_event = (base_facility_rate + base_guest_rate) * duration_hours

    # Weather friction multiplier:
    # - Towel/umbrella requests, room leaks, balcony drainage, slip hazard warnings, in-room delivery calls
    weather_friction = 1.0
    if rainfall >= 25.0:
        weather_friction = 3.4  # Torrential rain creates high maintenance & room requests
    elif rainfall >= 15.0:
        weather_friction = 2.6  # Heavy rain creates significant service demand
    elif rainfall >= 5.0:
        weather_friction = 1.8  # Moderate rain
    elif rainfall >= 1.0:
        weather_friction = 1.3  # Light rain (umbrellas, towels)

    if wind >= 40.0:
        weather_friction += 0.4  # High wind issues

    guest_request_volume = max(1, int(round(base_requests_for_event * weather_friction)))

    # 4.5 Additional Staff Requirement
    # Computed from operational deficit over baseline roster:
    # - F&B runner requirement (when dining demand > 75%)
    # - Maintenance & housekeeping surge (when requests > standard threshold)
    # - Spa therapists & front desk triage
    additional_staff = 0
    if dining_demand >= 85.0:
        additional_staff += 2
    elif dining_demand >= 72.0:
        additional_staff += 1

    if spa_demand >= 80.0:
        additional_staff += 1

    extra_requests = max(0, guest_request_volume - int(round(base_requests_for_event)))
    maintenance_staff_needed = int(math.ceil(extra_requests / 6.0)) if extra_requests > 0 else 0
    additional_staff += maintenance_staff_needed

    # In safe, normal conditions with zero rain and mild temp: no extra staff
    if rainfall < 0.5 and wind < 25.0 and 18.0 <= temperature <= 32.0:
        additional_staff = 0

    # 4.6 Operational Impact Severity
    # Correlate with weather severity classification engine
    weather_condition_str = (
        "Torrential Downpour" if rainfall >= 35.0
        else "Heavy Rain" if rainfall >= 15.0
        else "Rain Showers" if rainfall >= 2.0
        else "Light Drizzle" if rainfall > 0.0
        else "Clear"
    )
    weather_sev, weather_reason = classify_weather_severity(
        rainfall=rainfall,
        temperature=temperature,
        wind=wind,
        condition=weather_condition_str,
    )

    # Escalate if staff deficit is high
    impact_severity = weather_sev
    if additional_staff >= 5 and impact_severity not in ("EXTREME",):
        impact_severity = "HIGH"

    # ── 5. EXPLAINABLE RATIONALES ───────────────────────────────────────────
    explanation = {
        "occupancy": f"Resort operating at {occupancy_pct:.1f}% occupancy ({occupancy_source}); estimated {estimated_guests} on-property guests.",
        "outdoor_activity_demand": (
            f"Outdoor activity demand projected at {outdoor_activity_demand:.1f}%. "
            + (
                f"Severe suppression (-{total_outdoor_penalty:.1f}%) due to {rainfall:.1f} mm rain and {duration_hours:.1f}h event duration."
                if rainfall >= 1.0
                else f"Optimal conditions support full outdoor recreation."
            )
        ),
        "dining_demand": (
            f"Dining & F&B demand projected at {dining_demand:.1f}%. "
            + (
                f"Indoor migration surge (+{dining_surge:.1f}%) driven by weather confinement over {duration_hours:.1f} hours."
                if dining_surge > 0
                else "Baseline dining patterns distributed across resort and external venues."
            )
        ),
        "spa_demand": (
            f"Spa & wellness demand projected at {spa_demand:.1f}%. "
            + (
                f"Surge (+{spa_surge:.1f}%) as guests substitute outdoor activities with indoor wellness."
                if spa_surge > 0
                else "Normal baseline wellness booking pace."
            )
        ),
        "guest_request_volume": (
            f"Simulated {guest_request_volume} total guest requests (friction multiplier: {weather_friction:.1f}x) "
            f"covering in-room dining, housekeeping towels, umbrellas, and weather maintenance."
        ),
        "additional_staff_requirement": (
            f"+{additional_staff} additional staff required above current on-duty roster ({available_staff_count} available) "
            f"to absorb food delivery surges and maintenance triage."
            if additional_staff > 0
            else f"Current on-duty roster of {available_staff_count} staff is sufficient to maintain standard SLAs."
        ),
        "impact_severity": f"{impact_severity}: {weather_reason}",
    }

    metadata = {
        "model": "DigitalTwin-SmartResort360-v1",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "input_rainfall_mm": rainfall,
        "input_temperature_c": temperature,
        "input_duration_hours": duration_hours,
        "input_wind_kmh": wind,
        "input_humidity_pct": humidity,
        "active_rooms_total": total_rooms,
        "active_rooms_occupied": occupied_rooms_count,
        "estimated_in_house_guests": estimated_guests,
        "macro_demand_forecast_anchor": baseline_predicted_demand,
        "state_safety_guarantee": "Strictly zero state mutations performed on production database.",
    }

    # ── 6. CONNECTED RESORT MODULE INTEGRATIONS (SIMULATION ONLY) ───────────
    is_heavy = rainfall >= 5.0 or wind >= 35.0 or impact_severity in ("MODERATE", "HIGH", "EXTREME")

    # 6.1 Activities Module Integration
    if is_heavy or rainfall >= 1.0:
        affected_activities = [
            AffectedActivity(
                name="Sunset Beach Volleyball & Lawn Games",
                venue="South Beachfront",
                status="Suspended",
                reason=f"High winds & waterlogged sand ({rainfall:.1f} mm rain)",
                impact_level="High" if rainfall >= 10.0 else "Medium",
            ),
            AffectedActivity(
                name="Infinity Pool & Open-Air Cabanas",
                venue="Central Pool Deck",
                status="Suspended",
                reason="Precipitation hazard, lightning safety protocol & wet slippery deck",
                impact_level="High",
            ),
            AffectedActivity(
                name="Coastal Kayaking & Snorkeling Excursion",
                venue="Resort Marina",
                status="Suspended",
                reason="Choppy surf conditions and poor visibility",
                impact_level="High",
            ),
            AffectedActivity(
                name="Lawn Tennis & Pickleball Clinics",
                venue="North Sports Courts",
                status="Suspended",
                reason="Court surface drenched and unsafe for active play",
                impact_level="Medium",
            ),
            AffectedActivity(
                name="Garden Sunrise Yoga & Breathwork",
                venue="Zen Herb Garden",
                status="Relocated",
                reason="Relocated to covered Celestial Atrium Pavilion Studio",
                impact_level="Low",
            ),
        ]
    else:
        affected_activities = [
            AffectedActivity(
                name="All Outdoor Facilities & Pools",
                venue="Beach & Pools",
                status="Operational",
                reason="Optimal weather conditions for all scheduled activities",
                impact_level="Low",
            )
        ]

    indoor_alternatives = [
        IndoorActivityAlternative(
            name="Covered Heated Hydrotherapy Pool & Jacuzzi",
            venue="Wellness Wing",
            suitable_for="All Resident Guests",
            status="Open Walk-In",
            highlights="Heated vitality pool at 34°C with hydro-massage jets",
        ),
        IndoorActivityAlternative(
            name="Indoor Squash & Badminton Arena",
            venue="Sports Pavilion Level 1",
            suitable_for="Active Guests & Teens",
            status="Open (Equipment Provided)",
            highlights="Air-conditioned hardwood courts with tournament racquets",
        ),
        IndoorActivityAlternative(
            name="Celestial Cinema Screening Lounge",
            venue="Clubhouse Suite B",
            suitable_for="Families & Kids",
            status="Open (Continuous Screening)",
            highlights="Comfort lounge screening curated family films & fresh popcorn",
        ),
        IndoorActivityAlternative(
            name="Billiards & Board Game Parlour",
            venue="The Palm Lounge",
            suitable_for="Adults & Couples",
            status="Open Walk-In",
            highlights="Artisan board games, vintage chess, and fireside beverages",
        ),
    ]

    activities_summary = (
        f"{len([a for a in affected_activities if a.status != 'Operational'])} outdoor activities suspended or relocated due to {rainfall:.1f} mm rain. 4 climate-controlled indoor recreation alternatives activated."
        if is_heavy or rainfall >= 1.0
        else "All outdoor resort activities operating normally with full schedule."
    )

    activities_integration = ActivitiesIntegration(
        affected_outdoor_activities=affected_activities,
        suggested_indoor_alternatives=indoor_alternatives,
        summary=activities_summary,
    )

    # 6.2 Dining Module Integration
    baseline_dining_pct = 55.0
    predicted_increase_pct = max(0.0, round(dining_demand - baseline_dining_pct, 1))
    in_room_surge = dining_demand >= 75.0 or rainfall >= 8.0
    estimated_covers = max(10, int(round((estimated_guests * (dining_demand / 100.0)) * 1.3)))
    dining_venues = [
        "The Spice Pavilion (Indoor Main Dining — +35% seating surge expected)",
        "Celestial In-Room Dining Service (Fast-track meal delivery activated)",
        "Coastal Grill & Bar (Outdoor patio closed; indoor cocktail lounge open)",
    ]
    dining_op_rec = (
        f"Anticipating +{predicted_increase_pct}% dining demand surge. Pre-stage 2 extra in-room delivery runners, activate warming carts, and set up hot spiced tea stations in the lobby."
        if in_room_surge
        else "Dining volume projected within standard operational parameters."
    )

    dining_integration = DiningIntegration(
        baseline_demand_pct=baseline_dining_pct,
        simulated_demand_pct=dining_demand,
        predicted_increase_pct=predicted_increase_pct,
        in_room_dining_surge=in_room_surge,
        estimated_covers=estimated_covers,
        impacted_venues=dining_venues,
        operational_recommendation=dining_op_rec,
    )

    # 6.3 Staffing Module Integration
    dept_available_map = {}
    for s in db.query(Staff).all():
        dept = s.department or "General"
        if dept not in dept_available_map:
            dept_available_map[dept] = 0
        if s.available:
            dept_available_map[dept] += 1

    if additional_staff > 0:
        kitchen_extra = min(additional_staff, max(1, math.ceil(additional_staff * 0.35)))
        hk_extra = min(additional_staff - kitchen_extra, max(1, math.ceil(additional_staff * 0.35)))
        rem = additional_staff - kitchen_extra - hk_extra
        maint_extra = max(0, min(rem, math.ceil(rem * 0.6)))
        fd_extra = max(0, rem - maint_extra)
        allocated = kitchen_extra + hk_extra + maint_extra + fd_extra
        if allocated < additional_staff:
            hk_extra += (additional_staff - allocated)
    else:
        kitchen_extra = hk_extra = maint_extra = fd_extra = 0

    dept_breakdowns = [
        StaffDepartmentBreakdown(
            department="Kitchen / Food & Beverage",
            current_available=dept_available_map.get("Kitchen", 2),
            additional_required=kitchen_extra,
            primary_task="In-room dining delivery runners & hot beverage station",
        ),
        StaffDepartmentBreakdown(
            department="Housekeeping & Guest Care",
            current_available=dept_available_map.get("Housekeeping", 4),
            additional_required=hk_extra,
            primary_task="Umbrella distribution, wet entryway drying & fresh towel replenishment",
        ),
        StaffDepartmentBreakdown(
            department="Maintenance & Facilities",
            current_available=dept_available_map.get("Maintenance", 4),
            additional_required=maint_extra,
            primary_task="Terrace drainage clearance, leak inspections & slip hazard mitigation",
        ),
        StaffDepartmentBreakdown(
            department="Front Desk & Concierge",
            current_available=dept_available_map.get("FrontDesk", 3),
            additional_required=fd_extra,
            primary_task="Guest phone triage, activity reschedule inquiries & indoor booking",
        ),
    ]

    staffing_rec = (
        f"+{additional_staff} additional staff recommended during simulated {duration_hours:.1f}h event. Maintain on-call standby without modifying live shift rosters."
        if additional_staff > 0
        else "Current shift roster has sufficient capacity to handle projected guest requests."
    )

    staffing_integration = StaffingIntegration(
        total_current_available=available_staff_count,
        total_additional_required=additional_staff,
        departments=dept_breakdowns,
        recommendation=staffing_rec,
    )

    # 6.4 Guest Experience Module Integration
    indoor_experiences = [
        IndoorExperience(
            title="Ayurvedic Monsoon Warm Herbal Therapy",
            category="Wellness & Spa",
            location="Celestial Spa Pavilion (Suites 1-4)",
            availability_status="Available (3 Private Suites Open)",
            duration="60 mins",
            description="Deeply warming sesame and camphor herbal oil therapy tailored for wet-weather relaxation.",
        ),
        IndoorExperience(
            title="Single-Estate Goan Tea & Chai Tasting",
            category="Culinary & Tasting",
            location="The Spice Pavilion Atrium",
            availability_status="Open Walk-In (Hosted every 30m)",
            duration="45 mins",
            description="Curated pairing of five local artisan teas with traditional freshly-baked Goan delicacies.",
        ),
        IndoorExperience(
            title="Indoor Mixology & Botanical Mocktail Workshop",
            category="Culinary & Tasting",
            location="The Palm Lounge Bar",
            availability_status="Available (6 Spots Reserved for In-House)",
            duration="45 mins",
            description="Interactive hands-on session crafting signature spices and tropical infusions.",
        ),
        IndoorExperience(
            title="Family Pottery & Terracotta Studio",
            category="Recreation & Arts",
            location="Creative Arts Studio (West Wing)",
            availability_status="Open Drop-In",
            duration="60 mins",
            description="Hands-on clay sculpting and traditional Goan tile painting under master artisan guidance.",
        ),
    ]

    guest_experience_integration = GuestExperienceIntegration(
        experiences=indoor_experiences,
        curation_rationale=(
            f"Curated indoor experiences mapped to current resort capacity, providing seamless leisure alternatives during simulated {rainfall:.1f} mm weather."
        ),
    )

    # 6.5 Weather Notification Recommendation
    notif_title = "Inclement Weather Advisory & Indoor Program" if rainfall >= 5.0 else "Daily Resort Weather Advisory"
    notif_urgency = "Urgent" if impact_severity in ("EXTREME", "CRITICAL") else ("Advisory" if rainfall >= 5.0 else "Information")
    notif_message = (
        f"Dear Guest, with rainfall of {rainfall:.1f} mm forecast across the resort over the next {duration_hours:.1f} hours, "
        f"outdoor pool and beach activities are temporarily paused for your comfort. "
        f"We invite you to experience our indoor alternatives: heated hydrotherapy at Celestial Spa, tea tastings at The Spice Pavilion, "
        f"and cozy games in The Palm Lounge. In-room dining and complimentary umbrellas are available by dialing 0."
    )

    notification_integration = WeatherNotificationPreview(
        title=notif_title,
        target_audience=f"All Resident Guests ({estimated_guests} In-House Guests across occupied rooms)",
        channel="Guest Mobile Portal App Notification & In-Room Smart Tablet Broadcast",
        preview_message=notif_message,
        urgency=notif_urgency,
        dispatch_advice="Simulation preview only — not broadcast to guests. Recommended to queue if simulation is approved.",
        is_simulation_only=True,
    )

    # 6.6 Geospatial Location Impact Mapping (Lightweight & Reliable)
    # 5 Key Locations with real coordinates around South Goa (15.2993, 74.1240)
    # Impact states strictly: LOW, MODERATE, HIGH
    resort_impact = (
        "HIGH" if rainfall >= 20.0 or impact_severity in ("HIGH", "EXTREME")
        else "MODERATE" if rainfall >= 5.0
        else "LOW"
    )
    pool_impact = (
        "HIGH" if rainfall >= 10.0 or wind >= 30.0
        else "MODERATE" if rainfall >= 2.0
        else "LOW"
    )
    restaurant_impact = (
        "HIGH" if dining_demand >= 85.0
        else "MODERATE" if dining_demand >= 70.0
        else "LOW"
    )
    spa_impact = (
        "HIGH" if spa_demand >= 80.0
        else "MODERATE" if spa_demand >= 55.0
        else "LOW"
    )
    outdoor_activity_impact = (
        "HIGH" if rainfall >= 8.0 or wind >= 28.0
        else "MODERATE" if rainfall >= 1.0
        else "LOW"
    )

    geospatial_locations = [
        GeospatialLocationImpact(
            id="resort",
            name="Smart Resort 360 (Main Complex & Reception)",
            category="resort",
            latitude=15.2993,
            longitude=74.1240,
            impact_state=resort_impact,
            status_label="Storm Contingency Protocol" if resort_impact == "HIGH" else ("Weather Advisory Active" if resort_impact == "MODERATE" else "Standard Operations"),
            weather_condition=f"{rainfall:.1f} mm rain · {wind:.1f} km/h wind",
            operational_action="Front desk guest triage active & lobby hot tea station" if resort_impact != "LOW" else "Standard reception operations",
            demand_or_capacity_pct=occupancy_pct,
        ),
        GeospatialLocationImpact(
            id="pool",
            name="Central Infinity Pool & Sun Deck",
            category="pool",
            latitude=15.2985,
            longitude=74.1235,
            impact_state=pool_impact,
            status_label="Pool Suspended & Closed" if pool_impact == "HIGH" else ("Caution: Wet Deck & Rain" if pool_impact == "MODERATE" else "Open for Swimming"),
            weather_condition="Precipitation safety hazard & slippery deck" if pool_impact != "LOW" else "Optimal conditions, water 28°C",
            operational_action="Deploy closure signage & redirect to covered hydrotherapy pool" if pool_impact == "HIGH" else ("Lifeguard weather alert active" if pool_impact == "MODERATE" else "Standard poolside service"),
            demand_or_capacity_pct=outdoor_activity_demand,
        ),
        GeospatialLocationImpact(
            id="restaurant",
            name="The Spice Pavilion & Dining Terrace",
            category="restaurant",
            latitude=15.2998,
            longitude=74.1246,
            impact_state=restaurant_impact,
            status_label="High Capacity Indoor Rush" if restaurant_impact == "HIGH" else ("Elevated Dining Demand" if restaurant_impact == "MODERATE" else "Standard Dining Pace"),
            weather_condition="Terrace closed; indoor migration surge" if restaurant_impact != "LOW" else "Outdoor patio open for al fresco dining",
            operational_action="Pre-stage room delivery carts and prepare hot soup/tea buffet" if restaurant_impact != "LOW" else "Standard table rotation",
            demand_or_capacity_pct=dining_demand,
        ),
        GeospatialLocationImpact(
            id="spa",
            name="Celestial Ayurvedic Spa & Wellness Wing",
            category="spa",
            latitude=15.3002,
            longitude=74.1232,
            impact_state=spa_impact,
            status_label="Surge: High Appointment Rush" if spa_impact == "HIGH" else ("Active Booking Inquiries" if spa_impact == "MODERATE" else "Standard Walk-In Pace"),
            weather_condition="Indoor warmth and relaxation substitution" if spa_impact != "LOW" else "Baseline wellness schedule",
            operational_action="Activate heated hydrotherapy suites & standby therapist calls" if spa_impact != "LOW" else "Standard spa reservations",
            demand_or_capacity_pct=spa_demand,
        ),
        GeospatialLocationImpact(
            id="outdoor_activity_area",
            name="South Beachfront & Outdoor Sports Lawn",
            category="outdoor activity area",
            latitude=15.2978,
            longitude=74.1228,
            impact_state=outdoor_activity_impact,
            status_label="All Outdoor Venues Suspended" if outdoor_activity_impact == "HIGH" else ("Partial Relocation to Covered Atrium" if outdoor_activity_impact == "MODERATE" else "All Activities Operational"),
            weather_condition="Waterlogged sand & drenched court surfaces" if outdoor_activity_impact == "HIGH" else ("Damp turf & light drizzle" if outdoor_activity_impact == "MODERATE" else "Sunny & calm lawn"),
            operational_action="Redirect guests to indoor squash, badminton & game lounge" if outdoor_activity_impact != "LOW" else "Standard tournament & coaching schedule",
            demand_or_capacity_pct=outdoor_activity_demand,
        ),
    ]

    digital_twin_integrations = DigitalTwinIntegrations(
        is_heavy_weather=is_heavy,
        weather_severity=impact_severity,
        activities=activities_integration,
        dining=dining_integration,
        staffing=staffing_integration,
        guest_experience=guest_experience_integration,
        notification=notification_integration,
        geospatial_locations=geospatial_locations,
    )

    # 6.7 Real-World Public Signals Integration (Lightweight Public Feeds)
    public_signals_res = get_public_signals(rainfall_override=rainfall, temperature_override=temperature)

    return DigitalTwinSimulationResponse(
        outdoor_activity_demand=outdoor_activity_demand,
        dining_demand=dining_demand,
        spa_demand=spa_demand,
        guest_request_volume=guest_request_volume,
        additional_staff_requirement=additional_staff,
        impact_severity=impact_severity,
        occupancy=occupancy_pct,
        explanation=explanation,
        simulation_metadata=metadata,
        integrations=digital_twin_integrations,
        public_signals=public_signals_res,
    )
