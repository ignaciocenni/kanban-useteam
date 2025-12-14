/**
 * Frontend domain types (UI / Store / Components).
 *
 * These types represent the internal state and behavior of the frontend.
 * They MUST NOT be used for API or WebSocket payloads.
 *
 * For backend integration (REST / WS), use contracts from '../contracts'.
 */

export interface Task {
  id: string
  boardId: string
  title: string
  description?: string
  columnId: string
  position: number
  createdAt: Date
  updatedAt: Date
}

export interface Column {
  id: string
  title: string
  position: number
}

export interface Board {
  id: string
  title: string
  description?: string
  columns: Column[]
  createdAt: Date
  updatedAt: Date
}
