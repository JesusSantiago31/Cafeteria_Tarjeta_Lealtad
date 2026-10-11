-- ==============================================================
-- ACTUALIZACIÓN DE ESQUEMA DE BASE DE DATOS (SUPABASE / POSTGRESQL)
-- ==============================================================

-- 1. Agregar bandera 'tipo' en tabla products ('venta' para menú o 'recompensa' para canje de puntos)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'recompensa';

-- 2. Actualizar tabla points_rules para soportar reglas dinámicas por día de la semana (1=Lunes a 7=Domingo)
ALTER TABLE public.points_rules ADD COLUMN IF NOT EXISTS dia_semana INT DEFAULT NULL;
ALTER TABLE public.points_rules ADD COLUMN IF NOT EXISTS dia_nombre VARCHAR(20) DEFAULT NULL;

-- 3. Actualizar tabla wallet_settings para caducidad, recompensa estática de sellos y redes sociales
ALTER TABLE public.wallet_settings ADD COLUMN IF NOT EXISTS dias_caducidad_puntos INT DEFAULT 90;
ALTER TABLE public.wallet_settings ADD COLUMN IF NOT EXISTS recompensa_sellos_descripcion TEXT DEFAULT 'Bebida de cortesía a elegir';
ALTER TABLE public.wallet_settings ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT 'https://instagram.com/cafeteria';
ALTER TABLE public.wallet_settings ADD COLUMN IF NOT EXISTS facebook_url TEXT DEFAULT 'https://facebook.com/cafeteria';
ALTER TABLE public.wallet_settings ADD COLUMN IF NOT EXISTS terminos_url TEXT DEFAULT 'https://cafeteria.com/terminos';

-- 4. Semilla inicial de reglas semanales si la tabla está vacía
INSERT INTO public.points_rules (monto_dinero, puntos_otorgados, descripcion, dia_semana, dia_nombre, is_active)
SELECT 500.0, 50, 'Lunes de Energía: 50 pts por cada $500', 1, 'Lunes', true
WHERE NOT EXISTS (SELECT 1 FROM public.points_rules WHERE dia_semana = 1);

INSERT INTO public.points_rules (monto_dinero, puntos_otorgados, descripcion, dia_semana, dia_nombre, is_active)
SELECT 300.0, 40, 'Martes Gourmet: 40 pts por cada $300', 2, 'Martes', true
WHERE NOT EXISTS (SELECT 1 FROM public.points_rules WHERE dia_semana = 2);

INSERT INTO public.points_rules (monto_dinero, puntos_otorgados, descripcion, dia_semana, dia_nombre, is_active)
SELECT 200.0, 25, 'Miércoles Mitad de Semana: 25 pts por cada $200', 3, 'Miércoles', true
WHERE NOT EXISTS (SELECT 1 FROM public.points_rules WHERE dia_semana = 3);

INSERT INTO public.points_rules (monto_dinero, puntos_otorgados, descripcion, dia_semana, dia_nombre, is_active)
SELECT 250.0, 30, 'Jueves Especial: 30 pts por cada $250', 4, 'Jueves', true
WHERE NOT EXISTS (SELECT 1 FROM public.points_rules WHERE dia_semana = 4);

INSERT INTO public.points_rules (monto_dinero, puntos_otorgados, descripcion, dia_semana, dia_nombre, is_active)
SELECT 350.0, 45, 'Viernes Casual: 45 pts por cada $350', 5, 'Viernes', true
WHERE NOT EXISTS (SELECT 1 FROM public.points_rules WHERE dia_semana = 5);

INSERT INTO public.points_rules (monto_dinero, puntos_otorgados, descripcion, dia_semana, dia_nombre, is_active)
SELECT 400.0, 50, 'Sábado Dulce: 50 pts por cada $400', 6, 'Sábado', true
WHERE NOT EXISTS (SELECT 1 FROM public.points_rules WHERE dia_semana = 6);

INSERT INTO public.points_rules (monto_dinero, puntos_otorgados, descripcion, dia_semana, dia_nombre, is_active)
SELECT 300.0, 35, 'Domingo Familiar: 35 pts por cada $300', 7, 'Domingo', true
WHERE NOT EXISTS (SELECT 1 FROM public.points_rules WHERE dia_semana = 7);
