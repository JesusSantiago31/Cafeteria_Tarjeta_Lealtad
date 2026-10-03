from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

# 1. Reglas de Puntos / Sellos
class PointsRuleBase(BaseModel):
    monto_dinero: float = Field(..., ge=0.0, description="Monto en dinero ($)")
    puntos_otorgados: int = Field(..., ge=0, description="Puntos o sellos otorgados")
    descripcion: Optional[str] = Field(None, description="Descripción de la regla")
    is_active: bool = Field(True, description="Si la regla está activa")

class PointsRuleCreate(PointsRuleBase):
    pass

class PointsRuleUpdate(BaseModel):
    monto_dinero: Optional[float] = Field(None, ge=0.0)
    puntos_otorgados: Optional[int] = Field(None, ge=0)
    descripcion: Optional[str] = None
    is_active: Optional[bool] = None

class PointsRuleResponse(PointsRuleBase):
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# 2. Configuración Global de Billetera
class WalletSettingBase(BaseModel):
    max_sellos: int = Field(..., ge=1, description="Límite máximo de sellos")
    is_active: bool = Field(True, description="Si la configuración está activa")

class WalletSettingUpdate(BaseModel):
    max_sellos: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None

class WalletSettingResponse(WalletSettingBase):
    id: UUID
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# 3. Niveles de Sellos (Imágenes)
class StampLevelBase(BaseModel):
    nivel_sello: int = Field(..., ge=0, description="Número de sello (0, 1, 2, ...)")
    imagen_url: str = Field(..., description="URL de ImgBB para la imagen del sello")

class StampLevelCreate(StampLevelBase):
    pass

class StampLevelUpdate(BaseModel):
    imagen_url: str

class StampLevelResponse(StampLevelBase):
    id: UUID
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
