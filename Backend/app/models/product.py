from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    producto: str = Field(..., min_length=1, max_length=150, description="Nombre del producto")
    precio: float = Field(..., ge=0.0, description="Precio en dinero ($)")
    puntos_requeridos: int = Field(..., ge=0, description="Puntos necesarios para canjear")
    piezas_disponibles: int = Field(..., ge=0, description="Stock de piezas disponibles")
    imagen_url: Optional[str] = Field(None, description="URL o ruta de la imagen del producto")


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    producto: Optional[str] = Field(None, min_length=1, max_length=150)
    precio: Optional[float] = Field(None, ge=0.0)
    puntos_requeridos: Optional[int] = Field(None, ge=0)
    piezas_disponibles: Optional[int] = Field(None, ge=0)
    imagen_url: Optional[str] = None


class ProductResponse(ProductBase):
    id_prod: UUID
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RedemptionRequest(BaseModel):
    user_id: UUID
    product_id: UUID
