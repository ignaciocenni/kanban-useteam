# Kanban UseTeam

Aplicación Kanban con colaboración en tiempo real:
- Frontend: React + Vite
- Backend: NestJS + MongoDB
- Tiempo real: Socket.io
- Exportación de backlog: n8n (Docker), genera CSV y lo envía por email

**Rol de n8n**  
n8n está separado del backend para orquestar el flujo de exportación con nodos visuales. El backend expone un endpoint que dispara el webhook en n8n y n8n consulta los datos del backend, convierte a CSV y envía por email.

## Variables de entorno

Diferenciar frontend vs backend:

Backend (`backend/.env`)
```env
MONGODB_URI=mongodb://localhost:27018/kanban-useteam
PORT=3000
CORS_ORIGIN=http://localhost:5173
N8N_WEBHOOK_URL=http://localhost:5678/webhook/kanban-export
```

Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

Nota de red para n8n en Docker:
- Desde n8n hacia el backend usa `http://host.docker.internal:3000` (no `localhost`).

## Exportación de backlog (CSV)
- El archivo exportado es **CSV** sin formato visual.
- Las credenciales **SMTP** se configuran manualmente en la UI de n8n y no se versionan.
- Estructura del workflow: Webhook → HTTP Request al backend → (opcional) Set/Edit Fields → Convert to CSV → Send Email → Webhook Response.

## Setup
Sigue `SETUP.md` para la instalación y ejecución en el orden:
MongoDB → Backend → Frontend → n8n

## Documentación adicional
- `SETUP.md`: instalación paso a paso
- `n8n/setup-instructions.md`: explicación del workflow y credenciales SMTP
