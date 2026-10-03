import base64
import requests
from typing import Dict, Any, Optional
from app.core.config import settings

class ImgBBService:
    def __init__(self):
        self.api_key = getattr(settings, "IMGBB_API_KEY", "").strip()

    def upload_file(self, file_content: bytes, filename: str = "reward.jpg", content_type: str = "image/jpeg") -> Dict[str, Any]:
        """
        Uploads an image file to ImgBB cloud storage and returns the public display URL.
        """
        api_key = self.api_key or "b5b82c4bd2d6b3dd7b34b6f1261d7a8d"  # Default fallback API key if not configured in .env

        try:
            # 1. Base64 encode the file content
            base64_image = base64.b64encode(file_content).decode("utf-8")

            # 2. Call ImgBB API v1 upload endpoint
            payload = {
                "key": api_key,
                "image": base64_image,
                "name": filename.split('.')[0]
            }

            resp = requests.post("https://api.imgbb.com/1/upload", data=payload, timeout=20)

            if resp.status_code == 200:
                res_data = resp.json()
                if res_data.get("success"):
                    img_data = res_data.get("data", {})
                    public_url = img_data.get("display_url") or img_data.get("url")
                    return {
                        "success": True,
                        "file_id": img_data.get("id"),
                        "imagen_url": public_url,
                        "delete_url": img_data.get("delete_url"),
                        "source": "imgbb"
                    }

            print(f"[ImgBBService] API Response Error {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"[ImgBBService] Exception during upload: {e}")

        # Resilient fallback: Base64 Data URI if ImgBB network call fails
        encoded = base64.b64encode(file_content).decode("utf-8")
        data_uri = f"data:{content_type};base64,{encoded}"
        return {
            "success": True,
            "file_id": f"local_{filename}",
            "imagen_url": data_uri,
            "source": "data_uri"
        }

imgbb_service = ImgBBService()
