"""FastAPI routes for the Wealth domain."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ...db import get_db
from ...schemas.auth_dependencies import get_current_authorized_user
from ...schemas.wealth import (
    AccountCreate,
    AccountImportSummary,
    AccountOut,
    AccountUpdate,
    DecisionCreate,
    DecisionOut,
    DecisionUpdate,
    FireScenarioCreate,
    FireScenarioOut,
    FireScenarioUpdate,
    PersonProfileCreate,
    PersonProfileOut,
    PersonProfileUpdate,
    SnapshotCreate,
    SnapshotOut,
    TaxCalculatorComputeOut,
    TaxCalculatorConfigOut,
    TaxCalculatorInput,
)
from ...services import wealth_service

router = APIRouter(
    prefix="/wealth",
    tags=["wealth"],
    dependencies=[Depends(get_current_authorized_user)],
)

# Public router for endpoints that do not require authentication
public_router = APIRouter(
    prefix="/wealth",
    tags=["wealth"],
)


# ── Accounts ───────────────────────────────────────────────────────────────────

@router.get("/accounts", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db)):
    return wealth_service.list_accounts(db)


@router.get("/accounts/{account_id}", response_model=AccountOut)
def get_account(account_id: str, db: Session = Depends(get_db)):
    account = wealth_service.get_account(db, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.post("/accounts", response_model=AccountOut, status_code=201)
def create_account(data: AccountCreate, db: Session = Depends(get_db)):
    try:
        return wealth_service.create_account(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/accounts/import", response_model=AccountImportSummary)
async def import_accounts(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a .csv file")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded CSV file is empty")
    return wealth_service.import_accounts_from_csv(db, content)


@router.patch("/accounts/{account_id}", response_model=AccountOut)
def update_account(account_id: str, data: AccountUpdate, db: Session = Depends(get_db)):
    try:
        account = wealth_service.update_account(db, account_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.delete("/accounts", status_code=204)
def delete_all_accounts(db: Session = Depends(get_db)):
    wealth_service.delete_all_accounts(db)


@router.delete("/accounts/{account_id}", status_code=204)
def delete_account(account_id: str, db: Session = Depends(get_db)):
    if not wealth_service.delete_account(db, account_id):
        raise HTTPException(status_code=404, detail="Account not found")


# ── Snapshots ──────────────────────────────────────────────────────────────────

@router.get("/snapshots", response_model=list[SnapshotOut])
def list_snapshots(db: Session = Depends(get_db)):
    return wealth_service.list_snapshots(db)


@router.get("/snapshots/{snapshot_id}", response_model=SnapshotOut)
def get_snapshot(snapshot_id: str, db: Session = Depends(get_db)):
    snapshot = wealth_service.get_snapshot(db, snapshot_id)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return snapshot


@router.post("/snapshots", response_model=SnapshotOut, status_code=201)
def create_snapshot(data: SnapshotCreate, db: Session = Depends(get_db)):
    try:
        return wealth_service.create_snapshot(db, data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/snapshots/{snapshot_id}", status_code=204)
def delete_snapshot(snapshot_id: str, db: Session = Depends(get_db)):
    if not wealth_service.delete_snapshot(db, snapshot_id):
        raise HTTPException(status_code=404, detail="Snapshot not found")


# ── FIRE Scenarios ─────────────────────────────────────────────────────────────

@router.get("/fire-scenarios", response_model=list[FireScenarioOut])
def list_fire_scenarios(db: Session = Depends(get_db)):
    return wealth_service.list_fire_scenarios(db)


@router.get("/fire-scenarios/{scenario_id}", response_model=FireScenarioOut)
def get_fire_scenario(scenario_id: str, db: Session = Depends(get_db)):
    scenario = wealth_service.get_fire_scenario(db, scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="FIRE scenario not found")
    return scenario


@router.post("/fire-scenarios", response_model=FireScenarioOut, status_code=201)
def create_fire_scenario(data: FireScenarioCreate, db: Session = Depends(get_db)):
    return wealth_service.create_fire_scenario(db, data)


@router.patch("/fire-scenarios/{scenario_id}", response_model=FireScenarioOut)
def update_fire_scenario(scenario_id: str, data: FireScenarioUpdate, db: Session = Depends(get_db)):
    scenario = wealth_service.update_fire_scenario(db, scenario_id, data)
    if not scenario:
        raise HTTPException(status_code=404, detail="FIRE scenario not found")
    return scenario


@router.delete("/fire-scenarios/{scenario_id}", status_code=204)
def delete_fire_scenario(scenario_id: str, db: Session = Depends(get_db)):
    if not wealth_service.delete_fire_scenario(db, scenario_id):
        raise HTTPException(status_code=404, detail="FIRE scenario not found")


# ── Decisions ──────────────────────────────────────────────────────────────────

@router.get("/decisions", response_model=list[DecisionOut])
def list_decisions(db: Session = Depends(get_db)):
    return wealth_service.list_decisions(db)


@router.get("/decisions/{decision_id}", response_model=DecisionOut)
def get_decision(decision_id: str, db: Session = Depends(get_db)):
    decision = wealth_service.get_decision(db, decision_id)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    return decision


@router.post("/decisions", response_model=DecisionOut, status_code=201)
def create_decision(data: DecisionCreate, db: Session = Depends(get_db)):
    return wealth_service.create_decision(db, data)


@router.patch("/decisions/{decision_id}", response_model=DecisionOut)
def update_decision(decision_id: str, data: DecisionUpdate, db: Session = Depends(get_db)):
    decision = wealth_service.update_decision(db, decision_id, data)
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")
    return decision


@router.delete("/decisions/{decision_id}", status_code=204)
def delete_decision(decision_id: str, db: Session = Depends(get_db)):
    if not wealth_service.delete_decision(db, decision_id):
        raise HTTPException(status_code=404, detail="Decision not found")


# ── Person Profiles ───────────────────────────────────────────────────────────

@router.get("/persons", response_model=list[PersonProfileOut])
def list_person_profiles(
    current_user_id: str = Depends(get_current_authorized_user),
    db: Session = Depends(get_db),
):
    return wealth_service.list_person_profiles(db, current_user_id)


@router.get("/persons/{profile_id}", response_model=PersonProfileOut)
def get_person_profile(
    profile_id: str,
    current_user_id: str = Depends(get_current_authorized_user),
    db: Session = Depends(get_db),
):
    profile = wealth_service.get_person_profile(db, current_user_id, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Person profile not found")
    return profile


@router.post("/persons", response_model=PersonProfileOut, status_code=201)
def create_person_profile(
    data: PersonProfileCreate,
    current_user_id: str = Depends(get_current_authorized_user),
    db: Session = Depends(get_db),
):
    return wealth_service.create_person_profile(db, current_user_id, data)


@router.patch("/persons/{profile_id}", response_model=PersonProfileOut)
def update_person_profile(
    profile_id: str,
    data: PersonProfileUpdate,
    current_user_id: str = Depends(get_current_authorized_user),
    db: Session = Depends(get_db),
):
    profile = wealth_service.update_person_profile(db, current_user_id, profile_id, data)
    if not profile:
        raise HTTPException(status_code=404, detail="Person profile not found")
    return profile


@router.delete("/persons/{profile_id}", status_code=204)
def delete_person_profile(
    profile_id: str,
    current_user_id: str = Depends(get_current_authorized_user),
    db: Session = Depends(get_db),
):
    try:
        deleted = wealth_service.delete_person_profile(db, current_user_id, profile_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="Person profile not found")


# ── Investment Tax Calculator (public – no authentication required) ──────────

@public_router.get("/tax-calculator/config", response_model=TaxCalculatorConfigOut)
def get_tax_calculator_config():
    return wealth_service.get_tax_calculator_config()


@public_router.post("/tax-calculator/compute", response_model=TaxCalculatorComputeOut)
def compute_tax_calculator(data: TaxCalculatorInput):
    return wealth_service.compute_tax_calculator(data)
