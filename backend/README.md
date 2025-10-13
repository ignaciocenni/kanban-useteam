# Backend - Kanban UseTeam

## 📌 Resumen

API REST + WebSocket construida con **NestJS** para gestionar tableros y tareas del proyecto Kanban. Expone endpoints para CRUD de boards/tasks, sincronización en tiempo real mediante Socket.IO y un endpoint para disparar la exportación del backlog a través de N8N.

Base URL por defecto: `http://localhost:3000`

## ✅ Requisitos

- Node.js ≥ 18
- MongoDB en ejecución (puerto sugerido `27018` via Docker)
- Instancia de N8N opcional para la exportación (puede correr en Docker)

## ⚙️ Instalación y ejecución

```bash
cd backend
npm install
npm run start:dev
```

El modo watch (`start:dev`) expone la API REST y los eventos WebSocket en el mismo puerto (`3000`).

## 🌱 Variables de entorno

Define un archivo `.env` en `backend/` (puedes copiarlo desde `../.env.example`).

| Variable | Valor por defecto | Descripción |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://localhost:27018/kanban-useteam` | Cadena de conexión para MongoDB. |
| `PORT` | `3000` | Puerto HTTP y WebSocket del servidor NestJS. |
| `NODE_ENV` | `development` | Entorno de ejecución. |
| `CORS_ORIGIN` | `http://localhost:5173` | Origen permitido para el frontend (`EventsGateway`). |
| `N8N_WEBHOOK_URL` | `http://localhost:5678/webhook/kanban-export` | Webhook que consumirá el flujo de N8N. |

## 📦 Scripts útiles

```bash
npm run start        # ejecuta NestJS sin watch
npm run start:dev    # watch mode (desarrollo)
npm run start:prod   # usa el build de dist/
npm run build        # compila a JavaScript (dist/)
npm run lint         # lint + formato
```

## 🔗 Endpoints principales

### Tableros (`src/boards/boards.controller.ts`)

- `GET /boards` — listar tableros.
- `POST /boards` — crear tablero (`title`, `description?`, `columns`).
- `GET /boards/:id` — obtener tablero por ID.
- `PATCH /boards/:id` — actualizar datos o columnas.
- `DELETE /boards/:id` — eliminar tablero.

### Tareas (`src/tasks/tasks.controller.ts`)

- `GET /tasks?boardId=` — listar tareas (filtrado opcional por board).
- `GET /tasks/board/:boardId` — tareas de un tablero.
- `GET /tasks/:id` — detalle de tarea.
- `POST /tasks` — crear tarea (`title`, `description?`, `boardId`, `column`, `position`).
- `PATCH /tasks/:id` — actualizar tarea.
- `PATCH /tasks/:id/position` — actualizar columna/posición (drag & drop).
- `DELETE /tasks/:id` — eliminar tarea.

### Exportaciones (`src/exports/exports.controller.ts`)

- `POST /exports/backlog` — dispara la automatización de exportación. Payload `{ boardId, email, fields? }`.

## 🔔 Eventos en tiempo real

`src/events/events.gateway.ts` expone los eventos Socket.IO siguientes:

- `task.created`
- `task.updated`
- `task.deleted`
- `board.updated`

El frontend (Vite + React) se conecta con `socket.io-client` utilizando la misma URL base (`http://localhost:3000`).

## 🧪 Verificación rápida

- `curl http://localhost:3000/boards` — confirma que el backend responde y que la conexión a MongoDB está activa.

## 🛠️ Troubleshooting

- **MongoDB**: confirma que el contenedor esté activo (`docker ps`) y que `MONGODB_URI` apunte al puerto correcto.
- **CORS/WebSockets**: ajusta `CORS_ORIGIN` si el frontend corre en otra URL.
- **N8N**: si N8N está en Docker, utiliza `http://host.docker.internal:3000` dentro del workflow (ver `SETUP.md`).

---

Consulta `../SETUP.md` y `../n8n/setup-instructions.md` para instrucciones completas del ecosistema.
