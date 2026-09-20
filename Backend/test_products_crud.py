import requests

BASE_URL = "http://localhost:8000/api/v1/products"

def test_products_crud():
    print("--- Testing Products API Endpoints ---")
    
    # 1. GET /api/v1/products/
    try:
        r = requests.get(f"{BASE_URL}/")
        print(f"GET /products/ status: {r.status_code}")
        items = r.json()
        print(f"Found {len(items)} products.")
    except Exception as e:
        print(f"GET failed: {e}")
        return

    # 2. POST /api/v1/products/ (Create)
    new_prod = {
        "producto": "Test Reward Item",
        "puntos_requeridos": 40,
        "precio": 35.0,
        "piezas_disponibles": 15,
        "imagen_url": "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=300"
    }
    
    try:
        r = requests.post(f"{BASE_URL}/", json=new_prod)
        print(f"POST /products/ status: {r.status_code}")
        created = r.json()
        print(f"Created product: {created}")
        created_id = created.get("id_prod")
    except Exception as e:
        print(f"POST failed: {e}")
        return

    # 3. PUT /api/v1/products/{id} (Update)
    if created_id:
        update_data = {
            "producto": "Test Reward Item Updated",
            "puntos_requeridos": 45,
            "piezas_disponibles": 20
        }
        try:
            r = requests.put(f"{BASE_URL}/{created_id}", json=update_data)
            print(f"PUT /products/{created_id} status: {r.status_code}")
            updated = r.json()
            print(f"Updated product: {updated}")
        except Exception as e:
            print(f"PUT failed: {e}")

        # 4. DELETE /api/v1/products/{id} (Delete)
        try:
            r = requests.delete(f"{BASE_URL}/{created_id}")
            print(f"DELETE /products/{created_id} status: {r.status_code}")
            print(f"Delete response: {r.json()}")
        except Exception as e:
            print(f"DELETE failed: {e}")

if __name__ == "__main__":
    test_products_crud()
