from typing import Optional
from fastapi import Query
from app.services.user_service import UserService, user_service


class UserQueryParams:
    def __init__(
        self,
        skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
        limit: int = Query(50, ge=1, le=100, description="Maximum number of records to return"),
        search: Optional[str] = Query(None, description="Search term for name, email, or loyalty code"),
        active_only: bool = Query(True, description="Filter active customers only"),
    ):
        self.skip = skip
        self.limit = limit
        self.search = search
        self.active_only = active_only


def get_user_service() -> UserService:
    return user_service
