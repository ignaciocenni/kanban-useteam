import { Board as BoardType, Task, Column as ColumnType } from '../types'

// Datos de ejemplo para desarrollo
export const mockColumns: ColumnType[] = [
  { id: '1', title: 'To Do', position: 0 },
  { id: '2', title: 'In Progress', position: 1 },
  { id: '3', title: 'Done', position: 2 }
]

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Diseñar la interfaz del tablero',
    description: 'Crear mockups y definir la estructura visual del tablero Kanban',
    column: 'To Do',
    position: 0,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: '2',
    title: 'Implementar componente Board',
    description: 'Crear el componente principal que contendrá las columnas',
    column: 'In Progress',
    position: 0,
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16')
  },
  {
    id: '3',
    title: 'Configurar Docker',
    description: 'Preparar docker-compose.yml con MongoDB y N8N',
    column: 'Done',
    position: 0,
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-17')
  },
  {
    id: '4',
    title: 'Crear endpoints de la API',
    description: 'Desarrollar los endpoints REST para boards y tasks',
    column: 'Done',
    position: 1,
    createdAt: new Date('2024-01-13'),
    updatedAt: new Date('2024-01-17')
  }
]

export const mockBoard: BoardType = {
  id: '1',
  title: 'Proyecto Kanban UseTeam',
  description: 'Tablero principal para gestionar tareas del proyecto',
  columns: mockColumns,
  createdAt: new Date('2024-01-10'),
  updatedAt: new Date('2024-01-17')
}
