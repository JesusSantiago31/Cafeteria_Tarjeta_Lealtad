-- ==============================================================================
-- SCRIPT DE INICIALIZACIÓN COMPLETA PARA NUEVA BASE DE DATOS EN SUPABASE
-- PROYECTO: CAFETERÍA - TARJETA DE LEALTAD DIGITAL & GOOGLE WALLET
-- ==============================================================================
-- INSTRUCCIONES:
-- 1. Crea un nuevo proyecto en https://supabase.com
-- 2. Ve al menú lateral "SQL Editor" -> "New Query"
-- 3. Pega todo el contenido de este archivo y presiona "RUN"
-- 4. Copia tu URL del proyecto y tu 'anon public' o 'service_role' key
-- 5. Actualiza tu archivo Backend/.env con los nuevos valores.
-- ==============================================================================

-- 0. HABILITAR EXTENSIONES NECESARIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- FUNCIÓN REUTILIZABLE PARA ACTUALIZAR COLUMNA 'updated_at'
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ==============================================================================
-- 1. TABLA: users (Clientes, Puntos, Sellos y Estado de Google Wallet)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    first_name VARCHAR(150) NOT NULL,
    last_name VARCHAR(100) DEFAULT '',
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    loyalty_code VARCHAR(50) UNIQUE NOT NULL,
    current_points INT NOT NULL DEFAULT 0,
    total_points_earned INT NOT NULL DEFAULT 0,
    total_points_spent INT NOT NULL DEFAULT 0,
    total_purchases_count INT NOT NULL DEFAULT 0,
    current_stamps INT NOT NULL DEFAULT 0,
    max_stamps INT NOT NULL DEFAULT 10,
    total_stamps_earned INT NOT NULL DEFAULT 0,
    wallet_hero_image_url TEXT,
    role VARCHAR(50) DEFAULT 'customer',
    password_hash TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id UUID DEFAULT NULL, -- Nullable para compatibilidad defensiva sin bloqueos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_loyalty_code ON public.users(loyalty_code);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- Trigger de updated_at para users
DROP TRIGGER IF EXISTS update_users_modtime ON public.users;
CREATE TRIGGER update_users_modtime
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==============================================================================
-- 2. TABLA: products (Catálogo de Recompensas y Productos de Venta)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id_prod UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    producto VARCHAR(150) NOT NULL,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    puntos_requeridos INT NOT NULL DEFAULT 0,
    piezas_disponibles INT NOT NULL DEFAULT 0,
    imagen_url TEXT,
    tipo VARCHAR(20) NOT NULL DEFAULT 'recompensa', -- 'recompensa' o 'venta'
    tenant_id UUID DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_tipo ON public.products(tipo);


-- ==============================================================================
-- 3. TABLA: transactions (Historial de Compras, Canjes de Puntos y Sellos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- 'PURCHASE', 'REDEMPTION', 'ADJUSTMENT', 'STAMP_REDEMPTION'
    purchase_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    points_transacted INT NOT NULL DEFAULT 0,
    description TEXT,
    tenant_id UUID DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);


-- ==============================================================================
-- 4. TABLA: points_rules (Reglas de Asignación de Puntos Semanales y Globales)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.points_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    monto_dinero DECIMAL(10,2) NOT NULL,
    puntos_otorgados INT NOT NULL,
    descripcion TEXT,
    dia_semana INT DEFAULT NULL, -- 1=Lunes, 2=Martes... 7=Domingo, NULL=Regla Base
    dia_nombre VARCHAR(30) DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tenant_id UUID DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DROP TRIGGER IF EXISTS update_points_rules_modtime ON public.points_rules;
CREATE TRIGGER update_points_rules_modtime
BEFORE UPDATE ON public.points_rules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==============================================================================
-- 5. TABLA: wallet_settings (Configuración de la Tarjeta y Google Wallet)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wallet_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    max_sellos INT NOT NULL DEFAULT 10,
    dias_caducidad_puntos INT NOT NULL DEFAULT 60,
    recompensa_sellos_descripcion TEXT NOT NULL DEFAULT '1 Bebida Grande a Elección',
    instagram_url TEXT DEFAULT 'https://www.instagram.com/margaritas.cafe11',
    facebook_url TEXT DEFAULT 'https://www.facebook.com/61589613670494/',
    terminos_url TEXT DEFAULT 'https://cafeteria.com/terminos',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DROP TRIGGER IF EXISTS update_wallet_settings_modtime ON public.wallet_settings;
CREATE TRIGGER update_wallet_settings_modtime
BEFORE UPDATE ON public.wallet_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==============================================================================
-- 6. TABLA: stamp_images (Galería Dinámica de Ilustraciones de Sellos 0 a 10)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.stamp_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    stamp_count INT UNIQUE NOT NULL,
    nivel_sello INT,
    image_url TEXT NOT NULL,
    imagen_url TEXT,
    wallet_hero_url TEXT,
    nombre_sello VARCHAR(100),
    tenant_id UUID DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Mantener nivel_sello e imagen_url sincronizados automáticamente
