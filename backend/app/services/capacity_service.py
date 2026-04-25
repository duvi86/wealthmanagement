"""Service layer for capacity RAG contract."""

import math
from datetime import datetime

from ..schemas.capacity import CapacityInput, CapacityResult


def calculate_capacity(input_payload: CapacityInput) -> CapacityResult:
    """Calculate initiative capacity RAG from provided payload.

    Args:
        input_payload: Typed initiative payload.

    Returns:
        Capacity result with RAG state and risk flag.
    """
    if not input_payload.milestone_date:
        return CapacityResult(rag_status=None, at_risk=False)

    try:
        target = datetime.fromisoformat(input_payload.milestone_date.replace("Z", "+00:00"))
    except ValueError:
        return CapacityResult(rag_status=None, at_risk=False)

    days_to_milestone = (target - datetime.now(target.tzinfo)).days
    if days_to_milestone <= 0:
        return CapacityResult(rag_status="red", at_risk=True)

    fte_points = int((input_payload.fte_next_milestone or 0.0) * 8)
    owner_points = input_payload.story_points_owner or 0
    support_points = sum(input_payload.story_points_supporting.values())

    if fte_points > 0 and (owner_points > 0 or support_points > 0):
        sprints_to_milestone = max(1, math.ceil(days_to_milestone / 10))
        total_capacity = (owner_points + support_points) * sprints_to_milestone
        if total_capacity <= 0:
            return CapacityResult(rag_status="red", at_risk=True)

        utilization = (fte_points / total_capacity) * 100
        if utilization <= 85:
            return CapacityResult(rag_status="green", at_risk=False)
        if utilization <= 100:
            return CapacityResult(rag_status="amber", at_risk=True)
        return CapacityResult(rag_status="red", at_risk=True)

    if days_to_milestone <= 5:
        return CapacityResult(rag_status="red", at_risk=True)
    if days_to_milestone <= 10:
        return CapacityResult(rag_status="amber", at_risk=True)
    return CapacityResult(rag_status="green", at_risk=False)
