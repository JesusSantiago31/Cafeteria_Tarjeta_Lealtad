from fastapi import APIRouter, Depends, Request
from app.api.v1.users.dependencies import get_user_service
from app.core.rate_limiter import limiter
from app.models.wallet import GoogleWalletPassResponse
from app.services.google_wallet_service import google_wallet_service
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Google Wallet Integration"])


@router.get(
    "/{user_id}/wallet/google",
    response_model=GoogleWalletPassResponse,
    summary="Generate Google Wallet Loyalty Pass link",
    description="Generates an official signed 'Save to Google Wallet' URL with customer name, current points balance, and scanned QR loyalty barcode."
)
@limiter.limit("30/minute")
def generate_google_wallet_pass_by_id(
    request: Request,
    user_id: str,
    user_svc: UserService = Depends(get_user_service)
):
    user = None
    try:
        user = user_svc.get_user_by_id(user_id)
    except Exception:
        try:
            user = user_svc.get_user_by_loyalty_code(user_id)
        except Exception:
            pass

    if not user:
        user = {
            "id": user_id,
            "first_name": "Cliente",
            "last_name": "Gourmet",
            "email": f"{user_id}@cliente.cafeteria.com",
            "phone": user_id,
            "loyalty_code": user_id,
            "current_points": 0,
            "total_points_earned": 0,
            "total_purchases_count": 0
        }

    return google_wallet_service.generate_pass_for_user(user)


@router.get(
    "/loyalty/{loyalty_code}/wallet/google",
    response_model=GoogleWalletPassResponse,
    summary="Generate Google Wallet Pass by Loyalty Code",
    description="Generates Google Wallet Pass link directly using customer's unique loyalty code."
)
@limiter.limit("30/minute")
def generate_google_wallet_pass_by_loyalty_code(
    request: Request,
    loyalty_code: str,
    user_svc: UserService = Depends(get_user_service)
):
    user = None
    try:
        user = user_svc.get_user_by_loyalty_code(loyalty_code)
    except Exception:
        try:
            user = user_svc.get_user_by_id(loyalty_code)
        except Exception:
            pass

    if not user:
        user = {
            "id": loyalty_code,
            "first_name": "Cliente",
            "last_name": "Gourmet",
            "email": f"{loyalty_code}@cliente.cafeteria.com",
            "phone": loyalty_code,
            "loyalty_code": loyalty_code,
            "current_points": 0,
            "total_points_earned": 0,
            "total_purchases_count": 0
        }

    return google_wallet_service.generate_pass_for_user(user)

