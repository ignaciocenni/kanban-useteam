import type { Board, Task } from '../types'
import { normalizeColumns } from '../utils/columns'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * Normaliza un tablero desde el formato de MongoDB al formato del frontend
 * Convierte _id a id y normaliza columnas
 */
function normalizeBoard(board: any): Board {
  return {
    id: board.id || board._id,
    title: board.title,
    description: board.description,
    columns: normalizeColumns(board.columns),
    createdAt: new Date(board.createdAt),
    updatedAt: new Date(board.updatedAt),
  }
}

/**
 * Normaliza una tarea desde el formato de MongoDB al formato del frontend
 * Convierte _id a id y garantiza tipos consistentes
 */
function normalizeTask(task: any): Task {
  return {
    id: task.id || task._id,
    boardId: task.boardId || task.board?.id,
    title: task.title,
    description: task.description,
    column: task.column,
    position: task.position,
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
  }
}

export async function getBoards(): Promise<Board[]> {
  const res = await fetch(`${API_URL}/boards`)
  if (!res.ok) throw new Error('Failed to fetch boards')
  const data = await res.json()
  return Array.isArray(data) ? data.map(normalizeBoard) : [normalizeBoard(data)]
}

export async function getTasks(boardId?: string): Promise<Task[]> {
  const qs = boardId ? `?boardId=${encodeURIComponent(boardId)}` : ''
  const res = await fetch(`${API_URL}/tasks${qs}`)
  if (!res.ok) throw new Error('Failed to fetch tasks')
  const data = await res.json()
  return Array.isArray(data) ? data.map(normalizeTask) : [normalizeTask(data)]
}

export async function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  const res = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  })
  if (!res.ok) throw new Error('Failed to create task')
  const data = await res.json()
  return normalizeTask(data)
}

export async function updateTask(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Task> {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error('Failed to update task')
  const data = await res.json()
  return normalizeTask(data)
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Failed to delete task')
}

/**
 * Actualiza la posición de una tarea (drag & drop)
 * El backend recalcula las posiciones de todas las tareas afectadas
 */
export async function updateTaskPosition(id: string, column: string, position: number): Promise<Task> {
  const res = await fetch(`${API_URL}/tasks/${id}/position`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ column, position }),
  })
  if (!res.ok) throw new Error('Failed to update task position')
  const data = await res.json()
  return normalizeTask(data)
}

export interface ExportBacklogPayload {
  boardId: string
  email: string
  fields?: string[]
}

/**
 * Dispara la exportación del backlog vía N8N
 * El backend llama al webhook de N8N que genera CSV y envía por email
 */
export async function exportBacklog(payload: ExportBacklogPayload): Promise<any> {
  const res = await fetch(`${API_URL}/exports/backlog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to trigger export: ${res.status} ${errorText}`)
  }

  try {
    return await res.json()
  } catch (error) {
    return { success: true }
  }
}
