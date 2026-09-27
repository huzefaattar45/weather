from pydantic import BaseModel, Field
from typing import List, Optional

class PublicSignal(BaseModel):
    id: str = Field(..., description="Unique signal identifier")
    source: str = Field(..., description="Reliable public source name")
    summary: str = Field(..., description="Normalized report summary")
    timestamp: str = Field(..., description="ISO 8601 timestamp of signal")
    relevance: str = Field(..., description="Relevance level: HIGH, MEDIUM, LOW")
    impact_type: str = Field(
        ...,
        description="Type of impact: weather, travel_disruption, flooding, road_conditions, traveler_reports"
    )
    location_reference: Optional[str] = Field(None, description="Nearby road, junction or zone")
    verified: bool = Field(default=True, description="Whether signal is cross-verified")

class PublicSignalsResponse(BaseModel):
    signals: List[PublicSignal] = Field(default_factory=list)
    total_signals: int = Field(..., description="Count of active public signals")
    primary_source: str = Field(..., description="Primary public source provider")
    last_updated: str = Field(..., description="ISO timestamp of last synchronization")
    context_advice: str = Field(..., description="Contextual advice for Digital Twin operations")
