import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "."))

from app.services.user_service import user_service

def test_get_users():
    print("--- Diagnostic Test for UserService.get_users ---")
    try:
        items, total = user_service.get_users(skip=0, limit=50)
        print(f"Success! Items count: {len(items)}, Total: {total}")
        print(f"Items: {items}")
    except Exception as e:
        print(f"Error caught: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_get_users()
