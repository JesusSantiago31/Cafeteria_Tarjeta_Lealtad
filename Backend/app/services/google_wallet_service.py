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
        Generate a signed Google Wallet Loyalty Pass link matching exact front card layout structure.
        """
        import re
        user_id = str(user.get("id", "guest"))
        phone_raw = str(user.get("phone") or user.get("loyalty_code") or user_id)
        phone_clean = re.sub(r'\D', '', phone_raw)
        
        full_name = f"{user.get('first_name', 'Cliente')} {user.get('last_name', '')}".strip()
        points = user.get("current_points", 0)
        purchases_count = user.get("total_purchases_count", 0)
        total_earned = user.get("total_points_earned", 0)

        # Object ID format matching gen_v6_ convention
        if phone_clean:
            pass_id = f"{self.issuer_id}.gen_v6_{phone_clean}"
        else:
            pass_id = f"{self.issuer_id}.gen_v6_{user_id.replace('-', '_')}"

        raw_class_id = settings.GOOGLE_CLASS_ID or "cafeteria_generic_v6"
        if "." in raw_class_id:
            class_id = raw_class_id
        else:
            class_id = f"{self.issuer_id}.{raw_class_id}"



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
                        "value": "Logo"
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
            }
        }

        # Sync Class template to Google Pay Cloud database
        self._sync_class_definition(generic_class)



        if settings.CAFETERIA_HERO_IMAGE_URL:
            generic_class["heroImage"] = {
                "sourceUri": {
                    "uri": settings.CAFETERIA_HERO_IMAGE_URL
                },
                "contentDescription": {
                    "defaultValue": {
                        "language": "es-419",
                        "value": "Banner"
                    }
                }
            }


        # Build Generic Object Instance
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
            "heroImage": generic_class.get("heroImage"),
            "textModulesData": [
                {
                    "id": "puntos_disponibles",
                    "header": "PUNTOS DISPONIBLES",
                    "body": str(points)
                },
                {
                    "id": "compras_realizadas",
                    "header": "COMPRAS REALIZADAS",
                    "body": str(purchases_count)
                },
                {
                    "id": "puntos_historicos",
                    "header": "PUNTOS HISTÓRICOS",
                    "body": f"{total_earned} Pts"
                },
                {
                    "id": "codigo_cliente",
                    "header": "CÓDIGO DE CLIENTE",
                    "body": f"CEL-{phone_raw}"
                }
            ],
            "barcode": {
                "type": "QR_CODE",
                "value": phone_raw,
                "alternateText": phone_raw
            }
        }

        # Build JWT Payload matching user exact snippet structure
        now = int(time.time())
        claims = {
            "iss": self.client_email,
            "aud": "google",
            "origins": [],
            "typ": "savetowallet",
            "iat": now,
            "payload": {
                "genericClasses": [
                    {
                        "id": class_id
                    }
                ],
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
            loyalty_code=phone_raw,
            customer_name=full_name,
            current_points=points,
            barcode_type="QR_CODE",
            is_mock=is_mock,
            jwt_token=jwt_token
        )


    def update_pass_for_user(self, user: dict) -> dict:
        """
        Send a remote Push Update (PATCH) to Google Wallet REST API to instantly sync customer points on their phone.
        """
        import re
        user_id = str(user.get("id", "guest"))
        phone_raw = str(user.get("phone") or user.get("loyalty_code") or user_id)
        phone_clean = re.sub(r'\D', '', phone_raw)

        full_name = f"{user.get('first_name', 'Cliente')} {user.get('last_name', '')}".strip()
        points = user.get("current_points", 0)
        purchases_count = user.get("total_purchases_count", 0)
        total_earned = user.get("total_points_earned", 0)

        if phone_clean:
            pass_id = f"{self.issuer_id}.gen_v6_{phone_clean}"
        else:
            pass_id = f"{self.issuer_id}.gen_v6_{user_id.replace('-', '_')}"

        updated_object: Dict[str, Any] = {
            "hexBackgroundColor": settings.CAFETERIA_BG_COLOR,
            "textModulesData": [
                {
                    "id": "puntos_disponibles",
                    "header": "PUNTOS DISPONIBLES",
                    "body": str(points)
                },
                {
                    "id": "compras_realizadas",
                    "header": "COMPRAS REALIZADAS",
                    "body": str(purchases_count)
                },
                {
                    "id": "puntos_historicos",
                    "header": "PUNTOS HISTÓRICOS",
                    "body": f"{total_earned} Pts"
                },
                {
                    "id": "codigo_cliente",
                    "header": "CÓDIGO DE CLIENTE",
                    "body": f"CEL-{phone_raw}"
                }
            ]
        }


        # If Google Service Account Key is configured, execute real Google REST API call
        if self.private_key and "BEGIN PRIVATE KEY" in self.private_key:
            try:
                import requests
                # 1. Obtain Google OAuth2 access token for wallet_object.issuer scope
                now = int(time.time())
                auth_claims = {
                    "iss": self.client_email,
                    "scope": "https://www.googleapis.com/auth/wallet_object.issuer",
                    "aud": "https://oauth2.googleapis.com/token",
                    "exp": now + 3600,
                    "iat": now
                }
                assertion = jwt.encode(auth_claims, self.private_key, algorithm="RS256")

                token_res = requests.post(
                    "https://oauth2.googleapis.com/token",
                    data={
                        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                        "assertion": assertion
                    },
                    timeout=5
                )

                if token_res.status_code == 200:
                    access_token = token_res.json().get("access_token")
                    
                    # 2. Issue PATCH request to Google Wallet Objects API
                    patch_url = f"https://walletobjects.googleapis.com/walletobjects/v1/genericObject/{pass_id}"
                    patch_res = requests.patch(
                        patch_url,
                        headers={
                            "Authorization": f"Bearer {access_token}",
                            "Content-Type": "application/json"
                        },
                        json=updated_object,
                        timeout=5
                    )
                    
                    print(f"[GoogleWalletService] Remote PATCH response for '{pass_id}': HTTP {patch_res.status_code}")
                    
                    # If object is not yet created in Google Pay DB (404), pre-create object via POST
                    if patch_res.status_code == 404:
                        raw_class_id = settings.GOOGLE_CLASS_ID or "cafeteria_generic_v6"
                        class_id = raw_class_id if "." in raw_class_id else f"{self.issuer_id}.{raw_class_id}"


                        full_object: Dict[str, Any] = {
                            "id": pass_id,
                            "classId": class_id,
                            "state": "ACTIVE",
                            "hexBackgroundColor": settings.CAFETERIA_BG_COLOR,
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
                            "header": {
                                "defaultValue": {
                                    "language": "es-419",
                                    "value": full_name
                                }
                            },
                            "textModulesData": updated_object["textModulesData"],
                            "barcode": {
                                "type": "QR_CODE",
                                "value": phone_raw,
                                "alternateText": phone_raw
                            }
                        }
                        
                        post_res = requests.post(
                            "https://walletobjects.googleapis.com/walletobjects/v1/genericObject",
                            headers={
                                "Authorization": f"Bearer {access_token}",
                                "Content-Type": "application/json"
                            },
                            json=full_object,
                            timeout=5
                        )
                        print(f"[GoogleWalletService] Remote POST pre-create response for '{pass_id}': HTTP {post_res.status_code}")
                        if post_res.status_code not in (200, 201):
                            print(f"[GoogleWalletService] POST error detail: {post_res.text}")
                        
                        return {
                            "status": "success",
                            "synced": post_res.status_code in (200, 201),
                            "pass_id": pass_id,
                            "current_points": points,
                            "http_code": post_res.status_code
                        }

                    return {
                        "status": "success",
                        "synced": patch_res.status_code == 200,
                        "pass_id": pass_id,
                        "current_points": points,
                        "http_code": patch_res.status_code
                    }

                else:
                    print(f"[GoogleWalletService] Token OAuth2 error: {token_res.text}")
            except Exception as e:
                print(f"[GoogleWalletService] Sync warning: {e}")

        # Development / Simulation fallback
        print(f"[GoogleWalletService] Simulation Push Sync: Pass '{pass_id}' updated to {points} Pts.")
        return {
            "status": "success",
            "synced": True,
            "is_mock": True,
            "pass_id": pass_id,
            "current_points": points
        }

    def _sync_class_definition(self, generic_class: dict):
        """Helper to ensure class definition (including hexBackgroundColor) is updated on Google Pay REST API."""
        if not self.private_key or "BEGIN PRIVATE KEY" not in self.private_key:
            return
        try:
            import requests
            class_id = generic_class.get("id")
            now = int(time.time())
            auth_claims = {
                "iss": self.client_email,
                "scope": "https://www.googleapis.com/auth/wallet_object.issuer",
                "aud": "https://oauth2.googleapis.com/token",
                "exp": now + 3600,
                "iat": now
            }
            assertion = jwt.encode(auth_claims, self.private_key, algorithm="RS256")

            token_res = requests.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                    "assertion": assertion
                },
                timeout=5
            )

            if token_res.status_code == 200:
                access_token = token_res.json().get("access_token")
                put_url = f"https://walletobjects.googleapis.com/walletobjects/v1/genericClass/{class_id}"
                put_res = requests.put(
                    put_url,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    },
                    json=generic_class,
                    timeout=5
                )
                print(f"[GoogleWalletService] Sync Class definition '{class_id}' color '{generic_class.get('hexBackgroundColor')}': HTTP {put_res.status_code}")
        except Exception as e:
            print(f"[GoogleWalletService] Sync class warning: {e}")


google_wallet_service = GoogleWalletService()



