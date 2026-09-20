from typing import List, Optional
from fastapi import APIRouter, Request, status, UploadFile, File, HTTPException

from app.core.rate_limiter import limiter
from app.models.product import ProductResponse, ProductCreate, ProductUpdate, RedemptionRequest
from app.services.product_service import product_service
from app.services.google_drive_service import google_drive_service

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
    "/",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new reward product",
    description="Add a new reward product to the catalog."
)
@limiter.limit("30/minute")
def create_product(request: Request, body: ProductCreate):
    return product_service.create_product(body)


@router.put(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Update a reward product",
    description="Modify an existing reward product by ID."
)
@limiter.limit("30/minute")
def update_product(request: Request, product_id: str, body: ProductUpdate):
    return product_service.update_product(product_id, body)


@router.delete(
    "/{product_id}",
    summary="Delete a reward product",
    description="Remove a reward product from the catalog by ID."
)
@limiter.limit("30/minute")
def delete_product(request: Request, product_id: str):
    return product_service.delete_product(product_id)


@router.post(
    "/upload-image",
    summary="Upload reward product image to Google Drive",
    description="Upload an image file directly to the Google Drive shared folder and return the public image URL."
)
@limiter.limit("30/minute")
async def upload_product_image(request: Request, file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser una imagen (JPG, PNG, WebP, etc)."
        )
    
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # Max 10MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La imagen no debe superar los 10 MB."
        )

    res = google_drive_service.upload_file(
        file_content=contents,
        filename=file.filename or "reward_image.jpg",
        content_type=file.content_type or "image/jpeg"
    )

    return res


@router.post(
    "/redeem",
    summary="Redeem product reward using points",
    description="Redeem a product using customer loyalty points. Deducts points and records a REDEMPTION transaction."
)
@limiter.limit("30/minute")
def redeem_product(request: Request, body: RedemptionRequest):
    return product_service.redeem_product(str(body.user_id), str(body.product_id))
