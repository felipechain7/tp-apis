# PrecioYa — Comparador de Precios 🛒

TP APIs 2026 · Chain · Canabe · Güelvenzu · Tailhade · Servent

---

## 🚀 Cómo levantar el proyecto (paso a paso)

### 1. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 2. Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env
```

Abrir `.env` en WebStorm y completar:

```
MONGODB_URI=mongodb+srv://<usuario>:<password>@cluster0.xxxxx.mongodb.net/comparador?retryWrites=true&w=majority
JWT_SECRET=cualquier_string_largo_y_secreto_ej_2026austral
PORT=3000
```

> **MONGODB_URI**: ir a MongoDB Atlas → tu cluster → Connect → Drivers → copiar el string

### 3. Levantar el backend

```bash
# Dentro de la carpeta backend:
npm run dev
```

Deberías ver:
```
✅ Conectado a MongoDB Atlas
🚀 Servidor corriendo en http://localhost:3000
```

### 4. Abrir el frontend

Abrir el archivo `frontend/index.html` directamente en el navegador  
(doble click en WebStorm → Open in Browser)

---

## 📡 Endpoints disponibles

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Registrar usuario | No |
| POST | `/api/auth/login` | Login → retorna JWT | No |
| GET | `/api/productos/buscar?q=iphone` | Buscar en Mercado Libre | Opcional |
| GET | `/api/productos/:id` | Detalle de un producto | No |
| POST | `/api/favoritos` | Guardar favorito | ✅ JWT |
| GET | `/api/favoritos` | Ver mis favoritos | ✅ JWT |
| DELETE | `/api/favoritos/:fuente_id` | Eliminar favorito | ✅ JWT |
| GET | `/api/historial` | Ver historial de búsquedas | ✅ JWT |

---

## 🏗️ Estructura del proyecto

```
comparador-precios/
├── backend/
│   ├── server.js              ← Punto de entrada
│   ├── .env                   ← Variables de entorno (NO subir a Git)
│   ├── .env.example           ← Template para el .env
│   ├── package.json
│   ├── models/
│   │   ├── Usuario.js         ← Modelo de usuario + bcrypt
│   │   ├── Favorito.js        ← Productos favoritos
│   │   └── Busqueda.js        ← Historial de búsquedas
│   ├── routes/
│   │   ├── auth.js            ← Register + Login con JWT
│   │   ├── productos.js       ← Búsqueda en Mercado Libre API
│   │   ├── favoritos.js       ← CRUD favoritos
│   │   └── historial.js       ← Historial de búsquedas
│   └── middleware/
│       └── auth.js            ← Verificación de JWT
└── frontend/
    └── index.html             ← App completa (HTML + CSS + JS)
```

---

## 🔒 Seguridad implementada

- **JWT** para autenticar rutas protegidas (favoritos, historial)
- **bcrypt** para hashear contraseñas (nunca se guarda texto plano)
- **CORS** configurado para desarrollo local

## ☁️ API externa usada

- **Mercado Libre API** (pública, sin clave): `https://api.mercadolibre.com/sites/MLA/search?q=...`
