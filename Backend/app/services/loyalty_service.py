import os
import json
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
    DEFAULT_WEEKLY_RULES = [
        {"id": "rule-1", "dia_semana": 1, "dia_nombre": "Lunes", "monto_dinero": 500.0, "puntos_otorgados": 50, "descripcion": "Lunes de Energía: Bonificación de 50 pts por cada $500", "is_active": True},
        {"id": "rule-2", "dia_semana": 2, "dia_nombre": "Martes", "monto_dinero": 300.0, "puntos_otorgados": 40, "descripcion": "Martes Gourmet: Bonificación de 40 pts por cada $300", "is_active": True},
        {"id": "rule-3", "dia_semana": 3, "dia_nombre": "Miércoles", "monto_dinero": 200.0, "puntos_otorgados": 25, "descripcion": "Miércoles Mitad de Semana: Bonificación de 25 pts por cada $200", "is_active": True},
        {"id": "rule-4", "dia_semana": 4, "dia_nombre": "Jueves", "monto_dinero": 250.0, "puntos_otorgados": 30, "descripcion": "Jueves Especial: Bonificación de 30 pts por cada $250", "is_active": True},
        {"id": "rule-5", "dia_semana": 5, "dia_nombre": "Viernes", "monto_dinero": 350.0, "puntos_otorgados": 45, "descripcion": "Viernes de Celebración: Bonificación de 45 pts por cada $350", "is_active": True},
        {"id": "rule-6", "dia_semana": 6, "dia_nombre": "Sábado", "monto_dinero": 400.0, "puntos_otorgados": 50, "descripcion": "Sábado Dulce: Bonificación de 50 pts por cada $400", "is_active": True},
        {"id": "rule-7", "dia_semana": 7, "dia_nombre": "Domingo", "monto_dinero": 300.0, "puntos_otorgados": 35, "descripcion": "Domingo Familiar: Bonificación de 35 pts por cada $300", "is_active": True},
    ]

    def _get_tenant_id(self) -> Optional[str]:
        """Defensively resolve tenant_id if required by database constraints."""
        try:
            tenants_res = self.db.table("tenants").select("id").limit(1).execute()
            if tenants_res.data and len(tenants_res.data) > 0:
                return str(tenants_res.data[0].get("id"))
        except Exception:
            pass
        return None

    def get_points_rules(self) -> List[dict]:
        try:
            res = self.db.table("points_rules").select("*").execute()
            if res.data and len(res.data) > 0:
                # Ordenar: primero los días 1..7 si tienen dia_semana, y al final la regla por defecto
                rules = list(res.data)
                # Sort placing dia_semana (1..7) first, and None at the end or top
                def sort_key(r):
                    d = r.get("dia_semana")
                    return (1, d) if d is not None else (0, 0)
                rules.sort(key=sort_key)
                return rules
        except Exception as e:
            print(f"[LoyaltyService] Error reading points_rules: {e}")

        return self.DEFAULT_WEEKLY_RULES

    def create_points_rule(self, rule_data: PointsRuleCreate) -> dict:
        data = rule_data.model_dump(exclude_unset=True)
        tenant_id = self._get_tenant_id()
        if tenant_id and "tenant_id" not in data:
            data["tenant_id"] = tenant_id
        try:
            res = self.db.table("points_rules").insert(data).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            handle_supabase_error(e)
        raise HTTPException(status_code=500, detail="Failed to create rule")

    def update_points_rule(self, rule_id: str, rule_data: PointsRuleUpdate) -> dict:
        data = rule_data.model_dump(exclude_unset=True)
        tenant_id = self._get_tenant_id()
        if tenant_id and "tenant_id" not in data:
            data["tenant_id"] = tenant_id
        try:
            res = self.db.table("points_rules").update(data).eq("id", rule_id).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        
        # Local fallback if using mock ID
        for r in self.DEFAULT_WEEKLY_RULES:
            if str(r.get("id")) == str(rule_id):
                r.update(data)
                return r

        raise HTTPException(status_code=404, detail="Rule not found")

    def save_weekly_rules(self, rules: List[dict]) -> List[dict]:
        """Bulk update/upsert rules for all 7 days of the week plus default base rule."""
        tenant_id = self._get_tenant_id()
        saved_rules = []

        for r in rules:
            r_data = dict(r)
            clean_data = {}
            for k in ["dia_semana", "dia_nombre", "monto_dinero", "puntos_otorgados", "descripcion", "is_active"]:
                if k in r_data:
                    clean_data[k] = r_data[k]

            if tenant_id and "tenant_id" not in clean_data:
                clean_data["tenant_id"] = tenant_id

            r_id = r_data.get("id")
            try:
                # 1. Update by UUID if provided and valid
                if r_id and not str(r_id).startswith("rule-"):
                    upd = self.db.table("points_rules").update(clean_data).eq("id", r_id).execute()
                    if upd.data and len(upd.data) > 0:
                        saved_rules.append(upd.data[0])
                        continue

                # 2. Check by dia_semana
                dia = clean_data.get("dia_semana")
                if dia is not None and dia > 0:
                    chk = self.db.table("points_rules").select("id").eq("dia_semana", dia).execute()
                    if chk.data and len(chk.data) > 0:
                        existing_id = chk.data[0]["id"]
                        upd = self.db.table("points_rules").update(clean_data).eq("id", existing_id).execute()
                        if upd.data and len(upd.data) > 0:
                            saved_rules.append(upd.data[0])
                            continue
                else:
                    # Regla por defecto (dia_semana is null)
                    chk = self.db.table("points_rules").select("id").is_("dia_semana", "null").execute()
                    if chk.data and len(chk.data) > 0:
                        existing_id = chk.data[0]["id"]
                        upd = self.db.table("points_rules").update(clean_data).eq("id", existing_id).execute()
                        if upd.data and len(upd.data) > 0:
                            saved_rules.append(upd.data[0])
                            continue

                # 3. Otherwise Insert
                ins = self.db.table("points_rules").insert(clean_data).execute()
                if ins.data and len(ins.data) > 0:
                    saved_rules.append(ins.data[0])
            except Exception as e:
                print(f"[LoyaltyService] Error saving points rule: {e}")

        # Return refreshed list from database
        return self.get_points_rules()

    def delete_points_rule(self, rule_id: str) -> dict:
        try:
            self.db.table("points_rules").delete().eq("id", rule_id).execute()
        except Exception:
            pass
        return {"message": "Regla eliminada exitosamente"}

    # --- Wallet Settings ---
    _SETTINGS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "wallet_settings.json")

    def get_wallet_settings(self) -> dict:
        default_settings = {
            "max_sellos": 10,
            "dias_caducidad_puntos": 90,
            "recompensa_sellos_descripcion": "Bebida de cortesía a elegir",
            "instagram_url": "https://instagram.com/cafeteria",
            "facebook_url": "https://facebook.com/cafeteria",
            "terminos_url": "https://cafeteria.com/terminos",
            "is_active": True
        }
        # 1. Try Supabase
        try:
            res = self.db.table("wallet_settings").select("*").limit(1).execute()
            if res.data and len(res.data) > 0:
                merged = {**default_settings, **res.data[0]}
                return merged
        except Exception:
            pass

        # 2. Try persistent file fallback
        try:
            if os.path.exists(self._SETTINGS_FILE):
                with open(self._SETTINGS_FILE, "r", encoding="utf-8") as f:
                    file_data = json.load(f)
                    if isinstance(file_data, dict):
                        return {**default_settings, **file_data}
        except Exception as e:
            print(f"[LoyaltyService] Error reading settings file: {e}")

        return default_settings

    def update_wallet_settings(self, settings_data: WalletSettingUpdate) -> dict:
        data = settings_data.model_dump(exclude_unset=True)
        current = self.get_wallet_settings()
        merged = {**current, **data}

        # 1. Always save to local persistent file so changes never revert on page refresh
        try:
            os.makedirs(os.path.dirname(os.path.abspath(self._SETTINGS_FILE)), exist_ok=True)
            with open(self._SETTINGS_FILE, "w", encoding="utf-8") as f:
                json.dump(merged, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[LoyaltyService] Error writing settings file: {e}")

        # 2. Also attempt to save to Supabase
        try:
            res_check = self.db.table("wallet_settings").select("id").limit(1).execute()
            if res_check.data and len(res_check.data) > 0:
                id_to_update = res_check.data[0]["id"]
                res = self.db.table("wallet_settings").update(data).eq("id", id_to_update).execute()
                if res.data and len(res.data) > 0:
                    return {**merged, **res.data[0]}
            else:
                res = self.db.table("wallet_settings").insert(data).execute()
                if res.data and len(res.data) > 0:
                    return {**merged, **res.data[0]}
        except Exception as e:
            print(f"[LoyaltyService] Note: Supabase wallet_settings sync warning (saved locally): {e}")

        return merged


    # --- Stamp Images ---
    def get_stamp_levels(self) -> List[dict]:
        try:
            res = self.db.table("stamp_images").select("*").order("stamp_count").execute()
            return res.data if res.data else []
        except Exception as e:
            print(f"[LoyaltyService] Error fetching stamp_images: {e}")
            return []

    def create_or_update_stamp_level(self, level_data: StampLevelCreate) -> dict:
        data = level_data.model_dump(exclude_unset=True)
        count = data.get("stamp_count") if data.get("stamp_count") is not None else data.get("nivel_sello", 0)
        url = data.get("image_url") or data.get("imagen_url") or ""

        try:
            # Check if exists
            check = self.db.table("stamp_images").select("*").eq("stamp_count", count).execute()
            if check.data:
                # Update
                res = self.db.table("stamp_images").update({
                    "image_url": url,
                    "wallet_hero_url": url
                }).eq("stamp_count", count).execute()
                if res.data:
                    return res.data[0]
            else:
                # Insert
                res = self.db.table("stamp_images").insert({
                    "stamp_count": count,
                    "image_url": url,
                    "wallet_hero_url": url,
                    "nombre_sello": f"{count} Sello(s)"
                }).execute()
                if res.data:
                    return res.data[0]
        except Exception as e:
            handle_supabase_error(e)

        return {"stamp_count": count, "image_url": url, "wallet_hero_url": url}

    def delete_stamp_level(self, nivel_sello: int) -> dict:
        self.db.table("stamp_images").delete().eq("stamp_count", nivel_sello).execute()
        return {"message": "Nivel de sello eliminado"}

loyalty_service = LoyaltyService()
