# ☕ Cafeteria Loyalty Cards API - Backend FastAPI

Backend modular en Python con FastAPI y Supabase para el Sistema de Tarjetas de Lealtad y Gestión de Puntos de Cafetería Física. Listo para desplegar en **Render.com**.

---

## 🚀 Guía de Despliegue en Render (Paso a Paso)

Existen **dos métodos** para desplegar esta API en Render:

---

### Opción A: Despliegue Automático mediante Blueprint (`render.yaml`) - RECOMENDADO

1. **Sube tu código a GitHub** (asegúrate de incluir la carpeta `Backend/` o hacer push a la raíz de tu repositorio).
2. Entra a [Render Dashboard](https://dashboard.render.com/) e inicia sesión.
3. Haz clic en **New +** y selecciona **Blueprint**.
4. Conecta tu repositorio de GitHub.
5. Render detectará automáticamente el archivo `render.yaml`.
6. En la sección de Variables de Entorno en Render, completa los valores requeridos:
   - `SUPABASE_URL`: Tu URL del proyecto en Supabase (ej. `https://xyz.supabase.co`).
   - `SUPABASE_KEY`: Tu Clave de API de Supabase (Anon o Service Role key).
   - `JWT_SECRET_KEY`: Una clave secreta de al menos 32 caracteres (o deja que Render la genere).
7. Haz clic en **Apply** ¡y Render construirá y desplegará tu API en minutos!

---

### Opción B: Despliegue Manual como Web Service

1. Entra a [Render Dashboard](https://dashboard.render.com/).
2. Haz clic en **New +** -> **Web Service**.
3. Conecta tu repositorio de GitHub.
4. Configura los datos del servicio:
   - **Name:** `cafeteria-loyalty-backend`
   - **Root Directory:** `Backend` (o déjalo en blanco si el repo está en la raíz)
   - **Environment:** `Python 3`
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command:** `gunicorn -w 2 -k uvicorn.workers.UvicornWorker app.main:app`
5. Agrega las **Environment Variables**:
   - `ENVIRONMENT`: `production`
   - `DEBUG`: `false`
   - `SUPABASE_URL`: `https://tu-proyecto.supabase.co`
   - `SUPABASE_KEY`: `tu-supabase-key`
   - `JWT_SECRET_KEY`: `tu-secret-key-super-seguro`
   - `BACKEND_CORS_ORIGINS`: `*` (o la URL de tu frontend en producción)
6. Haz clic en **Create Web Service**.

---

## 💻 Ejecución Local en Desarrollo

1. **Crear entorno virtual (opcional pero recomendado):**
   ```bash
   python -m venv venv
   # En Windows:
   venv\Scripts\activate
   # En Linux/Mac:
   source venv/bin/activate
   ```

2. **Instalar dependencias:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configurar `.env`:**
   Copia el archivo `.env.example` a `.env` y coloca tus credenciales de Supabase:
   ```bash
   cp .env.example .env
   ```

4. **Ejecutar el servidor localmente:**
   ```bash
   uvicorn app.main:app --reload
   ```

5. **Acceder a la documentación interactiva:**
   - Swagger UI: `http://127.0.0.1:8000/docs`
   - ReDoc: `http://127.0.0.1:8000/redoc`
   - Health Check: `http://127.0.0.1:8000/health`

---

## 📁 Estructura del Proyecto

```text
/Backend
├── /app
│   ├── /api/v1/users       # Endpoints REST de Clientes/Usuarios
│   ├── /core               # Configuración (.env, JWT, Rate Limiter)
│   ├── /db                 # Cliente Supabase
│   ├── /models             # Modelos Pydantic v2
│   ├── /services           # Lógica de Negocio CRUD
│   └── main.py             # App FastAPI y Middlewares
├── .env.example
├── .dockerignore
├── Dockerfile              # Imagen Docker multi-stage para producción
├── Procfile                # Comando de proceso para PaaS
├── render.yaml             # Blueprint listo para Render.com
├── requirements.txt
└── README.md
```
