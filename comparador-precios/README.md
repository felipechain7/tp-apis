# PrecioYa — Comparador de Precios 🛒

TP APIs 2026 · Chain · Canabe · Güelvenzu · Tailhade · Servent

Comparador de precios que busca un producto en **varias tiendas a la vez** (Mercado Libre,
FakeStore, DummyJSON), convierte todos los precios a una moneda común usando la cotización
del dólar en vivo (**DolarAPI**) y los muestra ordenados de menor a mayor.

> 📄 La documentación técnica completa (arquitectura, justificación de DB, seguridad,
> comparativa cloud y cómo ampliar con nuevas APIs) está en **[DOCUMENTACION.md](DOCUMENTACION.md)**.

---

## 🚀 Cómo levantar el proyecto

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # y completar los valores (ver abajo)
npm run dev
```

Deberías ver:
```
✅ Conectado a MongoDB Atlas
🚀 Servidor corriendo en http://localhost:3000
```

### 2. Variables de entorno (`.env`)

```
MONGODB_URI=mongodb+srv://<usuario>:<password>@cluster0.xxxxx.mongodb.net/comparador?retryWrites=true&w=majority
JWT_SECRET=un_string_largo_y_aleatorio
PORT=3000

# Mercado Libre (opcional, ver más abajo)
ML_APP_ID=tu_app_id
ML_CLIENT_SECRET=tu_client_secret
ML_REDIRECT_URI=http://localhost:3000/api/ml/callback
```

- **MONGODB_URI**: MongoDB Atlas → cluster → Connect → Drivers → copiar el string.
- **JWT_SECRET**: cualquier string largo y aleatorio. **No reutilizar el password de Mongo.**

### 3. Frontend

Abrir `frontend/index.html` en el navegador (doble click), o servirlo con cualquier
servidor estático. El frontend detecta solo si está en local o en producción.

---

## 📡 Endpoints

Ver la tabla completa en [DOCUMENTACION.md § 4](DOCUMENTACION.md#4-backend--endpoints).
Los principales:

| Método | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/auth/register` · `/api/auth/login` | No |
| GET | `/api/productos/buscar?q=laptop` | Opcional |
| GET | `/api/productos/cotizacion` | No |
| POST · GET · DELETE | `/api/favoritos` | ✅ JWT |
| GET | `/api/historial` | ✅ JWT |

---

## 🔌 Conectar Mercado Libre (opcional)

La app funciona sin esto: si no conectás ML, igual aparecen productos de ML desde su
**catálogo** (con link, sin precio) más los precios de las otras tiendas.

Mercado Libre bloqueó la búsqueda pública de precios. Para **intentar** traer precios
reales de ML hay que conectar una cuenta por OAuth (una sola vez):

1. Tener una app creada en https://developers.mercadolibre.com.ar con la **Redirect URI**
   igual a `http://localhost:3000/api/ml/callback`.
2. Con el backend corriendo, entrar a **http://localhost:3000/api/ml/auth** → loguearse con
   la cuenta de ML → te redirige y guarda los tokens.
3. Verificar con **http://localhost:3000/api/ml/status**:
   - `items_habilitados: true` → ML entrega precios ✅
   - `items_habilitados: false` → ML sigue bloqueando; se usa el catálogo (sin precio).

> El token de usuario se guarda en `backend/.ml_token.json` (gitignored) y se refresca solo.

---

## 🏗️ Estructura

```
comparador-precios/
├── backend/
│   ├── server.js
│   ├── .env.example
│   ├── sources/        ← adapters de cada API (ml, fakestore, dummyjson)
│   ├── services/       ← dolar.js (conversión), mlToken.js (OAuth ML)
│   ├── routes/         ← auth, productos, favoritos, historial, ml
│   ├── models/         ← Usuario, Favorito, Busqueda
│   └── middleware/     ← auth.js (JWT)
├── frontend/
│   └── index.html      ← app completa (HTML + CSS + JS)
└── DOCUMENTACION.md    ← documentación técnica del TP
```

---

## 🔒 Seguridad

JWT (rutas protegidas) · bcrypt (contraseñas) · variables de entorno · CORS.
Ver [DOCUMENTACION.md § 6](DOCUMENTACION.md#6-seguridad).

## ☁️ Despliegue

Comparativa Render vs Railway y pasos de deploy en
[DOCUMENTACION.md § 8](DOCUMENTACION.md#8-despliegue--análisis-comparativo-de-proveedores-cloud).
