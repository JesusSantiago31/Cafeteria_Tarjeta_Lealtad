import uuid
from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from supabase import Client

from app.db.supabase import get_supabase_client
from app.services.user_service import handle_supabase_error, user_service
from app.models.product import ProductCreate, ProductUpdate

# Catalog items in case database table is not yet seeded
DEFAULT_PRODUCTS = [
    {
        "id_prod": "11111111-1111-1111-1111-111111111111",
        "producto": "Café Cappuccino",
        "precio": 55.00,
        "puntos_requeridos": 100,
        "piezas_disponibles": 4,
        "imagen_url": "/products/cappuccino.png",
        "created_at": "2026-09-13T10:00:00Z"
    },
    {
        "id_prod": "22222222-2222-2222-2222-222222222222",
        "producto": "Bagel de Jamón y Queso",
        "precio": 75.00,
        "puntos_requeridos": 150,
        "piezas_disponibles": 3,
        "imagen_url": "/products/bagel.svg",
        "created_at": "2026-09-13T10:00:00Z"
    },
    {
        "id_prod": "33333333-3333-3333-3333-333333333333",
        "producto": "Dona Glaseada",
        "precio": 35.00,
        "puntos_requeridos": 60,
        "piezas_disponibles": 12,
        "imagen_url": "/products/donut.svg",
        "created_at": "2026-09-13T10:00:00Z"
    },
    {
        "id_prod": "44444444-4444-4444-4444-444444444444",
        "producto": "Iced Latte Caramel",
        "precio": 65.00,
        "puntos_requeridos": 120,
        "piezas_disponibles": 5,
        "imagen_url": "/products/latte.svg",
        "created_at": "2026-09-13T10:00:00Z"
    },
    {
        "id_prod": "55555555-5555-5555-5555-555555555555",
        "producto": "Muffin de Arándanos",
        "precio": 45.00,
        "puntos_requeridos": 80,
        "piezas_disponibles": 2,
        "imagen_url": "/products/muffin.svg",
        "created_at": "2026-09-13T10:00:00Z"
    }
]


class ProductService:
    def __init__(self, db: Optional[Client] = None):
        self._db = db

    @property
    def db(self) -> Client:
        if self._db is None:
            self._db = get_supabase_client()
        return self._db

    def get_products(self) -> List[dict]:
        """Fetch all available reward products."""
        try:
            res = self.db.table("products").select("*").order("puntos_requeridos", desc=False).execute()
            if res.data and len(res.data) > 0:
                return res.data
        except Exception:
            # Fallback to default catalog if table is not yet created in Supabase
            pass
        return DEFAULT_PRODUCTS

    def create_product(self, product_data: ProductCreate) -> dict:
        """Create a new reward product."""
        new_id = str(uuid.uuid4())
        payload = {
            "id_prod": new_id,
            "producto": product_data.producto,
            "puntos_requeridos": product_data.puntos_requeridos,
            "precio": product_data.precio or 0.0,
            "piezas_disponibles": product_data.piezas_disponibles,
            "imagen_url": product_data.imagen_url
        }

        try:
            res = self.db.table("products").insert(payload).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            print(f"[ProductService] Supabase insert warning/fallback: {e}")

        # In-memory fallback
        DEFAULT_PRODUCTS.append(payload)
        return payload

    def update_product(self, product_id: str, product_data: ProductUpdate) -> dict:
        """Update an existing reward product."""
        update_dict = product_data.model_dump(exclude_unset=True)
        if not update_dict:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No hay campos para actualizar.")

        try:
            res = self.db.table("products").update(update_dict).eq("id_prod", product_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
        except Exception as e:
            print(f"[ProductService] Supabase update warning/fallback: {e}")

        # In-memory fallback
        for p in DEFAULT_PRODUCTS:
            if str(p["id_prod"]) == str(product_id):
                p.update(update_dict)
                return p

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado.")

    def delete_product(self, product_id: str) -> dict:
        """Delete a reward product by ID."""
        try:
            self.db.table("products").delete().eq("id_prod", product_id).execute()
        except Exception as e:
            print(f"[ProductService] Supabase delete warning/fallback: {e}")

        # Remove from fallback memory array
        global DEFAULT_PRODUCTS
        DEFAULT_PRODUCTS = [p for p in DEFAULT_PRODUCTS if str(p["id_prod"]) != str(product_id)]

        return {"message": "Producto eliminado exitosamente.", "id_prod": product_id}

    def redeem_product(self, user_id: str, product_id: str) -> dict:
        """Redeem a product using customer loyalty points."""
        user = user_service.get_user_by_id(user_id)
        current_points = user.get("current_points", 0)

        # 1. Fetch target product
        product = None
        try:
            res = self.db.table("products").select("*").eq("id_prod", product_id).execute()
            if res.data:
                product = res.data[0]
        except Exception:
            pass

        if not product:
            for p in DEFAULT_PRODUCTS:
                if str(p["id_prod"]) == str(product_id):
                    product = p
                    break

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El producto seleccionado no existe."
            )

        points_needed = product["puntos_requeridos"]
        stock = product["piezas_disponibles"]

        if stock <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El producto '{product['producto']}' está agotado por el momento."
            )

        if current_points < points_needed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Puntos insuficientes. Tienes {current_points} pts y necesitas {points_needed} pts."
            )

        # 2. Deduct points from user
        new_current_points = current_points - points_needed
        new_total_spent = user.get("total_points_spent", 0) + points_needed

        try:
            self.db.table("users").update({
                "current_points": new_current_points,
                "total_points_spent": new_total_spent
            }).eq("id", user_id).execute()
        except Exception as e:
            handle_supabase_error(e)

        # 3. Decrement product stock if in DB
        try:
            self.db.table("products").update({
                "piezas_disponibles": stock - 1
            }).eq("id_prod", product_id).execute()
        except Exception:
            # Update local memory copy if using fallback
            product["piezas_disponibles"] = stock - 1

        # 4. Insert transaction record
        user_service.add_transaction(
            user_id=user_id,
            transaction_type="REDEMPTION",
            points_transacted=-points_needed,
            description=f"Canje de recompensa: {product['producto']}"
        )

        # 5. Trigger Google Wallet Remote Push Sync
        try:
            from app.services.google_wallet_service import google_wallet_service
            updated_user_dict = {
                **user,
                "current_points": new_current_points,
                "total_points_spent": new_total_spent
            }
            google_wallet_service.update_pass_for_user(updated_user_dict)
        except Exception:
            pass

        return {
            "message": f"¡Felicidades! Has canjeado '{product['producto']}' exitosamente.",
            "product": product,
            "remaining_points": new_current_points
        }


product_service = ProductService()
