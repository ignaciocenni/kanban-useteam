# 🚀 Guía de Instalación y Ejecución - Kanban UseTeam

Esta guía detalla los pasos para levantar el proyecto completo: **Frontend**, **Backend**, **MongoDB** y **N8N** para la funcionalidad de exportación.

---

## 📋 Requisitos Previos

- **Node.js** v18 o superior
- **npm** v9 o superior
- **Docker** (para MongoDB y N8N)
- **Git**

---

## 🗂️ Estructura del Proyecto

```
kanban-useteam/
├── frontend/          # React + Vite
├── backend/           # NestJS + WebSocket
├── n8n/               # Workflow de exportación
│   ├── workflow.json
│   └── setup-instructions.md
├── .env.example       # Variables de entorno
└── SETUP.md           # Esta guía
```

---

## ⚙️ Configuración Inicial

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPO>
cd kanban-useteam
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y ajusta según tu entorno:

```bash
cp .env.example .env
```

**Backend** (`backend/.env`):
```env
MONGODB_URI=mongodb://localhost:27018/kanban-useteam
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
N8N_WEBHOOK_URL=http://localhost:5678/webhook/kanban-export
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

---

## 🐳 Levantar MongoDB con Docker

```bash
docker run -d \
  --name mongodb-kanban \
  -p 27018:27017 \
  -v mongodb_data:/data/db \
  mongo:latest
```

Verifica que esté corriendo:
```bash
docker ps | grep mongodb-kanban
```

---

## 🔧 Backend (NestJS)

### 1. Instalar dependencias

```bash
cd backend
npm install
```

### 2. Iniciar en modo desarrollo

```bash
npm run start:dev
```

El backend estará disponible en `http://localhost:3000`.

### 3. Verificar

```bash
curl http://localhost:3000/boards
```

Deberías recibir un array JSON (vacío o con datos).

---

## 🎨 Frontend (React + Vite)

### 1. Instalar dependencias

```bash
cd frontend
npm install
```

### 2. Iniciar servidor de desarrollo

```bash
npm run dev
```

El frontend estará disponible en `http://localhost:5173`.

### 3. Acceder

Abre tu navegador en `http://localhost:5173` y verás el tablero Kanban.

---

## 📧 N8N - Exportación de Backlog

### 1. Levantar N8N con Docker

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n:latest
```

**Nota para Windows/Mac**: Si usas Docker Desktop, N8N podrá acceder al backend usando `host.docker.internal:3000` en lugar de `localhost:3000`.

### 2. Configurar N8N

1. Abre `http://localhost:5678` en tu navegador
2. Crea una cuenta (primera vez)
3. Importa el workflow:
   - **Workflows → Import from file**
   - Selecciona `n8n/workflow.json`

### 3. Configurar credenciales SMTP

El workflow requiere credenciales SMTP para enviar emails (se configuran manualmente en la UI de n8n y no se versionan):

1. Abre el nodo **Send Email**
2. Click en **Credentials → Create New → SMTP account**
3. Completa:
   - **User**: tu email (ej. `tu-email@gmail.com`)
   - **Password**: 
     - Gmail: genera una [App Password](https://myaccount.google.com/apppasswords)
     - Otros: contraseña normal
   - **Host**: 
     - Gmail: `smtp.gmail.com`
     - Outlook: `smtp-mail.outlook.com`
   - **Port**: `465` (SSL) o `587` (TLS)
   - **Secure**: activado si usas puerto 465
4. Guarda las credenciales

### 4. Ajustar URL del backend (si usas Docker)

Si N8N corre en Docker, edita el nodo **Fetch Tasks from API**:
- Cambia `http://localhost:3000` por `http://host.docker.internal:3000`

### 5. Activar el workflow

- Click en el toggle **Activate** (arriba a la derecha)
- El estado debe quedar en "Active" (verde)

### 6. Probar el flujo

Desde terminal:
```bash
curl -X POST http://localhost:5678/webhook/kanban-export \
  -H "Content-Type: application/json" \
  -d '{"boardId":"<ID_REAL>","email":"tu-email@example.com"}'
```

Verifica:
- Ejecución exitosa en **Executions** de N8N
- Email recibido con archivo **CSV** adjunto (sin formato visual)

---

## 🧪 Prueba Completa del Sistema

### 1. Crear un tablero y tareas

1. Abre `http://localhost:5173`
2. Crea algunas tareas en diferentes columnas
3. Mueve tareas entre columnas (drag & drop)

### 2. Exportar backlog

1. Click en **Exportar backlog** (botón en el header)
2. Ingresa tu email
3. (Opcional) Selecciona campos a exportar
4. Click **Enviar exportación**
5. Verifica mensaje de éxito

### 3. Verificar email

Revisa tu bandeja de entrada. Deberías recibir un email con:
- **Asunto**: "Exportación de Backlog - Kanban UseTeam"
- **Adjunto**: `File.csv` con las tareas del tablero

---

## 🔍 Solución de Problemas

### Backend no conecta a MongoDB
- Verifica que el contenedor esté corriendo: `docker ps`
- Confirma el puerto en `.env`: `MONGODB_URI=mongodb://localhost:27018/kanban-useteam`

### Frontend no conecta al backend
- Verifica que el backend esté corriendo en `http://localhost:3000`
- Revisa la consola del navegador para errores CORS

### N8N no puede conectarse al backend
- Si N8N corre en Docker, usa `host.docker.internal:3000` en lugar de `localhost:3000`
- Verifica que el backend esté accesible: `curl http://localhost:3000/tasks`

### No recibo el email
- Verifica las credenciales SMTP en N8N
- Revisa la pestaña **Executions** en N8N para ver errores
- Confirma que el workflow esté **Active**

---

## 📚 Documentación Adicional

- **N8N Setup**: Ver `n8n/setup-instructions.md` para detalles del workflow
- **Backend API**: Endpoints disponibles en `backend/README.md`
- **Frontend**: Componentes y estructura en `frontend/README.md`

---

## 🛑 Detener Servicios

```bash
# Detener MongoDB
docker stop mongodb-kanban

# Detener N8N
docker stop n8n

# Backend y Frontend: Ctrl+C en las terminales respectivas
```

---

## 🎯 Próximos Pasos

Una vez que todo funcione:
1. Personaliza el workflow de N8N según tus necesidades
2. Ajusta los campos del CSV en el nodo **Convert to CSV**
3. Configura notificaciones adicionales (Slack, Discord, etc.)

---

💪 ¡Listo para colaborar en tiempo real! 🚀
