from typing import List, Optional
from fastapi import HTTPException, status
from supabase import Client

from app.db.supabase import get_supabase_client
from app.models.loyalty import (
    PointsRuleCreate, PointsRuleUpdate,
    WalletSettingUpdate,
    StampLevelCreate, StampLevelUpdate
)

from app.services.user_service import handle_supabase_error

class LoyaltyService:
    def __init__(self, db: Optional[Client] = None):
        self._db = db

    @property
    def db(self) -> Client:
        if self._db is None:
            self._db = get_supabase_client()
        return self._db

    # --- Points Rules ---
    def get_points_rules(self) -> List[dict]:
        try:
            res = self.db.table("points_rules").select("*").execute()
            return res.data if res.data else []
        except Exception as e:
            return []

    def create_points_rule(self, rule_data: PointsRuleCreate) -> dict:
        data = rule_data.model_dump(exclude_unset=True)
        try:
            res = self.db.table("points_rules").insert(data).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            handle_supabase_error(e)
        raise HTTPException(status_code=500, detail="Failed to create rule")

    def update_points_rule(self, rule_id: str, rule_data: PointsRuleUpdate) -> dict:
        data = rule_data.model_dump(exclude_unset=True)
        try:
            res = self.db.table("points_rules").update(data).eq("id", rule_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        raise HTTPException(status_code=404, detail="Rule not found")

    def delete_points_rule(self, rule_id: str) -> dict:
        self.db.table("points_rules").delete().eq("id", rule_id).execute()
        return {"message": "Regla eliminada exitosamente"}

    # --- Wallet Settings ---
    def get_wallet_settings(self) -> dict:
        res = self.db.table("wallet_settings").select("*").limit(1).execute()
        if res.data:
            return res.data[0]
        return {"max_sellos": 10, "is_active": True}

    def update_wallet_settings(self, settings_data: WalletSettingUpdate) -> dict:
        data = settings_data.model_dump(exclude_unset=True)
        res_check = self.db.table("wallet_settings").select("id").limit(1).execute()
        if res_check.data:
            id_to_update = res_check.data[0]["id"]
            res = self.db.table("wallet_settings").update(data).eq("id", id_to_update).execute()
            if res.data:
                return res.data[0]
        else:
            # Insert if it doesn't exist
            res = self.db.table("wallet_settings").insert(data).execute()
            if res.data:
                return res.data[0]
        raise HTTPException(status_code=500, detail="Failed to update settings")

    # --- Stamp Images ---
    def get_stamp_levels(self) -> List[dict]:
        res = self.db.table("stamp_images").select("*").order("stamp_count").execute()
        return res.data if res.data else []

    def create_or_update_stamp_level(self, level_data: StampLevelCreate) -> dict:
        data = level_data.model_dump(exclude_unset=True)
        # Check if exists
        check = self.db.table("stamp_images").select("*").eq("stamp_count", data["nivel_sello"]).execute()
        if check.data:
            # Update
            res = self.db.table("stamp_images").update({"image_url": data["imagen_url"], "wallet_hero_url": data["imagen_url"]}).eq("stamp_count", data["nivel_sello"]).execute()
            return res.data[0]
        else:
            # Insert
            res = self.db.table("stamp_images").insert({
                "stamp_count": data["nivel_sello"],
                "image_url": data["imagen_url"],
                "wallet_hero_url": data["imagen_url"]
            }).execute()
            return res.data[0]

    def delete_stamp_level(self, nivel_sello: int) -> dict:
        self.db.table("stamp_images").delete().eq("stamp_count", nivel_sello).execute()
        return {"message": "Nivel de sello eliminado"}

loyalty_service = LoyaltyService()
