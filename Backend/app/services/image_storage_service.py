import base64
import time
from typing import Dict, Any

class ImageStorageService:
    def upload_file(self, file_content: bytes, filename: str, content_type: str = "image/jpeg") -> Dict[str, Any]:
        """
        Processes and stores product image files as compressed Data URIs or Supabase Storage links.
        """
        # Try Supabase Storage if configured
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
        except Exception:
            pass

        # Fallback to direct Base64 Data URI
        encoded = base64.b64encode(file_content).decode("utf-8")
        data_uri = f"data:{content_type};base64,{encoded}"
        return {
            "success": True,
            "file_id": f"img_{int(time.time())}",
            "imagen_url": data_uri,
            "source": "data_uri"
        }

image_storage_service = ImageStorageService()