CREATE OR REPLACE FUNCTION sync_stamp_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.nivel_sello IS NULL THEN
        NEW.nivel_sello = NEW.stamp_count;
    END IF;
    IF NEW.imagen_url IS NULL THEN
        NEW.imagen_url = NEW.image_url;
    END IF;
    IF NEW.wallet_hero_url IS NULL THEN
        NEW.wallet_hero_url = NEW.image_url;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_stamp_columns ON public.stamp_images;
CREATE TRIGGER trigger_sync_stamp_columns
BEFORE INSERT OR UPDATE ON public.stamp_images
FOR EACH ROW EXECUTE FUNCTION sync_stamp_columns();

-- Vista de compatibilidad para código que consulte stamp_levels
CREATE OR REPLACE VIEW public.stamp_levels AS
SELECT
    id,
    stamp_count AS nivel_sello,
    image_url AS imagen_url,
    image_url,
    wallet_hero_url,
    nombre_sello,
    created_at
FROM public.stamp_images;


-- ==============================================================================
-- 7. DESHABILITAR ROW LEVEL SECURITY (RLS) PARA ACCESO DIRECTO DESDE BACKEND
-- ==============================================================================
-- El backend se encarga de las validaciones de negocio. Esto garantiza cero bloqueos 401/403.
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stamp_images DISABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- 8. STORAGE BUCKET: reward-images (Almacenamiento público para imágenes)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('reward-images', 'reward-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de lectura y escritura para el bucket de imágenes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Public Access for reward-images'
    ) THEN
        CREATE POLICY "Public Access for reward-images"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'reward-images');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Public Upload for reward-images'
    ) THEN
        CREATE POLICY "Public Upload for reward-images"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'reward-images');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' AND policyname = 'Public Update for reward-images'
    ) THEN
        CREATE POLICY "Public Update for reward-images"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'reward-images');
    END IF;
END $$;


-- ==============================================================================
-- 9. DATOS INICIALES (SEMILLA COMPLETA DEL SISTEMA)
-- ==============================================================================

-- A. Configuración de Billetera
INSERT INTO public.wallet_settings (
    id, max_sellos, dias_caducidad_puntos, recompensa_sellos_descripcion,
    instagram_url, facebook_url, terminos_url, is_active
)
VALUES (
    '265a4058-c9b2-4bf5-b4cc-1dc38828a6e0',
    10,
    60,
    '1 Bebida Grande a Elección',
    'https://www.instagram.com/margaritas.cafe11',
    'https://www.facebook.com/61589613670494/',
    'https://cafeteria.com/terminos',
    true
)
ON CONFLICT (id) DO UPDATE SET
    max_sellos = EXCLUDED.max_sellos,
    dias_caducidad_puntos = EXCLUDED.dias_caducidad_puntos,
    recompensa_sellos_descripcion = EXCLUDED.recompensa_sellos_descripcion;

-- B. Niveles de Sellos con Imágenes Oficiales de Tarjeta Digital (0 a 10 Sellos)
INSERT INTO public.stamp_images (stamp_count, nivel_sello, image_url, imagen_url, wallet_hero_url, nombre_sello)
VALUES
    (0, 0, 'https://i.ibb.co/GQrTpxYw/0-Sellos.png', 'https://i.ibb.co/GQrTpxYw/0-Sellos.png', 'https://i.ibb.co/GQrTpxYw/0-Sellos.png', '0 Sellos - Inicial'),
    (1, 1, 'https://i.ibb.co/JjG2kJRr/1-Sellos.png', 'https://i.ibb.co/JjG2kJRr/1-Sellos.png', 'https://i.ibb.co/JjG2kJRr/1-Sellos.png', '1 Sello Acumulado'),
    (2, 2, 'https://i.ibb.co/23CXkDbT/2-Sellos.png', 'https://i.ibb.co/23CXkDbT/2-Sellos.png', 'https://i.ibb.co/23CXkDbT/2-Sellos.png', '2 Sellos Acumulados'),
    (3, 3, 'https://i.ibb.co/KjXHZyK7/3-Sellos-1.png', 'https://i.ibb.co/KjXHZyK7/3-Sellos-1.png', 'https://i.ibb.co/KjXHZyK7/3-Sellos-1.png', '3 Sellos Acumulados'),
    (4, 4, 'https://i.ibb.co/m5Tj1n8V/4-Sellos.png', 'https://i.ibb.co/m5Tj1n8V/4-Sellos.png', 'https://i.ibb.co/m5Tj1n8V/4-Sellos.png', '4 Sellos Acumulados'),
    (5, 5, 'https://i.ibb.co/dw0BT171/5-Sellos.png', 'https://i.ibb.co/dw0BT171/5-Sellos.png', 'https://i.ibb.co/dw0BT171/5-Sellos.png', '5 Sellos Acumulados'),
    (6, 6, 'https://i.ibb.co/Z112kkf5/6-Sellos.png', 'https://i.ibb.co/Z112kkf5/6-Sellos.png', 'https://i.ibb.co/Z112kkf5/6-Sellos.png', '6 Sellos Acumulados'),
    (7, 7, 'https://i.ibb.co/GfZM2VNh/7-Sellos.png', 'https://i.ibb.co/GfZM2VNh/7-Sellos.png', 'https://i.ibb.co/GfZM2VNh/7-Sellos.png', '7 Sellos Acumulados'),
    (8, 8, 'https://i.ibb.co/TBs9Nm1S/8-Sellos.png', 'https://i.ibb.co/TBs9Nm1S/8-Sellos.png', 'https://i.ibb.co/TBs9Nm1S/8-Sellos.png', '8 Sellos Acumulados'),
    (9, 9, 'https://i.ibb.co/QvvBsdyK/9-Sellos.png', 'https://i.ibb.co/QvvBsdyK/9-Sellos.png', 'https://i.ibb.co/QvvBsdyK/9-Sellos.png', '9 Sellos Acumulados'),
    (10, 10, 'https://i.ibb.co/KpKNDP4r/10-Sellos.png', 'https://i.ibb.co/KpKNDP4r/10-Sellos.png', 'https://i.ibb.co/KpKNDP4r/10-Sellos.png', '10 Sellos - ¡Completa!')
