# n8n: Exportación de Backlog (CSV)

## Requisitos previos
- n8n en Docker (`docker run` recomendado en el README)
- Backend NestJS ejecutándose localmente
- MongoDB con datos del tablero
- Cuenta SMTP (se configura manualmente en la UI de n8n; no se versiona)

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
El workflow incluye un nodo **Send Email** que requiere credenciales SMTP (manual):
1. Haz clic en el nodo **Send Email**.
2. En **Credentials**, selecciona **Create New** → **SMTP account**.
3. Completa:
   - **User**: tu email (ej. `tu-email@gmail.com`)
   - **Password**: contraseña de aplicación (para Gmail: [App Passwords](https://myaccount.google.com/apppasswords))
   - **Host**: `smtp.gmail.com` (o el servidor SMTP de tu proveedor)
   - **Port**: `465` (SSL) o `587` (TLS)
   - **Secure**: activado si usas puerto 465
4. Guarda las credenciales.

### 4. Nodos del workflow
Webhook → HTTP Request al backend → (opcional) Set/Edit Fields → Convert to CSV → Send Email → Webhook Response
- **Webhook**: recibe `POST` con `{ boardId, email, fields? }`
- **Fetch Tasks from API**: consulta `GET` al backend
  - Si n8n corre en Docker, usa `http://host.docker.internal:3000`
- **Convert to CSV**: transforma JSON de tareas en **CSV** simple (sin formato visual)
- **Send Email**: adjunta CSV y envía al email indicado
- **Webhook Response**: devuelve `{ success: true }` al backend

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
