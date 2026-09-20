import json
import time
import requests
import jwt
import base64
from typing import Optional, Dict, Any
from app.core.config import settings

GOOGLE_DRIVE_FOLDER_ID = "1bDUIuVoI8nFdFZ4oJCuSjMUjAxrLs5Iu"

class GoogleDriveService:
    def __init__(self):
        self.folder_id = GOOGLE_DRIVE_FOLDER_ID
        self.client_email = (settings.GOOGLE_CLIENT_EMAIL or "").strip().strip('"').strip("'")
        raw_key = settings.GOOGLE_PRIVATE_KEY or ""
        self.private_key = raw_key.strip().strip('"').strip("'").replace("\\n", "\n")

    def _get_access_token(self) -> Optional[str]:
        if not self.client_email or not self.private_key:
            print("[GoogleDriveService] Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY settings.")
            return None

        now = int(time.time())
        payload = {
            'iss': self.client_email,
            'scope': 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
            'aud': 'https://oauth2.googleapis.com/token',
            'exp': now + 3600,
            'iat': now
        }

        try:
            encoded_jwt = jwt.encode(payload, self.private_key, algorithm='RS256')
            resp = requests.post(
                'https://oauth2.googleapis.com/token',
                data={
                    'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    'assertion': encoded_jwt
                },
                timeout=10
            )
            if resp.status_code == 200:
                return resp.json().get('access_token')
            else:
                print(f"[GoogleDriveService] OAuth token error {resp.status_code}: {resp.text}")
                return None
        except Exception as e:
            print(f"[GoogleDriveService] Exception getting OAuth token: {e}")
            return None

    def upload_file(self, file_content: bytes, filename: str, content_type: str = "image/jpeg") -> Dict[str, Any]:
        """
        Uploads an image file to Google Drive or falls back to Supabase / Data URI.
        Returns a dict containing file_id and direct public view image_url.
        """
        token = self._get_access_token()

        if token:
            try:
                # 1. Attempt Multipart Upload to Google Drive API v3
                upload_url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true"
                headers = {"Authorization": f"Bearer {token}"}
                
                metadata = {
                    "name": filename,
                    "parents": [self.folder_id]
                }

                files = {
                    'data': ('metadata', json.dumps(metadata), 'application/json; charset=UTF-8'),
                    'file': (filename, file_content, content_type)
                }

                resp = requests.post(upload_url, headers=headers, files=files, timeout=20)

                if resp.status_code in (200, 201):
                    file_data = resp.json()
                    file_id = file_data.get("id")

                    # 2. Make file publicly readable
                    perm_url = f"https://www.googleapis.com/drive/v3/files/{file_id}/permissions?supportsAllDrives=true"
                    requests.post(
                        perm_url,
                        headers=headers,
                        json={"role": "reader", "type": "anyone"},
                        timeout=10
                    )

                    # Direct image viewing URL for <img> tags
                    direct_url = f"https://lh3.googleusercontent.com/d/{file_id}"
                    return {
                        "success": True,
                        "file_id": file_id,
                        "imagen_url": direct_url,
                        "source": "google_drive"
                    }
                else:
                    print(f"[GoogleDriveService] Drive API upload error {resp.status_code}: {resp.text}")
            except Exception as e:
                print(f"[GoogleDriveService] Exception during Drive upload: {e}")

        # Fallback 1: Supabase Storage Bucket
        try:
            from app.db.supabase import get_supabase_client
            supabase = get_supabase_client()
            safe_name = f"{int(time.time())}_{filename.replace(' ', '_')}"
            supabase.storage.from_("reward-images").upload(
                path=safe_name,
                file=file_content,
                file_options={"content-type": content_type, "x-upsert": "true"}
            )
            public_url = supabase.storage.from_("reward-images").get_public_url(safe_name)
            if public_url:
                return {
                    "success": True,
                    "file_id": safe_name,
                    "imagen_url": public_url,
                    "source": "supabase_storage"
                }
        except Exception as se:
            print(f"[GoogleDriveService] Supabase Storage fallback notice: {se}")

        # Fallback 2: Data URI base64 string
        encoded = base64.b64encode(file_content).decode("utf-8")
        data_uri = f"data:{content_type};base64,{encoded}"
        return {
            "success": True,
            "file_id": f"local_{int(time.time())}",
            "imagen_url": data_uri,
            "source": "data_uri"
        }

google_drive_service = GoogleDriveService()
