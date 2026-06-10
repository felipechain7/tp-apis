# PrecioYa — Documentación técnica

TP APIs, WebSockets & Integrations 2026 · Chain · Canabe · Güelvenzu · Tailhade · Servent

---

## 1. Resumen del proyecto

**PrecioYa** es un comparador de precios de productos online. El usuario busca un
producto por nombre y la aplicación consulta **varias fuentes externas en paralelo**,
normaliza los resultados a un formato común, los **convierte a una misma moneda** usando
la cotización del dólar en vivo y los muestra **ordenados por precio**. El usuario puede
registrarse, guardar favoritos y consultar su historial de búsquedas.

La propuesta de valor: ahorrar tiempo y dinero centralizando la búsqueda y comparación de
productos de distintas tiendas en un solo lugar.

---

## 2. Arquitectura

```
Frontend (HTML + JS)  ──HTTP──>  Backend (Node + Express)  ──>  MongoDB Atlas
                                        │
                                        ├──> Mercado Libre API  (productos AR)
                                        ├──> FakeStore API      (productos con precio)
                                        ├──> DummyJSON API       (productos con precio)
                                        └──> DolarAPI            (cotización USD→ARS)
```

El backend está organizado en capas:

| Carpeta | Responsabilidad |
|---|---|
| `routes/` | Endpoints HTTP (auth, productos, favoritos, historial, ml) |
| `sources/` | **Adapters** de cada API externa. Cada uno expone `buscar(q, limite)` y devuelve productos normalizados |
| `services/` | Lógica transversal: `dolar.js` (conversión de monedas) y `mlToken.js` (OAuth de Mercado Libre) |
| `models/` | Esquemas de Mongoose (Usuario, Favorito, Búsqueda) |
| `middleware/` | `auth.js` — verificación de JWT |

**Por qué adapters:** cada fuente devuelve los datos en un formato distinto. Cada adapter
traduce su respuesta al mismo objeto normalizado, así el resto de la app (agregador,
frontend) no sabe ni le importa de qué API vino cada producto. Sumar una nueva tienda no
toca el frontend (ver sección 7).

### Forma normalizada de un producto

```js
{
  fuente_id,    // id único con prefijo, ej "ml-MLA123", "dummyjson-5"
  fuente_api,   // "mercadolibre" | "fakestore" | "dummyjson"
  fuente_label, // nombre lindo para mostrar
  nombre, precio, moneda,        // precio en moneda original (USD o ARS)
  precio_ars, precio_usd,        // calculados por el servicio de conversión
  imagen_url, url_compra, tienda, categoria,
  disponible, condicion, envio_gratis,
  sin_precio    // true cuando la fuente no expone precio (catálogo de ML)
}
```

---

## 3. APIs externas integradas

| API | Para qué | Auth | Estado |
|---|---|---|---|
| **Mercado Libre** | Productos reales del catálogo argentino | OAuth (client_credentials / authorization_code) | Ver nota ⚠️ |
| **FakeStore** (`fakestoreapi.com`) | Catálogo con precios en USD | No requiere clave | ✅ |
| **DummyJSON** (`dummyjson.com`) | Catálogo con precios, stock, descuento | No requiere clave | ✅ |
| **DolarAPI** (`dolarapi.com`) | Cotización del dólar MEP en Argentina | No requiere clave | ✅ |

### ⚠️ Nota importante sobre Mercado Libre

Mercado Libre **restringió en 2024 el acceso público a la búsqueda de items** (la que
incluye precios). Hoy:

- `GET /sites/MLA/search` (items con precio) → **403 forbidden**, incluso con token de app.
- `GET /products/search` (catálogo) → **funciona** con token `client_credentials`, pero
  devuelve nombre, imagen, specs y link **sin precio** (`buy_box_winner` viene `null` con
  tokens de aplicación).

Por eso el adapter de ML (`sources/mercadolibre.js`) tiene **dos caminos**:

1. **Con token de usuario** (OAuth `authorization_code`): intenta la búsqueda de items con
   precio. Si ML lo permite, mostramos precios reales de Mercado Libre.
2. **Fallback al catálogo** (token de app): si no hay token de usuario o ML devuelve 403,
   mostramos el producto real con link "Ver en Mercado Libre" pero sin precio
   (`sin_precio: true`). Estas tarjetas se ordenan al final.

Así la app **nunca se rompe**: aunque ML no entregue precios, las otras fuentes garantizan
la comparación. La conexión OAuth de ML es opcional y se explica en el README.

### DolarAPI: una integración que *aplica* el dato

DolarAPI no es decorativa. Como FakeStore y DummyJSON devuelven precios en **USD** y
Mercado Libre en **ARS**, no se podrían comparar entre sí. El servicio `dolar.js` toma la
cotización del dólar MEP y calcula `precio_ars` y `precio_usd` para **cada** producto, lo
que permite (a) ordenarlos todos por una moneda común y (b) que el usuario alterne la
vista entre ARS y USD.

