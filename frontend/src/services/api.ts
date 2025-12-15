import type { BoardContract } from "../contracts/board.contract";
import type { Task } from "../types";
import {
  fromTaskContract,
  toCreateTaskContract,
  toUpdateTaskContract,
} from "../mappers/task.mapper";
import type { TaskContract } from "../contracts/task.contract";
import { getClientId } from "./clientId";

// =======================
// API CONFIG
//========================
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Construye encabezados comunes para solicitudes API.
 */
function buildHeaders() {
  return {
    "Content-Type": "application/json",
    "x-client-id": getClientId(),
  };
}

// =======================
// BOARDS
//========================

/**
 * Obtiene todos los tableros disponibles.
 */
export async function getBoards(): Promise<BoardContract[]> {
  const res = await fetch(`${API_URL}/boards`, {
    headers: buildHeaders(),
  });

  if (!res.ok) throw new Error("Failed to fetch boards");

  const data = await res.json();
  return Array.isArray(data) ? data : [data];
}

// =======================
// TASKS
//========================

/**
 * Obtiene tareas para un tablero específico.
 */
export async function getTasks(boardId?: string): Promise<Task[]> {
  const qs = boardId ? `?boardId=${encodeURIComponent(boardId)}` : "";

  const res = await fetch(`${API_URL}/tasks${qs}`, {
    headers: buildHeaders(),
  });

  if (!res.ok) throw new Error("Failed to fetch tasks");

  const data = await res.json();
  const list: TaskContract[] = Array.isArray(data) ? data : [data];
  return list.map(fromTaskContract);
}

/**
 * Crea una nueva tarea en el tablero especificado.
 */
export async function createTask(task: Partial<Task>): Promise<Task> {
  const res = await fetch(`${API_URL}/tasks`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(toCreateTaskContract(task)),
  });

  if (!res.ok) throw new Error("Failed to create task");

  const json: TaskContract = await res.json();
  return fromTaskContract(json);
}

/**
 * Actualiza una tarea existente.
 */
export async function updateTask(
  id: string,
  updates: Partial<Task>
): Promise<Task> {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify(toUpdateTaskContract(updates)),
  });

  if (!res.ok) throw new Error("Failed to update task");

  const json: TaskContract = await res.json();
  return fromTaskContract(json);
}

/**
 * Elimina una tarea existente.
 */
export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });

  if (!res.ok) throw new Error("Failed to delete task");
}

/**
 * Drag & Drop: backend recalcula posiciones y devuelve tarea actualizada.
 */
export async function updateTaskPosition(
  id: string,
  columnId: string,
  position: number
): Promise<Task> {
  const res = await fetch(`${API_URL}/tasks/${id}/position`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify({ column: columnId, position }),
  });

  if (!res.ok) throw new Error("Failed to update task position");

  const json: TaskContract = await res.json();
  return fromTaskContract(json);
}

// =======================
// EXPORTAR BACKLOG (N8N)
//========================

export interface ExportBacklogPayload {
  boardId: string;
  email: string;
  fields?: string[];
}

/**
 * Exporta el backlog de tareas para un tablero específico.
 */
export async function exportBacklog(
  payload: ExportBacklogPayload
): Promise<{ success: boolean; message?: string; data?: unknown }> {
  const res = await fetch(`${API_URL}/exports/backlog`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to trigger export: ${res.status} ${errorText}`);
  }

  try {
    return await res.json();
  } catch {
    return { success: true };
  }
}
