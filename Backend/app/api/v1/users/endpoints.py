from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from app.api.v1.users.dependencies import UserQueryParams, get_user_service
from app.core.rate_limiter import limiter
from app.models.user import UserCreate, UserResponse, UserUpdate
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users / Customers"])


class PaginatedUserResponse(BaseModel):
    items: List[UserResponse]
    total: int
    skip: int
    limit: int


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new customer",
    description="Creates a new customer user profile and generates a unique loyalty QR code if not provided."
)
@limiter.limit("30/minute")
def create_user(
    request: Request,
    user_in: UserCreate,
    service: UserService = Depends(get_user_service)
):
    return service.create_user(user_in)


@router.get(
    "/",
    response_model=PaginatedUserResponse,
    summary="List and search customers",
    description="Retrieve a paginated list of customers with optional search filtering across name, email, and loyalty code."
)
@limiter.limit("60/minute")
def list_users(
    request: Request,
    params: UserQueryParams = Depends(),
    service: UserService = Depends(get_user_service)
):
    items, total = service.get_users(
        skip=params.skip,
        limit=params.limit,
        search=params.search,
        active_only=params.active_only
    )
    return PaginatedUserResponse(
        items=items,
        total=total,
        skip=params.skip,
        limit=params.limit
    )


@router.get(
    "/loyalty/{loyalty_code}",
    response_model=UserResponse,
    summary="Scan QR / Lookup by Loyalty Code",
    description="Retrieve customer profile by their unique loyalty code or scanned QR code value. Ideal for POS scanners in cash registers."
)
@limiter.limit("120/minute")
def get_user_by_loyalty_code(
    request: Request,
    loyalty_code: str,
    service: UserService = Depends(get_user_service)
):
    return service.get_user_by_loyalty_code(loyalty_code)


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get customer by ID",
    description="Retrieve full details for a single customer by their UUID."
)
@limiter.limit("60/minute")
def get_user_by_id(
    request: Request,
    user_id: str,
    service: UserService = Depends(get_user_service)
):
    return service.get_user_by_id(user_id)


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update customer profile",
    description="Update personal information, email, or phone number for an existing customer."
)
@limiter.limit("30/minute")
def update_user(
    request: Request,
    user_id: str,
    user_update: UserUpdate,
    service: UserService = Depends(get_user_service)
):
    return service.update_user(user_id, user_update)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate or delete customer",
    description="Deactivates a customer profile (soft delete by default). Set hard_delete=true to remove permanently."
)
@limiter.limit("20/minute")
def delete_user(
    request: Request,
    user_id: str,
    hard_delete: bool = False,
    service: UserService = Depends(get_user_service)
):
    service.delete_user(user_id, soft_delete=not hard_delete)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