---

## 4. Backend — Endpoints

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Registrar usuario (devuelve JWT) | No |
| POST | `/api/auth/login` | Login (devuelve JWT) | No |
| GET | `/api/productos/buscar?q=laptop&limite=12&fuentes=` | Busca en todas las fuentes, convierte y ordena | Opcional* |
| GET | `/api/productos/cotizacion` | Cotización actual del dólar | No |
| POST | `/api/favoritos` | Guardar un favorito | ✅ JWT |
| GET | `/api/favoritos` | Listar mis favoritos | ✅ JWT |
| DELETE | `/api/favoritos/:fuente_id` | Eliminar un favorito | ✅ JWT |
| GET | `/api/historial` | Ver historial de búsquedas | ✅ JWT |
| GET | `/api/ml/auth` | Iniciar OAuth de Mercado Libre | No |
| GET | `/api/ml/callback` | Callback de ML (guarda tokens) | No |
| GET | `/api/ml/status` | Diagnóstico: ¿ML entrega precios? | No |

\* Si se manda el header `Authorization`, la búsqueda queda registrada en el historial del
usuario.

El parámetro opcional `fuentes` permite limitar qué APIs consultar, ej:
`?fuentes=mercadolibre,dummyjson`.

---

## 5. Base de datos — Justificación (SQL vs NoSQL)

Se eligió **MongoDB (NoSQL)** por:

- **Datos heterogéneos:** cada API externa devuelve campos distintos para un producto. Un
  documento flexible se adapta sin migrar el esquema.
- **`filtros_json` en Búsqueda:** los filtros varían entre búsquedas (categoría, rango de
  precio, fuentes); un campo documento es ideal.
- **Free tier de MongoDB Atlas:** permite desplegar la base en la nube sin costo.

Para un dominio con muchas relaciones fuertes (ej. un sistema bancario con cuentas,
transferencias y movimientos vinculados) se hubiera elegido SQL (PostgreSQL/MySQL).

### Entidades

- **Usuario** — credenciales (con `password_hash` de bcrypt), `rol`, `creado_en`.
- **Favorito** — producto guardado por un usuario. Índice único `(usuario_id, fuente_id)`
  para no duplicar. Guarda la moneda y los precios convertidos.
- **Búsqueda** — historial: `termino`, `filtros_json`, `resultados`, `realizado_en`.

---

## 6. Seguridad

Mecanismos implementados (la consigna pedía al menos uno):

- **JWT** (`jsonwebtoken`): las rutas de favoritos e historial exigen un token válido. El
  token es *stateless* — el servidor no guarda sesión, lo que facilita escalar
  horizontalmente.
- **bcrypt** (`bcryptjs`): las contraseñas se hashean con cost factor 10 y salt único por
  usuario. Nunca se guarda texto plano. Se eligió bcrypt sobre MD5/SHA porque es lento a
  propósito y resistente a rainbow tables.
- **Variables de entorno** (`.env`): credenciales fuera del código. `.env` y
  `.ml_token.json` están en `.gitignore`. Hay un `.env.example` como plantilla.
- **CORS** configurado para el frontend.

> 🔐 **Antes de entregar/desplegar:** rotar `JWT_SECRET` (que sea largo y aleatorio, distinto
> de cualquier password), y regenerar el usuario/clave de MongoDB Atlas si alguna vez se
> subieron a un repo.

---

## 7. Cómo ampliar la app integrando nuevas APIs

La arquitectura de adapters está pensada para esto. Para sumar una nueva tienda (ej.
*FakeStore2*, *eBay*, una API de RapidAPI, etc.):

**Paso 1 — Crear el adapter** en `backend/sources/nuevaapi.js`:

```js
const axios = require('axios');

async function buscar(q, limite = 12) {
  const { data } = await axios.get('https://api.nuevatienda.com/search', {
    params: { query: q, limit: limite }, timeout: 12000
  });
  // Traducir la respuesta al formato normalizado de PrecioYa:
  return data.items.map((item) => ({
    fuente_id:    `nuevaapi-${item.id}`,
    fuente_api:   'nuevaapi',
    fuente_label: 'Nueva Tienda',
    nombre:       item.name,
    precio:       item.price,
    moneda:       'USD',           // o 'ARS' según la API
    imagen_url:   item.image,
    url_compra:   item.url,
    tienda:       item.store,
    categoria:    item.category,
    disponible:   true,
    condicion:    'Nuevo',
    envio_gratis: false
  }));
}

module.exports = { buscar, fuente_api: 'nuevaapi' };
```

**Paso 2 — Registrarlo** en `backend/routes/productos.js`, en el objeto `FUENTES`:

```js
const FUENTES = {
  mercadolibre: require('../sources/mercadolibre'),
  fakestore:    require('../sources/fakestore'),
  dummyjson:    require('../sources/dummyjson'),
  nuevaapi:     require('../sources/nuevaapi')   // ← nueva línea
};
```

