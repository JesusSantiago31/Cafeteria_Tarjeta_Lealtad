-- Script SQL para Supabase / PostgreSQL
-- Ejecuta este script en el editor SQL de Supabase

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Usuarios / Clientes (si no existe)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    loyalty_code VARCHAR(50) UNIQUE NOT NULL,
    current_points INT DEFAULT 0,
    total_points_earned INT DEFAULT 0,
    total_points_spent INT DEFAULT 0,
    total_purchases_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Productos (Recompensas)
CREATE TABLE IF NOT EXISTS products (
    id_prod UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    producto VARCHAR(150) NOT NULL,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    puntos_requeridos INT NOT NULL DEFAULT 0,
    piezas_disponibles INT NOT NULL DEFAULT 0,
    imagen_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla Transaccional de Compras y Movimientos de Puntos
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('PURCHASE', 'REDEMPTION', 'ADJUSTMENT')), 
    -- 'PURCHASE': Compra (suma puntos)
    -- 'REDEMPTION': Canje de recompensa (resta puntos)
    -- 'ADJUSTMENT': Ajuste manual por el administrador
    
    purchase_amount DECIMAL(10,2) DEFAULT 0.00, -- Monto en dinero de la compra ($)
    points_transacted INT NOT NULL,              -- Cantidad de puntos asignados (+) o descontados (-)
    description TEXT,                            -- Detalles (ej. "Compra de Cappuccino y Bagel")
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Poblado de datos iniciales en la tabla de productos (Recompensas)
INSERT INTO products (id_prod, producto, precio, puntos_requeridos, piezas_disponibles, imagen_url)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Café Cappuccino', 55.00, 100, 4, '/products/cappuccino.png'),
    ('22222222-2222-2222-2222-222222222222', 'Bagel de Jamón y Queso', 75.00, 150, 3, '/products/bagel.svg'),
    ('33333333-3333-3333-3333-333333333333', 'Dona Glaseada', 35.00, 60, 12, '/products/donut.svg'),
    ('44444444-4444-4444-4444-444444444444', 'Iced Latte Caramel', 65.00, 120, 5, '/products/latte.svg'),
    ('55555555-5555-5555-5555-555555555555', 'Muffin de Arándanos', 45.00, 80, 2, '/products/muffin.svg')
ON CONFLICT (id_prod) DO NOTHING;
