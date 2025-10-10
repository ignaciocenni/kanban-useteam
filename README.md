# 🧪 Prueba Técnica: Tablero Kanban Colaborativo en Tiempo Real

## 🎯 Objetivo del Proyecto

Desarrollar una aplicación tipo **Trello** que implemente la gestión de tareas mediante un **tablero Kanban** con soporte esencial para la **colaboración en tiempo real**.  
El sistema debe incluir columnas personalizables, tarjetas movibles y una funcionalidad de _drag & drop_ fluida.

---

## 🛠️ Stack Tecnológico Requerido

### 💻 Frontend

- **React.js:** Para la construcción de la interfaz de usuario.  
- **Drag & Drop:** Implementación nativa o con librería para la manipulación y movimiento fluido de tarjetas entre columnas.

### ⚙️ Backend y Tiempo Real

- **NestJS:** _Framework_ para el servidor, con soporte de **WebSocket** para manejar la colaboración en tiempo real.  
- **MongoDB:** Base de datos para el almacenamiento persistente de los datos del tablero.  
- **Socket.io:** Comunicación **bidireccional** que permite las **notificaciones en tiempo real**, reflejando instantáneamente los cambios realizados por otros usuarios.

---

## 📧 Funcionalidad Adicional: Exportación de Backlog vía Email en CSV

Se debe implementar un sistema de exportación automatizada del _backlog_ del tablero Kanban utilizando **N8N** para generar flujos de trabajo (workflows) automatizados.

### 🔗 Tecnologías Adicionales

- **N8N:** Para la orquestación y automatización de flujos de trabajo.  
- **Webhooks:** Mecanismo de comunicación para disparar el flujo N8N desde la API.  
- **CSV Generation:** Para estructurar los datos extraídos en el formato de archivo requerido.  
- **Email Service:** Para el envío del reporte por correo electrónico.

### ✅ Requisitos Específicos de la Funcionalidad

1. **Activación (Trigger):** Un botón de **"Exportar"** en la interfaz del tablero (Frontend).  
2. **Punto de Acceso (Endpoint):** Una API en **NestJS** que dispare el _webhook_ de N8N.  
3. **Flujo N8N Automatizado:**
   - Extracción de los datos del tablero Kanban.  
   - Estructuración de los datos en formato **CSV**.  
   - Envío automático por email.  
4. **Configuración de Exportación:**
   - El email destino debe ser **configurable** por el usuario.  
   - **Opcional:** Selección de campos a exportar.  
5. **Notificaciones de Estado:**
   - Confirmación inmediata de la solicitud de exportación.  
   - Notificación de envío exitoso o fallido.

---

### 📄 Estructura del Archivo CSV

El archivo CSV exportado debe contener los siguientes campos por cada tarea:

| Campo | Descripción |
|-------|--------------|
| **ID de tarea** | Identificador único |
| **Título** | Nombre de la tarea |
| **Descripción** | Detalles de la tarea |
| **Columna** | Posición actual en el tablero |
| **Fecha de creación** | _Timestamp_ de creación |

---

### ➡️ Flujo de Trabajo Detallado

```
[Frontend] → [NestJS API] → [N8N Webhook] → [Data Extraction] → [CSV Generation] → [Email Delivery] → [User Notification]
```

1. Usuario hace clic en **"Exportar Backlog"**  
2. Frontend envía solicitud a endpoint `/api/export/backlog`  
3. NestJS dispara webhook a N8N  
4. N8N extrae datos del tablero Kanban  
5. N8N estructura datos en formato CSV  
6. N8N envía email con el archivo CSV adjunto  
7. El sistema notifica al usuario el estado de la exportación  

---

## 📦 Forma de Entrega y Estructura

### 🍴 Pasos para la Entrega

1. **Fork** este repositorio a tu cuenta personal de GitHub.  
2. **Clona** tu _fork_ localmente.  
3. **Desarrolla** la solución completa en tu _fork_.  
4. **Sube** todos los cambios a tu repositorio.

---

### 🗂️ Estructura de Archivos Requerida

La solución debe seguir esta estructura de carpetas:

```
useTeam-PT/
├── README.md
├── .env.example
├── frontend/
│   ├── package.json
│   ├── src/
│   └── ... (Código Frontend)
├── backend/
│   ├── package.json
│   ├── src/
│   └── ... (Código Backend)
├── n8n/
│   ├── workflow.json
│   └── setup-instructions.md
└── docker-compose.yml (Opcional, pero recomendado)
```

---

### ⚙️ Archivos de Configuración Esenciales

#### `.env.example`

Debe incluir todas las variables de entorno necesarias para levantar la aplicación:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/kanban-board

# Backend
PORT=3000
N8N_WEBHOOK_URL=http://localhost:5678/webhook/kanban-export

# Frontend
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_WS_URL=ws://localhost:3000
```

---

#### `n8n/workflow.json`

Contendrá el JSON del flujo de N8N configurado para la exportación del backlog.

#### `n8n/setup-instructions.md`

Documento con las instrucciones detalladas para la correcta configuración y ejecución del flujo de N8N.

---

## 🐳 Docker, Evaluación y Finalización

### 🧱 Docker Compose (Opcional)

Si se incluye, el archivo `docker-compose.yml` debe contener al menos:

- Servicio de **MongoDB**  
- Servicio de **N8N** (versión recomendada: `1.106.3`)  
- Configuración adecuada de redes y volúmenes persistentes  

---

### 🚀 Comando de Ejemplo para N8N

Comando base para levantar una instancia local de N8N:

```bash
docker run -it --rm   --name n8n   -p 5678:5678   -v ~/.n8n:/home/node/.n8n   n8nio/n8n:latest
```

---

### 📝 Documentación Adicional

- **`SETUP.md`**: Guía completa de instalación y ejecución paso a paso para todos los componentes (**Frontend**, **Backend**, **MongoDB**, **N8N**).  
- **`n8n/setup-instructions.md`**: Instrucciones detalladas para configurar el workflow de exportación en N8N.  
- Comentarios en código **concisos y precisos** que expliquen la lógica compleja o no evidente.

---

### 🔒 Finalización de la Prueba

Una vez que la implementación esté finalizada:

1. Invitar a los siguientes usuarios como colaboradores al repositorio de GitHub:

   ```
   rodriguezibrahin3@gmail.com
   jonnahuel78@gmail.com
   administracion@useteam.io
   ```

2. **NO realizar más commits** después de enviar las invitaciones.

---

## 🧠 Criterios de Evaluación

- **Pensamiento Asincrónico:** Manejo eficiente de procesos en tiempo real y background.  
- **Lógica Frontend:** Complejidad y manejo del estado compartido y las interacciones de usuario (especialmente en drag & drop).  
- **Sincronización:** Gestión adecuada de eventos y sincronización de datos entre múltiples usuarios.

---

## ✨ Recomendaciones

- Enfócate en ofrecer una **buena experiencia de usuario (UX)** y una interfaz intuitiva.  
- Prioriza un **código limpio, modular y mantenible**, siguiendo las mejores prácticas de cada framework.  
- Usa comentarios breves y precisos solo donde la lógica sea inherentemente compleja.

---

💪 ¡Mucho éxito con la prueba! 🚀
