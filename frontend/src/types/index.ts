// src/types/index.ts
export interface Task {
  id: string
  boardId: string
  title: string
  description?: string
  column: string
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
