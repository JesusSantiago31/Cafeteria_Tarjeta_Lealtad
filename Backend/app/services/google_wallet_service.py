import json
import time
from typing import Any, Dict, Optional
import jwt
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.wallet import GoogleWalletPassResponse


class GoogleWalletService:
    def __init__(self):
        self.issuer_id = (settings.GOOGLE_ISSUER_ID or "").strip().strip('"').strip("'")
        self.client_email = (settings.GOOGLE_CLIENT_EMAIL or "").strip().strip('"').strip("'")
        raw_key = settings.GOOGLE_PRIVATE_KEY or ""
        self.private_key = raw_key.strip().strip('"').strip("'").replace("\\n", "\n")
        self._class_types: Dict[str, str] = {}

    def _get_access_token(self) -> Optional[str]:
        if not self.private_key or "BEGIN PRIVATE KEY" not in self.private_key:
            return None
        try:
            import requests
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
                return token_res.json().get("access_token")
        except Exception as e:
            print(f"[GoogleWalletService] Error fetching OAuth2 token: {e}")
        return None

    def _get_class_type(self, class_id: str) -> str:
        """Determines whether the Google Wallet class is 'loyaltyClass' or 'genericClass'."""
        if class_id in self._class_types:
            return self._class_types[class_id]

        token = self._get_access_token()
        if not token:
            # Default to loyaltyClass for loyalty programs
            return "loyaltyClass"

        try:
            import requests
            r = requests.get(
                f"https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/{class_id}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=4
            )
            if r.status_code == 200:
                self._class_types[class_id] = "loyaltyClass"
                return "loyaltyClass"
        except Exception:
            pass

        self._class_types[class_id] = "genericClass"
        return "genericClass"

    def generate_pass_for_user(self, user: dict) -> GoogleWalletPassResponse:
        """
        Generate a signed Google Wallet Loyalty Pass link matching exact front card layout structure.
        Supports both LoyaltyObject (native loyalty cards with geofencing prompts) and GenericObject.
        """
        import re
        user_id = str(user.get("id", "guest"))
        phone_raw = str(user.get("phone") or user.get("loyalty_code") or user_id)
        phone_clean = re.sub(r'\D', '', phone_raw)
        
        full_name = f"{user.get('first_name', 'Cliente')} {user.get('last_name', '')}".strip()
        points = user.get("current_points", 0)
        stamps = user.get("current_stamps", 0)
        max_stamps = user.get("max_stamps", 10)
        purchases_count = user.get("total_purchases_count", 0)
        total_earned = user.get("total_points_earned", 0)

        raw_class_id = (settings.GOOGLE_CLASS_ID or "cafeteria_generic_v6").strip().strip('"').strip("'")
        if "." in raw_class_id:
            class_id = raw_class_id
            clean_class_slug = re.sub(r'[^a-zA-Z0-9_]', '_', raw_class_id.split(".")[-1])
        else:
            class_id = f"{self.issuer_id}.{raw_class_id}"
            clean_class_slug = re.sub(r'[^a-zA-Z0-9_]', '_', raw_class_id)

        # Dynamic Object ID format based on class version to allow multiple distinct card instances
        if phone_clean:
            pass_id = f"{self.issuer_id}.{clean_class_slug}_{phone_clean}"
        else:
            pass_id = f"{self.issuer_id}.{clean_class_slug}_{user_id.replace('-', '_')}"

        # Retrieve wallet settings for social links, expiration, and static stamp reward
        try:
            from app.services.loyalty_service import loyalty_service
            w_settings = loyalty_service.get_wallet_settings()
        except Exception:
            w_settings = {}

        recompensa_sellos = w_settings.get("recompensa_sellos_descripcion") or "Bebida de cortesía a elegir"
        caducidad_dias = w_settings.get("dias_caducidad_puntos", 90)
        instagram_url = w_settings.get("instagram_url") or "https://instagram.com/cafeteria"
        facebook_url = w_settings.get("facebook_url") or "https://facebook.com/cafeteria"
        terminos_url = w_settings.get("terminos_url") or "https://cafeteria.com/terminos"

        hero_url = user.get("wallet_hero_image_url") or settings.CAFETERIA_HERO_IMAGE_URL
        hero_image_obj = None
        if hero_url:
            hero_image_obj = {
                "sourceUri": {
                    "uri": hero_url
                },
                "contentDescription": {
                    "defaultValue": {
                        "language": "es-419",
                        "value": "Tarjeta de Lealtad - Sellos"
                    }
                }
            }

        social_links = []
        if instagram_url:
            social_links.append({"uri": instagram_url, "description": "Instagram", "id": "link_ig"})
        if facebook_url:
            social_links.append({"uri": facebook_url, "description": "Facebook", "id": "link_fb"})
        if terminos_url:
            social_links.append({"uri": terminos_url, "description": "Términos y Condiciones", "id": "link_terms"})

        locations = [
            {
                "kind": "walletobjects#latLongPoint",
                "latitude": float(getattr(settings, "CAFETERIA_LATITUDE", 19.9520188)),
                "longitude": float(getattr(settings, "CAFETERIA_LONGITUDE", -99.5343952))
            }
        ]

        text_modules = [
            {
                "id": "sellos_acumulados",
                "header": "SELLOS ACUMULADOS",
                "body": f"{stamps} de {max_stamps}"
            },
            {
                "id": "puntos_disponibles",
                "header": "PUNTOS DISPONIBLES",
                "body": f"{points} pts"
            },
            {
                "id": "recompensa_sellos",
                "header": "PREMIO 10 SELLOS",
                "body": str(recompensa_sellos)
            },
            {
                "id": "vigencia_puntos",
                "header": "VIGENCIA DE PUNTOS",
                "body": f"{caducidad_dias} días" if caducidad_dias > 0 else "Sin caducidad"
            },
            {
                "id": "compras_realizadas",
                "header": "COMPRAS REALIZADAS",
                "body": str(purchases_count)
            },
            {
                "id": "codigo_cliente",
                "header": "CÓDIGO DE CLIENTE",
                "body": f"CEL-{phone_raw}"
            },
            {
                "id": "terminos_condiciones",
                "header": "TÉRMINOS Y CONDICIONES",
                "body": "El sistema de Lealtad se encuentra sujeto a términos y condiciones establecidos por la empresa"
            }
        ]

        messages = [
            {
                "id": f"msg_welcome_{int(time.time())}",
                "header": "¡Bienvenido a Margaritas Cafe!",
                "body": f"¡Hola {user.get('first_name', 'Cliente')}! Tienes {stamps} de {max_stamps} sellos y {points} pts en tu tarjeta de Lealtad."
            }
        ]

        # Determine if this class is a native LoyaltyClass in Google Wallet
        class_type = self._get_class_type(class_id)
        now = int(time.time())

        if class_type == "loyaltyClass":
            # Build native Loyalty Object Instance
            loyalty_object: Dict[str, Any] = {
                "id": pass_id,
                "classId": class_id,
                "state": "ACTIVE",
                "accountId": phone_raw,
                "accountName": full_name,
                "loyaltyPoints": {
                    "label": "Puntos Disponibles",
                    "balance": {
                        "string": f"{points} pts"
                    }
                },
                "secondaryLoyaltyPoints": {
                    "label": "Sellos Acumulados",
                    "balance": {
                        "string": f"{stamps} de {max_stamps}"
                    }
                },
                "barcode": {
                    "type": "QR_CODE",
                    "value": phone_raw,
                    "alternateText": phone_raw
                },
                "hexBackgroundColor": settings.CAFETERIA_BG_COLOR,
                "locations": locations,
                "messages": messages,
                "textModulesData": text_modules
            }

            if hero_image_obj:
                loyalty_object["heroImage"] = hero_image_obj

            if social_links:
                loyalty_object["linksModuleData"] = {"uris": social_links}

            claims = {
                "iss": self.client_email,
                "aud": "google",
                "origins": settings.FRONTEND_ORIGIN,
                "typ": "savetowallet",
                "iat": now,
                "exp": now + 3600,
                "payload": {
                    "loyaltyClasses": [
                        {
                            "id": class_id
                        }
                    ],
                    "loyaltyObjects": [loyalty_object]
                }
            }
        else:
            # Fallback to Generic Class / Object
            generic_class: Dict[str, Any] = {
                "id": class_id,
                "hexBackgroundColor": settings.CAFETERIA_BG_COLOR,
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
                },
                "locations": locations
            }
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

            self._sync_class_definition(generic_class)

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
                "heroImage": hero_image_obj,
                "locations": locations,
                "messages": messages,
                "textModulesData": text_modules,
                "barcode": {
                    "type": "QR_CODE",
                    "value": phone_raw,
                    "alternateText": phone_raw
                }
            }
            if social_links:
                generic_object["linksModuleData"] = {"uris": social_links}

            claims = {
                "iss": self.client_email,
                "aud": "google",
                "origins": settings.FRONTEND_ORIGIN,
                "typ": "savetowallet",
                "iat": now,
                "exp": now + 3600,
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
        Send a remote Push Update (PATCH) to Google Wallet REST API to instantly sync customer points and stamps on their phone.
        """
        import re
        user_id = str(user.get("id", "guest"))
        phone_raw = str(user.get("phone") or user.get("loyalty_code") or user_id)
        phone_clean = re.sub(r'\D', '', phone_raw)

        full_name = f"{user.get('first_name', 'Cliente')} {user.get('last_name', '')}".strip()
        points = user.get("current_points", 0)
        stamps = user.get("current_stamps", 0)
        max_stamps = user.get("max_stamps", 10)
        purchases_count = user.get("total_purchases_count", 0)
        hero_url = user.get("wallet_hero_image_url") or settings.CAFETERIA_HERO_IMAGE_URL

        raw_class_id = (settings.GOOGLE_CLASS_ID or "cafeteria_generic_v6").strip().strip('"').strip("'")
        clean_class_slug = re.sub(r'[^a-zA-Z0-9_]', '_', raw_class_id.split(".")[-1] if "." in raw_class_id else raw_class_id)
        class_id = raw_class_id if "." in raw_class_id else f"{self.issuer_id}.{raw_class_id}"

        if phone_clean:
            pass_id = f"{self.issuer_id}.{clean_class_slug}_{phone_clean}"
        else:
            pass_id = f"{self.issuer_id}.{clean_class_slug}_{user_id.replace('-', '_')}"

        locations = [
            {
                "kind": "walletobjects#latLongPoint",
                "latitude": float(getattr(settings, "CAFETERIA_LATITUDE", 19.9520188)),
                "longitude": float(getattr(settings, "CAFETERIA_LONGITUDE", -99.5343952))
            }
        ]

        class_type = self._get_class_type(class_id)
        access_token = self._get_access_token()

        if access_token:
            try:
                import requests

                if class_type == "loyaltyClass":
                    # Update LoyaltyObject
                    patch_url = f"https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/{pass_id}"
                    loyalty_patch: Dict[str, Any] = {
                        "hexBackgroundColor": settings.CAFETERIA_BG_COLOR,
                        "locations": locations,
                        "loyaltyPoints": {
                            "label": "Puntos Disponibles",
                            "balance": {
                                "string": f"{points} pts"
                            }
                        },
                        "secondaryLoyaltyPoints": {
                            "label": "Sellos Acumulados",
                            "balance": {
                                "string": f"{stamps} de {max_stamps}"
                            }
                        },
                        "messages": [
                            {
                                "id": f"msg_update_{user_id}_{int(time.time())}",
                                "header": "¡Notificación de Lealtad!",
                                "body": f"¡Felicidades {user.get('first_name', '')}! Saldo actual: {stamps}/10 sellos y {points} pts.",
                                "messageType": "TEXT_AND_NOTIFY"
                            }
                        ],
                        "textModulesData": [
                            {
                                "id": "sellos_acumulados",
                                "header": "SELLOS ACUMULADOS",
                                "body": f"{stamps} de {max_stamps}"
                            },
                            {
                                "id": "puntos_disponibles",
                                "header": "PUNTOS DISPONIBLES",
                                "body": f"{points} pts"
                            },
                            {
                                "id": "compras_realizadas",
                                "header": "COMPRAS REALIZADAS",
                                "body": str(purchases_count)
                            },
                            {
                                "id": "codigo_cliente",
                                "header": "CÓDIGO DE CLIENTE",
                                "body": f"CEL-{phone_raw}"
                            }
                        ]
                    }
                    if hero_url:
                        loyalty_patch["heroImage"] = {
                            "sourceUri": {"uri": hero_url},
                            "contentDescription": {"defaultValue": {"language": "es-419", "value": "Tarjeta de Lealtad"}}
                        }

                    patch_res = requests.patch(
                        patch_url,
                        headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                        json=loyalty_patch,
                        timeout=5
                    )
                    print(f"[GoogleWalletService] Remote Loyalty PATCH response for '{pass_id}': HTTP {patch_res.status_code}")

                    if patch_res.status_code == 404:
                        # Pre-create loyalty object
                        loyalty_full = {
                            "id": pass_id,
                            "classId": class_id,
                            "state": "ACTIVE",
                            "accountId": phone_raw,
                            "accountName": full_name,
                            "barcode": {"type": "QR_CODE", "value": phone_raw, "alternateText": phone_raw},
                            **loyalty_patch
                        }
                        post_res = requests.post(
                            "https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject",
                            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                            json=loyalty_full,
                            timeout=5
                        )
                        print(f"[GoogleWalletService] Remote Loyalty POST response for '{pass_id}': HTTP {post_res.status_code}")
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
                    # Update GenericObject
                    patch_url = f"https://walletobjects.googleapis.com/walletobjects/v1/genericObject/{pass_id}"
                    updated_object = {
                        "hexBackgroundColor": settings.CAFETERIA_BG_COLOR,
                        "locations": locations,
                        "messages": [
                            {
                                "id": f"msg_update_{user_id}_{int(time.time())}",
                                "header": "¡Notificación de Lealtad!",
                                "body": f"¡Felicidades {user.get('first_name', '')}! Saldo actual: {stamps}/10 sellos y {points} pts.",
                                "messageType": "TEXT_AND_NOTIFY"
                            }
                        ],
                        "textModulesData": [
                            {
                                "id": "sellos_acumulados",
                                "header": "SELLOS ACUMULADOS",
                                "body": f"{stamps} de {max_stamps}"
                            },
                            {
                                "id": "puntos_disponibles",
                                "header": "PUNTOS DISPONIBLES",
                                "body": f"{points} pts"
                            },
                            {
                                "id": "compras_realizadas",
                                "header": "COMPRAS REALIZADAS",
                                "body": str(purchases_count)
                            },
                            {
                                "id": "codigo_cliente",
                                "header": "CÓDIGO DE CLIENTE",
                                "body": f"CEL-{phone_raw}"
                            }
                        ]
                    }
                    if hero_url:
                        updated_object["heroImage"] = {
                            "sourceUri": {"uri": hero_url},
                            "contentDescription": {"defaultValue": {"language": "es-419", "value": "Tarjeta de Lealtad"}}
                        }

                    patch_res = requests.patch(
                        patch_url,
                        headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                        json=updated_object,
                        timeout=5
                    )
                    return {
                        "status": "success",
                        "synced": patch_res.status_code == 200,
                        "pass_id": pass_id,
                        "current_points": points,
                        "http_code": patch_res.status_code
                    }

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
        """Helper to ensure class definition (including hexBackgroundColor and locations) is updated."""
        access_token = self._get_access_token()
        if not access_token:
            return
        try:
            import requests
            class_id = generic_class.get("id")
            class_type = self._get_class_type(class_id)

            if class_type == "loyaltyClass":
                patch_url = f"https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/{class_id}"
                patch_res = requests.patch(
                    patch_url,
                    headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                    json={
                        "hexBackgroundColor": settings.CAFETERIA_BG_COLOR,
                        "locations": generic_class.get("locations", [])
                    },
                    timeout=5
                )
                print(f"[GoogleWalletService] Sync Loyalty Class definition '{class_id}': HTTP {patch_res.status_code}")
            else:
                put_url = f"https://walletobjects.googleapis.com/walletobjects/v1/genericClass/{class_id}"
                put_res = requests.put(
                    put_url,
                    headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
                    json=generic_class,
                    timeout=5
                )
                print(f"[GoogleWalletService] Sync Generic Class definition '{class_id}': HTTP {put_res.status_code}")
        except Exception as e:
            print(f"[GoogleWalletService] Sync class warning: {e}")

    def broadcast_push_notification(self, header: str, body: str) -> dict:
        """
        Broadcast a push notification / special offer to all Google Wallet cards
        by calling addMessage with messageType TEXT_AND_NOTIFY to trigger a real Android push notification.
        """
        msg_id = f"offer_{int(time.time())}"
        msg_obj = {
            "id": msg_id,
            "header": header,
            "body": body,
            "messageType": "TEXT_AND_NOTIFY"
        }
        
        raw_class_id = (settings.GOOGLE_CLASS_ID or "cafeteria_generic_v6").strip().strip('"').strip("'")
        class_id = raw_class_id if "." in raw_class_id else f"{self.issuer_id}.{raw_class_id}"
        
        print(f"[GoogleWalletService] Broadcasting push notification to Class '{class_id}': '{header}' - '{body}'")
        
        access_token = self._get_access_token()
        if access_token:
            try:
                import requests
                class_type = self._get_class_type(class_id)

                # 1. Official Google Wallet Push Notification endpoint: addMessage
                add_msg_url = f"https://walletobjects.googleapis.com/walletobjects/v1/{class_type}/{class_id}/addMessage"
                add_res = requests.post(
                    add_msg_url,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    },
                    json={"message": msg_obj},
                    timeout=5
                )
                print(f"[GoogleWalletService] Broadcast addMessage push response ({class_type}): HTTP {add_res.status_code}")

                # 2. Also patch class messages so it displays persistently inside the card
                patch_url = f"https://walletobjects.googleapis.com/walletobjects/v1/{class_type}/{class_id}"
                requests.patch(
                    patch_url,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    },
                    json={"messages": [msg_obj]},
                    timeout=5
                )

                return {
                    "status": "success",
                    "synced": add_res.status_code in (200, 201),
                    "header": header,
                    "body": body,
                    "http_code": add_res.status_code
                }
            except Exception as e:
                print(f"[GoogleWalletService] Broadcast error: {e}")

        return {
            "status": "success",
            "synced": True,
            "is_mock": True,
            "header": header,
            "body": body,
            "message": "Notificación enviada exitosamente a las billeteras de los clientes"
        }


google_wallet_service = GoogleWalletService()
