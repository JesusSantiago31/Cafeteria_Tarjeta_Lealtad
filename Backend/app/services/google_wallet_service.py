import json
import time
from typing import Any, Dict, Optional
import jwt
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.wallet import GoogleWalletPassResponse


class GoogleWalletService:
    def __init__(self):
        self.issuer_id = settings.GOOGLE_ISSUER_ID or "3388000000022114455"
        self.client_email = settings.GOOGLE_CLIENT_EMAIL or "cafeteria-loyalty-sa@project.iam.gserviceaccount.com"
        self.private_key = settings.GOOGLE_PRIVATE_KEY.replace("\\n", "\n") if settings.GOOGLE_PRIVATE_KEY else ""

    def generate_pass_for_user(self, user: dict) -> GoogleWalletPassResponse:
        """
        Generate a signed Google Wallet Loyalty Pass link for a given customer profile.
        """
        user_id = str(user["id"])
        loyalty_code = user["loyalty_code"]
        full_name = f"{user['first_name']} {user['last_name']}"
        points = user.get("current_points", 0)
        purchases_count = user.get("total_purchases_count", 0)
        total_earned = user.get("total_points_earned", 0)

        pass_id = f"{self.issuer_id}.user_{user_id.replace('-', '_')}"
        class_id = f"{self.issuer_id}.cafeteria_pass_class"

        # Build Generic Class Definition (Card template)
        generic_class: Dict[str, Any] = {
            "id": class_id,
            "logo": {
                "sourceUri": {
                    "uri": settings.CAFETERIA_LOGO_URL
                },
                "contentDescription": {
                    "defaultValue": {
                        "language": "es-419",
                        "value": f"Logo de {settings.CAFETERIA_NAME}"
                    }
                }
            },
            "cardTitle": {
                "defaultValue": {
                    "language": "es-419",
                    "value": settings.CAFETERIA_NAME
                }
            },
            "subheader": {
                "defaultValue": {
                    "language": "es-419",
                    "value": settings.CAFETERIA_SUBHEADER
                }
            },
            "hexBackgroundColor": settings.CAFETERIA_BG_COLOR
        }

        if settings.CAFETERIA_HERO_IMAGE_URL:
            generic_class["heroImage"] = {
                "sourceUri": {
                    "uri": settings.CAFETERIA_HERO_IMAGE_URL
                },
                "contentDescription": {
                    "defaultValue": {
                        "language": "es-419",
                        "value": "Portada de Cafetería"
                    }
                }
            }

        # Build Generic Object Instance (Specific customer pass)
        generic_object: Dict[str, Any] = {
            "id": pass_id,
            "classId": class_id,
            "state": "ACTIVE",
            "logo": generic_class["logo"],
            "cardTitle": generic_class["cardTitle"],
            "subheader": generic_class["subheader"],
            "header": {
                "defaultValue": {
                    "language": "es-419",
                    "value": full_name
                }
            },
            "hexBackgroundColor": settings.CAFETERIA_BG_COLOR,
            "textModulesData": [

                {
                    "id": "points_balance",
                    "header": "PUNTOS DISPONIBLES",
                    "body": f"{points} Pts"
                },
                {
                    "id": "purchases_count",
                    "header": "COMPRAS REALIZADAS",
                    "body": f"{purchases_count} Compras"
                },
                {
                    "id": "total_earned",
                    "header": "PUNTOS GANADOS HISTÓRICOS",
                    "body": f"{total_earned} Pts"
                },
                {
                    "id": "loyalty_code_label",
                    "header": "CÓDIGO DE CLIENTE",
                    "body": loyalty_code
                }
            ],
            "barcode": {
                "type": "QR_CODE",
                "value": loyalty_code,
                "alternateText": loyalty_code
            }
        }

        # Build JWT Payload
        now = int(time.time())
        claims = {
            "iss": self.client_email,
            "aud": "google",
            "typ": "savetowallet",
            "iat": now,
            "payload": {
                "genericClasses": [generic_class],
                "genericObjects": [generic_object]
            }
        }

        is_mock = False
        jwt_token = ""

        if self.private_key and "BEGIN PRIVATE KEY" in self.private_key:
            try:
                # Sign with Google Cloud RSA Private Key (RS256)
                jwt_token = jwt.encode(claims, self.private_key, algorithm="RS256")
            except Exception as e:
                # Fallback if key parsing fails
                is_mock = True
                jwt_token = jwt.encode(claims, settings.JWT_SECRET_KEY, algorithm="HS256")
        else:
            # Development Mock mode
            is_mock = True
            jwt_token = jwt.encode(claims, settings.JWT_SECRET_KEY, algorithm="HS256")

        save_url = f"https://pay.google.com/gp/v/save/{jwt_token}"

        return GoogleWalletPassResponse(
            save_url=save_url,
            pass_id=pass_id,
            loyalty_code=loyalty_code,
            customer_name=full_name,
            current_points=points,
            barcode_type="QR_CODE",
            is_mock=is_mock,
            jwt_token=jwt_token
        )


google_wallet_service = GoogleWalletService()

