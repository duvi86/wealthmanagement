"""Service layer for OKR domain contracts.

Phase 2 uses in-memory sample data to lock API contracts before Postgres
integration in Phase 3.
"""

from copy import deepcopy

from ..schemas.okr import OkrStructureResponse

_SAMPLE_OKR = OkrStructureResponse(
    objectives=[
        {
            "id": 1,
            "title": "Improve operational reliability",
            "department": "Platform",
            "progress": 62,
            "key_wins": ["Incident response playbook rolled out"],
            "key_results": [
                {
                    "id": 101,
                    "title": "Reduce P1 incident count",
                    "description": "Bring quarterly P1 count below target",
                    "progress": 58,
                    "from_value": 20,
                    "to_value": 8,
                    "current_value": 12,
                    "unit_type": "count",
                    "initiatives": [
                        {
                            "id": "i-1001",
                            "title": "Service ownership matrix",
                            "owner_id": 11,
                            "main_responsible_id": 11,
                            "support_team_ids": [13, 14],
                            "fte_effort": 1.5,
                            "status": "in_progress",
                            "priority": "high",
                            "story_points_owner": 18,
                            "story_points_supporting": {"13": 8, "14": 5},
                        }
                    ],
                }
            ],
        }
    ]
)


def get_okr_structure() -> OkrStructureResponse:
    """Return nested OKR structure response contract.

    Returns:
        Deep-copied sample structure for stable contract responses.
    """
    return deepcopy(_SAMPLE_OKR)