**Listo.** El agregador la consulta automáticamente en paralelo (`Promise.allSettled`), la
conversión de monedas y el orden por precio ya funcionan, y el frontend la muestra con su
badge sin tocar una línea. Si una fuente falla, las demás siguen respondiendo.

Para darle color al badge, agregar en el CSS del frontend:
`.src-nuevaapi { background: #color; }`.

---

## 8. Despliegue — Análisis comparativo de proveedores cloud

El proyecto tiene tres piezas a desplegar: **backend** (Node persistente), **frontend**
(estático) y **base de datos** (MongoDB Atlas, que ya corre en la nube en su free tier).

Para el backend comparamos dos proveedores **PaaS** (Platform as a Service), que abstraen
la infraestructura y son los más adecuados para un proyecto de este tamaño:

| Criterio | **Render** | **Railway** |
|---|---|---|
| **Modelo** | PaaS, deploy desde GitHub | PaaS, deploy desde GitHub/CLI |
| **Costo (free tier)** | Web service gratis, **pero se duerme** tras 15 min de inactividad (primer request tarda ~30s en despertar) | **$5 de crédito gratis/mes** por uso; no se duerme mientras haya crédito |
| **Costo (pago)** | Desde **US$7/mes** (instancia siempre activa) | **Pago por uso** (CPU/RAM/red); útil si el tráfico es bajo y variable |
| **Escalabilidad** | Escalado vertical y horizontal (varias instancias) en planes pagos; load balancer incluido | Escalado vertical sencillo; horizontal disponible; bueno para crecer gradualmente |
| **Servicios útiles** | PostgreSQL y Redis administrados, cron jobs, HTTPS y dominios automáticos, variables de entorno | PostgreSQL/MySQL/Redis/Mongo en un click, HTTPS automático, métricas en vivo, muy buena DX |
| **Curva de aprendizaje** | Muy baja, orientado a principiantes | Muy baja, CLI cómoda |
| **Ideal para** | Demo y MVP gratis sin tarjeta | Proyectos con tráfico variable que no quieren el "cold start" |

**Decisión para PrecioYa:** **Render** para el despliegue inicial (gratis, suficiente para
la demo del TP; el único costo es el "cold start" de ~30s tras inactividad, irrelevante en
una presentación). Si la app creciera y el cold start molestara, **Railway** (pago por uso)
o el plan pago de Render serían el siguiente paso.

**Comparación con un proveedor IaaS (AWS), como referencia:** AWS (EC2 + DocumentDB/Atlas +
Load Balancer) ofrece muchísima más potencia y control, y es lo que usaríamos a escala de
miles de usuarios concurrentes (autoscaling, multi-región, CDN con CloudFront). La
contracara es complejidad y costo: hay que administrar la infraestructura uno mismo y el
free tier es limitado en el tiempo. Para un TP es sobredimensionado; lo mencionamos como el
camino de crecimiento "enterprise".

> **Frontend:** al ser un `index.html` estático puede ir gratis a **Netlify**, **Vercel** o
> **GitHub Pages**. Solo hay que editar `BACKEND_PROD` en `index.html` con la URL del backend
> desplegado.

### Pasos de despliegue (Render + Netlify)

**Backend en Render:**
1. Subir el repo a GitHub.
2. En Render → *New > Web Service* → conectar el repo.
3. Root directory: `comparador-precios/backend`. Build: `npm install`. Start: `npm start`.
4. Cargar las variables de entorno (las del `.env`): `MONGODB_URI`, `JWT_SECRET`, `PORT`,
   `ML_APP_ID`, `ML_CLIENT_SECRET`, `ML_REDIRECT_URI`.
5. En MongoDB Atlas → *Network Access* → permitir la IP de Render (o `0.0.0.0/0` para la demo).
6. Si se usa OAuth de ML, actualizar `ML_REDIRECT_URI` a `https://TU-BACKEND.onrender.com/api/ml/callback`
   y registrar esa misma URL en la app de Mercado Libre.

**Frontend en Netlify:**
1. Editar `BACKEND_PROD` en `frontend/index.html` con la URL del backend de Render.
2. En Netlify → arrastrar la carpeta `frontend` (o conectar el repo, publish directory `comparador-precios/frontend`).

---

## 9. Roles del equipo

| Rol | Responsabilidad | Integrante |
|---|---|---|
| Líder Técnico | Arquitectura y código | _completar_ |
| Product Owner | Visión de negocio | _completar_ |
| UX Designer | Interfaz y experiencia | _completar_ |
| Infraestructura | Cloud y despliegue | _completar_ |

---

## 10. Modelo de negocio

- **Publicidad / destacados:** tiendas pagan para aparecer primero en los resultados.
- **Acuerdos con tiendas:** e-commerce chicos pagan por visibilidad en la plataforma.
- **Versión premium:** alertas de baja de precio, seguimiento de productos, comparaciones
  avanzadas (la entidad `ALERTA_PRECIO` del modelo original soporta esto).
