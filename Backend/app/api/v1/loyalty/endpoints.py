from typing import List
from fastapi import APIRouter, status, UploadFile, File, Form, HTTPException

from app.models.loyalty import (
    PointsRuleCreate, PointsRuleUpdate, PointsRuleResponse,
    WalletSettingUpdate, WalletSettingResponse,
    StampLevelCreate, StampLevelResponse
)
from app.services.loyalty_service import loyalty_service
from app.services.imgbb_service import imgbb_service

router = APIRouter(prefix="/loyalty", tags=["Loyalty Config"])

# --- Points Rules ---
@router.get("/rules", response_model=List[PointsRuleResponse])
def get_points_rules():
    return loyalty_service.get_points_rules()

@router.post("/rules", response_model=PointsRuleResponse, status_code=status.HTTP_201_CREATED)
def create_points_rule(rule_data: PointsRuleCreate):
    return loyalty_service.create_points_rule(rule_data)

@router.post("/rules/weekly", response_model=List[PointsRuleResponse])
def save_weekly_rules(rules: List[dict]):
    return loyalty_service.save_weekly_rules(rules)

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

@router.post("/wallet/broadcast")
def broadcast_wallet_notification(body: dict):
    from app.services.google_wallet_service import google_wallet_service
    header = body.get("header") or "¡Oferta Especial!"
    msg_body = body.get("body") or "Aprovecha nuestras promociones exclusivas en la cafetería."
    return google_wallet_service.broadcast_push_notification(header, msg_body)

@router.get("/wallet/daily-promo-status")
def get_daily_promo_status():
    from app.services.daily_notification_service import daily_notification_service
    return daily_notification_service.get_status()

@router.post("/wallet/trigger-daily-promo")
def trigger_daily_promo_now():
    from app.services.daily_notification_service import daily_notification_service
    return daily_notification_service.send_daily_promo(is_manual=True)


# --- Stamp Levels ---
@router.get("/stamp-levels", response_model=List[StampLevelResponse])
def get_stamp_levels():
    return loyalty_service.get_stamp_levels()

@router.post("/stamp-levels", response_model=StampLevelResponse)
def create_or_update_stamp_level(level_data: StampLevelCreate):
    return loyalty_service.create_or_update_stamp_level(level_data)

@router.post("/stamp-levels/upload-image")
async def upload_stamp_image(
    file: UploadFile = File(...),
    stamp_count: int = Form(...)
):
    """Upload stamp image directly to ImgBB and update the stamp configuration."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser una imagen válida (PNG, JPG, WebP)."
        )

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La imagen no debe superar los 10 MB."
        )

    res = imgbb_service.upload_file(
        file_content=contents,
        filename=file.filename or f"stamp_{stamp_count}.png",
        content_type=file.content_type or "image/png"
    )

    image_url = res.get("imagen_url")
    if not image_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo subir la imagen a ImgBB."
        )

    updated_level = loyalty_service.create_or_update_stamp_level(
        StampLevelCreate(
            nivel_sello=stamp_count,
            imagen_url=image_url,
            nombre_sello=f"{stamp_count} Sello(s)" if stamp_count > 0 else "Estado Inicial (0 Sellos)",
            descripcion_beneficio=f"Tarjeta con {stamp_count} sellos"
        )
    )

    return {
        "success": True,
        "stamp_count": stamp_count,
        "imagen_url": image_url,
        "source": res.get("source"),
        "level": updated_level
    }

@router.delete("/stamp-levels/{nivel_sello}", status_code=status.HTTP_200_OK)
def delete_stamp_level(nivel_sello: int):
    return loyalty_service.delete_stamp_level(nivel_sello)
