from typing import List
from fastapi import APIRouter, status

from app.models.loyalty import (
    PointsRuleCreate, PointsRuleUpdate, PointsRuleResponse,
    WalletSettingUpdate, WalletSettingResponse,
    StampLevelCreate, StampLevelResponse
)
from app.services.loyalty_service import loyalty_service

router = APIRouter(prefix="/loyalty", tags=["Loyalty Config"])

# --- Points Rules ---
@router.get("/rules", response_model=List[PointsRuleResponse])
def get_points_rules():
    return loyalty_service.get_points_rules()

@router.post("/rules", response_model=PointsRuleResponse, status_code=status.HTTP_201_CREATED)
def create_points_rule(rule_data: PointsRuleCreate):
    return loyalty_service.create_points_rule(rule_data)

@router.put("/rules/{rule_id}", response_model=PointsRuleResponse)
def update_points_rule(rule_id: str, rule_data: PointsRuleUpdate):
    return loyalty_service.update_points_rule(rule_id, rule_data)

@router.delete("/rules/{rule_id}", status_code=status.HTTP_200_OK)
def delete_points_rule(rule_id: str):
    return loyalty_service.delete_points_rule(rule_id)

# --- Wallet Settings ---
@router.get("/settings", response_model=WalletSettingResponse)
def get_wallet_settings():
    return loyalty_service.get_wallet_settings()

@router.put("/settings", response_model=WalletSettingResponse)
def update_wallet_settings(settings_data: WalletSettingUpdate):
    return loyalty_service.update_wallet_settings(settings_data)

# --- Stamp Levels ---
@router.get("/stamp-levels", response_model=List[StampLevelResponse])
def get_stamp_levels():
    return loyalty_service.get_stamp_levels()

@router.post("/stamp-levels", response_model=StampLevelResponse)
def create_or_update_stamp_level(level_data: StampLevelCreate):
    return loyalty_service.create_or_update_stamp_level(level_data)

@router.delete("/stamp-levels/{nivel_sello}", status_code=status.HTTP_200_OK)
def delete_stamp_level(nivel_sello: int):
    return loyalty_service.delete_stamp_level(nivel_sello)
