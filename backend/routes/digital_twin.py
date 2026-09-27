from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.schemas.digital_twin import (
    DigitalTwinSimulationRequest,
    DigitalTwinSimulationResponse,
)
from backend.services.digital_twin_service import simulate_digital_twin

router = APIRouter(prefix="/api/digital-twin", tags=["digital-twin"])

@router.post("/simulate", response_model=DigitalTwinSimulationResponse)
def simulate_scenario(
    payload: DigitalTwinSimulationRequest,
    db: Session = Depends(get_db),
):
    """
    Digital Twin Simulation Endpoint.
    Models the operational impact of weather scenarios (rainfall, temperature, duration).
    Outputs:
    - outdoor_activity_demand
    - dining_demand
    - spa_demand
    - guest_request_volume
    - additional_staff_requirement
    - impact_severity
    - occupancy
    Guaranteed strictly read-only on database records.
    """
    return simulate_digital_twin(payload=payload, db=db)

from typing import Optional
from backend.schemas.public_signal import PublicSignalsResponse
from backend.services.public_signals_service import get_public_signals

@router.get("/public-signals", response_model=PublicSignalsResponse)
def fetch_public_signals(
    rainfall: Optional[float] = None,
    temperature: Optional[float] = None,
):
    """
    Real-World Public Signals Endpoint.
    Returns normalized signals across weather, travel disruption, flooding, road conditions, and traveler reports.
    """
    return get_public_signals(rainfall_override=rainfall, temperature_override=temperature)
