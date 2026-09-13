from supabase import create_client, Client
from app.core.config import settings

_supabase_client: Client | None = None


def get_supabase_client() -> Client:
    """
    Returns a singleton instance of the Supabase Client.
    Initializes client using URL and Key configured in settings.
    """
    global _supabase_client
    if _supabase_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_KEY must be configured in environment variables or .env file"
            )
        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return _supabase_client
