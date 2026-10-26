"""
Script para migrar clientes y transacciones desde la base de datos anterior
hacia la nueva base de datos dedicada de Supabase.

Uso:
  python migrate_data_to_new_supabase.py
"""

import sys
import os
from supabase import create_client

def run_migration():
    print("==========================================================")
    print("  MIGRACIÓN DE DATOS A NUEVA BASE DE DATOS SUPABASE")
    print("==========================================================")
    
    # Supabase anterior (origen)
    old_url = input("Ingresa la URL de la base de datos ANTIGUA (o presiona Enter para usar la actual en .env): ").strip()
    old_key = input("Ingresa la KEY de la base de datos ANTIGUA (o presiona Enter para usar la actual en .env): ").strip()
    
    if not old_url or not old_key:
        from app.core.config import settings
        old_url = settings.SUPABASE_URL
        old_key = settings.SUPABASE_KEY

    # Supabase nuevo (destino)
    new_url = input("\nIngresa la NUEVA SUPABASE_URL: ").strip()
    new_key = input("Ingresa la NUEVA SUPABASE_KEY (anon o service_role): ").strip()

    if not new_url or not new_key:
        print("[Error] Debes ingresar la URL y Key del nuevo proyecto de Supabase.")
        return

    print("\n1. Conectando a ambas bases de datos...")
    try:
        old_client = create_client(old_url, old_key)
        new_client = create_client(new_url, new_key)
        print("✓ Conexiones establecidas.")
    except Exception as e:
        print(f"[Error] Fallo de conexión: {e}")
        return

    # 1. Migrar Usuarios / Clientes Activos
    print("\n2. Extrayendo clientes de la base antigua...")
    try:
        users_res = old_client.table("users").select("*").execute()
        users = users_res.data or []
        print(f"✓ Se encontraron {len(users)} clientes.")
        
        migrated_users = 0
        for u in users:
            # Limpiar tenant_id para independencia completa
            clean_user = {k: v for k, v in u.items() if k != "tenant_id"}
            try:
                new_client.table("users").upsert(clean_user).execute()
                migrated_users += 1
            except Exception as e:
                print(f"  [Aviso] No se pudo migrar usuario {u.get('first_name')}: {e}")
        print(f"✓ {migrated_users} clientes migrados exitosamente.")
    except Exception as e:
        print(f"[Error migrando usuarios]: {e}")

    # 2. Migrar Transacciones
    print("\n3. Extrayendo historial de transacciones...")
    try:
        tx_res = old_client.table("transactions").select("*").execute()
        txs = tx_res.data or []
        print(f"✓ Se encontraron {len(txs)} transacciones.")
        
        migrated_txs = 0
        for tx in txs:
            clean_tx = {k: v for k, v in tx.items() if k != "tenant_id"}
            try:
                new_client.table("transactions").upsert(clean_tx).execute()
                migrated_txs += 1
            except Exception as e:
                print(f"  [Aviso] No se pudo migrar transacción {tx.get('id')}: {e}")
        print(f"✓ {migrated_txs} transacciones migradas exitosamente.")
    except Exception as e:
        print(f"[Error migrando transacciones]: {e}")

    print("\n==========================================================")
    print("  ¡MIGRACIÓN FINALIZADA CON ÉXITO!")
    print("  Recuerda actualizar Backend/.env con tu nueva URL y Key.")
    print("==========================================================")

if __name__ == "__main__":
    run_migration()
