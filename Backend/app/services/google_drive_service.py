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
        self.webapp_url = (settings.GOOGLE_DRIVE_WEBAPP_URL or "").strip().strip('"').strip("'")

    def _get_access_token(self) -> Optional[str]:
        if not self.client_email or not self.private_key:
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
        except Exception as e:
            print(f"[GoogleDriveService] Exception getting OAuth token: {e}")
        return None

    def _upload_via_apps_script(self, file_content: bytes, filename: str, content_type: str) -> Optional[Dict[str, Any]]:
        if not self.webapp_url:
            return None
        try:
            encoded_b64 = base64.b64encode(file_content).decode('utf-8')
            payload = {
                "folder_id": self.folder_id,
                "filename": filename,
                "contentType": content_type,
                "base64": encoded_b64
            }
            resp = requests.post(self.webapp_url, json=payload, timeout=25)
            if resp.status_code in (200, 201):
                data = resp.json()
                if data.get("status") == "success" or data.get("imagen_url"):
                    return {
                        "success": True,
                        "file_id": data.get("file_id", f"drive_{int(time.time())}"),
                        "imagen_url": data.get("imagen_url") or f"https://lh3.googleusercontent.com/d/{data.get('file_id')}",
                        "source": "google_drive_apps_script"
                    }
        except Exception as e:
            print(f"[GoogleDriveService] Apps Script upload exception: {e}")
        return None

    def upload_file(self, file_content: bytes, filename: str, content_type: str = "image/jpeg") -> Dict[str, Any]:
        """
        Uploads an image file to Google Drive folder 1bDUIuVoI8nFdFZ4oJCuSjMUjAxrLs5Iu.
        Returns a dict containing file_id and direct public view image_url.
        """
        # 1. Attempt upload via Google Apps Script WebApp if URL is provided
        script_res = self._upload_via_apps_script(file_content, filename, content_type)
        if script_res:
            return script_res

        # 2. Attempt direct upload via Google Drive API v3
        token = self._get_access_token()
        if token:
            try:
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

                    # Make file publicly readable
                    perm_url = f"https://www.googleapis.com/drive/v3/files/{file_id}/permissions?supportsAllDrives=true"
                    requests.post(
                        perm_url,
                        headers=headers,
                        json={"role": "reader", "type": "anyone"},
                        timeout=10
                    )

                    direct_url = f"https://lh3.googleusercontent.com/d/{file_id}"
                    return {
                        "success": True,
                        "file_id": file_id,
                        "imagen_url": direct_url,
                        "source": "google_drive_api"
                    }
                else:
                    print(f"[GoogleDriveService] Drive API status {resp.status_code}: {resp.text}")
            except Exception as e:
                print(f"[GoogleDriveService] Drive API exception: {e}")

        # Fallback: Data URI base64 string
        encoded = base64.b64encode(file_content).decode("utf-8")
        data_uri = f"data:{content_type};base64,{encoded}"
        return {
            "success": True,
            "file_id": f"local_{int(time.time())}",
            "imagen_url": data_uri,
            "source": "data_uri"
        }

google_drive_service = GoogleDriveService()
