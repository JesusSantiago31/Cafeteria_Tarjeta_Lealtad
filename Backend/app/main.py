from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1.products.endpoints import router as products_router
from app.api.v1.users.endpoints import router as users_router
from app.api.v1.wallet.endpoints import router as wallet_router
from app.api.v1.loyalty.endpoints import router as loyalty_router
from app.core.config import settings
from app.core.rate_limiter import limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Iniciar programador automático de notificaciones a las 11:30 AM CDMX
    from app.services.daily_notification_service import daily_notification_service
    daily_notification_service.start_scheduler()
    yield
    # Shutdown: Detener tareas en segundo plano
    daily_notification_service.stop_scheduler()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Setup Slowapi Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(wallet_router, prefix=settings.API_V1_STR)
app.include_router(products_router, prefix=settings.API_V1_STR)
app.include_router(loyalty_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health & Info"])
def root_info():
    """API Root diagnostic endpoint."""
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health & Info"])
def health_check():
    """Health check status endpoint."""
    return {"status": "healthy"}
