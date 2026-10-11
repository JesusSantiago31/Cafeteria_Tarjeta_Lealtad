from datetime import datetime
from typing import Optional, Union, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


# 1. Reglas de Puntos / Sellos
class PointsRuleBase(BaseModel):
    monto_dinero: float = Field(..., ge=0.0, description="Monto en dinero ($)")
    puntos_otorgados: int = Field(..., ge=0, description="Puntos o sellos otorgados")
    descripcion: Optional[str] = Field(None, description="Descripción de la regla")
    dia_semana: Optional[int] = Field(None, ge=1, le=7, description="1=Lunes a 7=Domingo")
    dia_nombre: Optional[str] = Field(None, description="Nombre del día: Lunes, Martes, etc.")
    is_active: bool = Field(True, description="Si la regla está activa")

class PointsRuleCreate(PointsRuleBase):
    pass

class PointsRuleUpdate(BaseModel):
    monto_dinero: Optional[float] = Field(None, ge=0.0)
    puntos_otorgados: Optional[int] = Field(None, ge=0)
    descripcion: Optional[str] = None
    dia_semana: Optional[int] = None
    dia_nombre: Optional[str] = None
    is_active: Optional[bool] = None

class PointsRuleResponse(PointsRuleBase):
    id: Optional[Union[UUID, str]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, extra="allow")

# 2. Configuración Global de Billetera
class WalletSettingBase(BaseModel):
    max_sellos: int = Field(10, ge=1, description="Límite máximo de sellos")
    dias_caducidad_puntos: Optional[int] = Field(90, ge=0, description="Días de vigencia de los puntos (0 = sin caducidad)")
    recompensa_sellos_descripcion: Optional[str] = Field("Bebida de cortesía a elegir", description="Recompensa otorgada al completar 10 sellos")
    instagram_url: Optional[str] = Field("", description="Enlace a Instagram de la cafetería")
    facebook_url: Optional[str] = Field("", description="Enlace a Facebook de la cafetería")
    terminos_url: Optional[str] = Field("", description="Enlace a Términos y Condiciones")
    is_active: bool = Field(True, description="Si la configuración está activa")

class WalletSettingUpdate(BaseModel):
    max_sellos: Optional[int] = Field(None, ge=1)
    dias_caducidad_puntos: Optional[int] = Field(None, ge=0)
    recompensa_sellos_descripcion: Optional[str] = None
    instagram_url: Optional[str] = None
    facebook_url: Optional[str] = None
    terminos_url: Optional[str] = None
    is_active: Optional[bool] = None

class WalletSettingResponse(WalletSettingBase):
    id: Optional[Union[UUID, str]] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, extra="allow")

class WalletNotificationRequest(BaseModel):
    header: str = Field(..., min_length=1, max_length=100, description="Título o encabezado de la notificación")
    body: str = Field(..., min_length=1, max_length=300, description="Cuerpo del mensaje u oferta")


# 3. Niveles de Sellos (Imágenes)
class StampLevelBase(BaseModel):
    stamp_count: Optional[int] = Field(None, ge=0)
    nivel_sello: Optional[int] = Field(None, ge=0)
    image_url: Optional[str] = None
    imagen_url: Optional[str] = None
    wallet_hero_url: Optional[str] = None
    nombre_sello: Optional[str] = None

    model_config = ConfigDict(extra="allow")

class StampLevelCreate(BaseModel):
    stamp_count: Optional[int] = None
    nivel_sello: Optional[int] = None
    image_url: Optional[str] = None
    imagen_url: Optional[str] = None

class StampLevelUpdate(BaseModel):
    imagen_url: Optional[str] = None
    image_url: Optional[str] = None

class StampLevelResponse(StampLevelBase):
    id: Optional[UUID] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True, extra="allow")
