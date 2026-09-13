import random
import string
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from supabase import Client

from app.db.supabase import get_supabase_client
from app.models.user import UserCreate, UserUpdate


def generate_loyalty_code(prefix: str = "CAF-") -> str:
    """Generate a unique 6-character alphanumeric loyalty code with prefix."""
    random_str = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"{prefix}{random_str}"


from postgrest.exceptions import APIError


def handle_supabase_error(e: Exception):
    """Format Supabase API errors into clear HTTP exceptions."""
    if isinstance(e, APIError) or "Invalid API key" in str(e):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Clave API de Supabase inválida. Por favor actualiza SUPABASE_KEY en Backend/.env con tu clave 'anon' o 'service_role' de Supabase."
        )
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Error en la base de datos Supabase: {str(e)}"
    )


class UserService:
    def __init__(self, db: Optional[Client] = None):
        self._db = db

    @property
    def db(self) -> Client:
        if self._db is None:
            self._db = get_supabase_client()
        return self._db

    def create_user(self, user_in: UserCreate) -> dict:
        """Create a new customer user record in Supabase."""
        try:
            # Check if email already exists
            existing_email = (
                self.db.table("users")
                .select("id")
                .eq("email", user_in.email)
                .execute()
            )
        except Exception as e:
            handle_supabase_error(e)

        if existing_email.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with email '{user_in.email}' already exists."
            )

        # Handle loyalty code generation/validation
        loyalty_code = user_in.loyalty_code
        if loyalty_code:
            existing_code = (
                self.db.table("users")
                .select("id")
                .eq("loyalty_code", loyalty_code)
                .execute()
            )
            if existing_code.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Loyalty code '{loyalty_code}' is already assigned to another user."
                )
        else:
            # Auto-generate unique loyalty code
            attempts = 0
            while attempts < 10:
                candidate_code = generate_loyalty_code()
                existing = (
                    self.db.table("users")
                    .select("id")
                    .eq("loyalty_code", candidate_code)
                    .execute()
                )
                if not existing.data:
                    loyalty_code = candidate_code
                    break
                attempts += 1
            if not loyalty_code:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to generate a unique loyalty code. Please try again."
                )

        payload = {
            "first_name": user_in.first_name,
            "last_name": user_in.last_name,
            "email": user_in.email,
            "phone": user_in.phone,
            "loyalty_code": loyalty_code,
            "current_points": 0,
            "total_points_earned": 0,
            "total_points_spent": 0,
            "total_purchases_count": 0,
            "is_active": True,
        }

        res = self.db.table("users").insert(payload).execute()
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user in database."
            )
        return res.data[0]

    def get_users(
        self,
        skip: int = 0,
        limit: int = 50,
        search: Optional[str] = None,
        active_only: bool = True
    ) -> Tuple[List[dict], int]:
        """Fetch list of users with pagination and search query."""
        try:
            query = self.db.table("users").select("*", count="exact")

            if active_only:
                query = query.eq("is_active", True)

            if search:
                search_pattern = f"%{search}%"
                # Supabase PostgREST OR filter across fields
                query = query.or_(
                    f"first_name.ilike.{search_pattern},"
                    f"last_name.ilike.{search_pattern},"
                    f"email.ilike.{search_pattern},"
                    f"loyalty_code.ilike.{search_pattern}"
                )

            query = query.order("created_at", desc=True).range(skip, skip + limit - 1)
            res = query.execute()
            total_count = res.count if res.count is not None else len(res.data)
            return res.data, total_count
        except Exception as e:
            handle_supabase_error(e)

    def get_user_by_id(self, user_id: str) -> dict:
        """Fetch single user by UUID."""
        try:
            res = self.db.table("users").select("*").eq("id", user_id).execute()
            if not res.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"User with ID '{user_id}' not found."
                )
            return res.data[0]
        except HTTPException:
            raise
        except Exception as e:
            handle_supabase_error(e)

    def get_user_by_loyalty_code(self, loyalty_code: str) -> dict:
        """Fetch single user by unique loyalty / QR code."""
        try:
            res = (
                self.db.table("users")
                .select("*")
                .eq("loyalty_code", loyalty_code.strip())
                .execute()
            )
            if not res.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"User with loyalty code '{loyalty_code}' not found."
                )
            return res.data[0]
        except HTTPException:
            raise
        except Exception as e:
            handle_supabase_error(e)


    def update_user(self, user_id: str, user_update: UserUpdate) -> dict:
        """Update customer user profile information."""
        # Ensure user exists
        existing_user = self.get_user_by_id(user_id)

        update_data = user_update.model_dump(exclude_unset=True)
        if not update_data:
            return existing_user

        # If updating email, check for conflicts
        if "email" in update_data and update_data["email"] != existing_user["email"]:
            conflict = (
                self.db.table("users")
                .select("id")
                .eq("email", update_data["email"])
                .neq("id", user_id)
                .execute()
            )
            if conflict.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Email '{update_data['email']}' is already in use by another user."
                )

        res = (
            self.db.table("users")
            .update(update_data)
            .eq("id", user_id)
            .execute()
        )
        if not res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user."
            )
        return res.data[0]

    def delete_user(self, user_id: str, soft_delete: bool = True) -> bool:
        """Deactivate or remove customer user."""
        self.get_user_by_id(user_id)  # Ensure exists

        if soft_delete:
            res = (
                self.db.table("users")
                .update({"is_active": False})
                .eq("id", user_id)
                .execute()
            )
        else:
            res = self.db.table("users").delete().eq("id", user_id).execute()

        return True


user_service = UserService()
