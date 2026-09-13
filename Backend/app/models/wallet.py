from typing import Optional
from pydantic import BaseModel, Field


class GoogleWalletPassResponse(BaseModel):
    save_url: str = Field(..., description="Official Google Pay link to install the loyalty pass into Google Wallet")
    pass_id: str = Field(..., description="Unique Google Wallet Object ID for this pass")
    loyalty_code: str = Field(..., description="Customer unique loyalty code encoded into the QR barcode")
    customer_name: str = Field(..., description="Full customer name printed on the digital card")
    current_points: int = Field(..., description="Customer current points balance shown on the card header")
    barcode_type: str = Field("QR_CODE", description="Barcode format used on the pass")
    is_mock: bool = Field(False, description="True if generated in development mock mode before Google Cloud keys setup")
    jwt_token: Optional[str] = Field(None, description="Signed JWT payload for Google Pay API")
