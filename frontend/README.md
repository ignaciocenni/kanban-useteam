# Kanban UseTeam - Frontend

Frontend React del tablero Kanban colaborativo desarrollado con Vite y TypeScript.

## 🚀 Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build
```

## 📁 Estructura

```
src/
├── components/     # Componentes reutilizables
├── services/       # Servicios para API
├── types/         # Definiciones TypeScript
├── App.tsx        # Componente principal
└── main.tsx       # Punto de entrada
```

## 🔗 Conexión con Backend

El frontend se conecta automáticamente al backend en `http://localhost:3000` vía proxy configurado en Vite.
