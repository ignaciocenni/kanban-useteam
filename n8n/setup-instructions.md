# N8N Workflow Setup: Kanban Backlog Export

## Requisitos previos
- N8N v1.0 o superior instalado localmente (`docker run` recomendado en el README).
- Backend NestJS ejecutándose en `http://localhost:3000`.
- MongoDB disponible con datos de tareas.
- Cuenta SMTP configurada para envío de emails.

## Pasos

### 1. Iniciar N8N
Ejecuta el contenedor:
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n:latest
```

### 2. Importar el workflow
- En la UI de N8N (`http://localhost:5678`), ve a **Workflows → Import from file**.
- Selecciona `n8n/workflow.json`.
- Verifica que el nodo `Webhook` tenga la ruta `kanban-export` y método `POST`.

### 3. Configurar credenciales SMTP
El workflow incluye un nodo **Send Email** que requiere credenciales SMTP:
1. Haz clic en el nodo **Send Email**.
2. En **Credentials**, selecciona **Create New** → **SMTP account**.
3. Completa:
   - **User**: tu email (ej. `tu-email@gmail.com`)
   - **Password**: contraseña de aplicación (para Gmail: [App Passwords](https://myaccount.google.com/apppasswords))
   - **Host**: `smtp.gmail.com` (o el servidor SMTP de tu proveedor)
   - **Port**: `465` (SSL) o `587` (TLS)
   - **Secure**: activado si usas puerto 465
4. Guarda las credenciales.

### 4. Revisar nodos del workflow
El workflow incluye:
- **Webhook**: recibe `POST` con `{ boardId, email, fields? }`.
- **Fetch Tasks from API**: consulta `GET http://localhost:3000/tasks?boardId=...`.
- **Convert to CSV**: transforma JSON de tareas en archivo CSV.
- **Send Email**: adjunta CSV y envía al email indicado en el payload.
- **Webhook Response**: devuelve `{ success: true }` al backend.

### 5. Activar el workflow
- Usa el interruptor **Activate** (arriba a la derecha). El estado debe quedar en "Active".
- El endpoint de producción queda en `http://localhost:5678/webhook/kanban-export`.

### 6. Probar el flujo completo
Desde la terminal:
```bash
curl -X POST http://localhost:5678/webhook/kanban-export \
  -H "Content-Type: application/json" \
  -d '{"boardId":"<ID_REAL>","email":"tu-email@example.com"}'
```
Verifica:
- Ejecución exitosa en **Executions** de N8N.
- Email recibido con archivo `backlog.csv` adjunto.

### 7. Integración con el backend
Confirma que el backend tenga `N8N_WEBHOOK_URL=http://localhost:5678/webhook/kanban-export` en `.env`.

Prueba desde el frontend o con:
```bash
curl -X POST http://localhost:3000/exports/backlog \
  -H "Content-Type: application/json" \
  -d '{"boardId":"<ID_REAL>","email":"tu-email@example.com"}'
```
El backend responde `{ "success": true, ... }` si N8N procesa correctamente.

## Notas
- El workflow está **inactivo por defecto**. Actívalo tras importarlo.
- Ajusta el nodo **Fetch Tasks from API** si tu backend usa otra URL o autenticación.
- Para filtrar campos específicos, modifica el nodo **Convert to CSV** con expresiones N8N.
