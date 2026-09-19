from typing import List
from fastapi import APIRouter, Request, status

from app.core.rate_limiter import limiter
from app.models.product import ProductResponse, RedemptionRequest
from app.services.product_service import product_service

router = APIRouter(prefix="/products", tags=["Products & Rewards"])


@router.get(
    "/",
    response_model=List[ProductResponse],
    summary="List available reward products",
    description="Retrieve catalog of products available for points redemption."
)
@limiter.limit("60/minute")
def list_products(request: Request):
    return product_service.get_products()


@router.post(
    "/redeem",
    summary="Redeem product reward using points",
    description="Redeem a product using customer loyalty points. Deducts points and records a REDEMPTION transaction."
)
@limiter.limit("30/minute")
def redeem_product(request: Request, body: RedemptionRequest):
    return product_service.redeem_product(str(body.user_id), str(body.product_id))