ON CONFLICT (stamp_count) DO UPDATE SET
    image_url = EXCLUDED.image_url,
    imagen_url = EXCLUDED.imagen_url,
    wallet_hero_url = EXCLUDED.wallet_hero_url;

-- C. Reglas de Puntos por Día de la Semana y Regla General
INSERT INTO public.points_rules (monto_dinero, puntos_otorgados, descripcion, dia_semana, dia_nombre, is_active)
VALUES
    (100.00, 10, 'Por cada 100 MXN consumidos se otorga 10 punto', NULL, 'Por Defecto', true),
    (500.00, 50, 'Lunes de Energía: Bonificación de 50 pts por cada $500', 1, 'Lunes', true),
    (300.00, 40, 'Martes Gourmet: Bonificación de 40 pts por cada $300', 2, 'Martes', true),
    (200.00, 25, 'Miércoles Mitad de Semana: Bonificación de 25 pts por cada $200', 3, 'Miércoles', true),
    (250.00, 30, 'Jueves Especial: Bonificación de 30 pts por cada $250', 4, 'Jueves', true),
    (350.00, 45, 'Viernes Casual: Bonificación de 45 pts por cada $350', 5, 'Viernes', true),
    (400.00, 50, 'Sábado Dulce: Bonificación de 50 pts por cada $400', 6, 'Sábado', true),
    (300.00, 35, 'Domingo Familiar: Bonificación de 35 pts por cada $300', 7, 'Domingo', true)
ON CONFLICT DO NOTHING;

-- D. Catálogo de Productos y Recompensas
INSERT INTO public.products (id_prod, producto, precio, puntos_requeridos, piezas_disponibles, imagen_url, tipo)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Café Cappuccino', 55.00, 100, 10, '/products/cappuccino.png', 'recompensa'),
    ('22222222-2222-2222-2222-222222222222', 'Bagel de Jamón y Queso', 75.00, 150, 8, '/products/bagel.svg', 'recompensa'),
    ('33333333-3333-3333-3333-333333333333', 'Dona Glaseada', 35.00, 60, 15, '/products/donut.svg', 'recompensa'),
    ('44444444-4444-4444-4444-444444444444', 'Iced Latte Caramel', 65.00, 120, 10, '/products/latte.svg', 'recompensa'),
    ('55555555-5555-5555-5555-555555555555', 'Muffin de Arándanos', 45.00, 80, 12, '/products/muffin.svg', 'recompensa'),
    ('b23393b4-71e2-4719-a0fc-14cc4deb0861', 'Capuchino Grande 400 ml', 30.00, 50, 10, 'https://i.ibb.co/ZpmKbJjb/Whats-App-Image-2026-09-26-at-10.jpg', 'recompensa')
ON CONFLICT (id_prod) DO UPDATE SET
    producto = EXCLUDED.producto,
    precio = EXCLUDED.precio,
    puntos_requeridos = EXCLUDED.puntos_requeridos,
    piezas_disponibles = EXCLUDED.piezas_disponibles;

-- ==============================================================================
-- ¡BASE DE DATOS LISTA Y OPTIMIZADA PARA CAFETERÍA LEALTAD!
-- ==============================================================================
