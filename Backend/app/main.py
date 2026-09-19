from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1.products.endpoints import router as products_router
from app.api.v1.users.endpoints import router as users_router
from app.api.v1.wallet.endpoints import router as wallet_router
from app.core.config import settings
from app.core.rate_limiter import limiter

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
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
