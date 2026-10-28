from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Cafeteria Loyalty Cards API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000  # Injected dynamically by Render ($PORT)

    # Supabase Configuration
    SUPABASE_URL: str = "https://your-project-id.supabase.co"
    SUPABASE_KEY: str = "your-supabase-anon-or-service-role-key"

    # Security & Authentication
    JWT_SECRET_KEY: str = "dev_secret_key_change_in_production_cafeteria_loyalty"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours
    DEFAULT_RATE_LIMIT: str = "100/minute"

    # CORS Origins (comma separated in env or list)
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "*",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
    ]


    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.strip() == "*":
                return ["*"]
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return []

    # Frontend origin(s) for Google Wallet JWT
    FRONTEND_ORIGIN: Union[List[str], str] = "*"

    @field_validator("FRONTEND_ORIGIN", mode="before")
    @classmethod
    def assemble_frontend_origin(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.strip() == "*":
                return ["*"]
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return []

    # ImgBB Cloud Storage Configuration
    IMGBB_API_KEY: str = ""

    # Google Wallet Configuration
    GOOGLE_ISSUER_ID: str = ""
    GOOGLE_CLASS_ID: str = ""
    GOOGLE_CLIENT_EMAIL: str = ""
    GOOGLE_PRIVATE_KEY: str = ""
    CAFETERIA_NAME: str = "Cafetería Gourmet"
    CAFETERIA_SUBHEADER: str = "Tarjeta VIP de Lealtad"
    CAFETERIA_BG_COLOR: str = "#a58d61"
    CAFETERIA_LOGO_URL: str = "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80"
    CAFETERIA_HERO_IMAGE_URL: str = "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1000&q=80"
    CAFETERIA_LATITUDE: float = 19.9520188
    CAFETERIA_LONGITUDE: float = -99.5343952

    # Daily Push Notification Schedule (11:30 AM Mexico City Time)
    DAILY_PROMO_ENABLED: bool = True
    DAILY_PROMO_HOUR: int = 11
    DAILY_PROMO_MINUTE: int = 30





    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()

