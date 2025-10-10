import type { Column } from '../types'

export const DEFAULT_COLUMNS: Column[] = [
  { id: 'todo', title: 'To Do', position: 0 },
  { id: 'in-progress', title: 'In Progress', position: 1 },
  { id: 'done', title: 'Done', position: 2 },
]

export function normalizeColumns(columns: any): Column[] {
  if (!Array.isArray(columns) || columns.length === 0) {
    return DEFAULT_COLUMNS
  }

  const normalized = columns.map((col: any, index: number) => {
    if (typeof col === 'string') {
      return {
        id: `${index}-${col.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title: col,
        position: index,
      }
    }

    const title = col?.title || col?.name || `Columna ${index + 1}`
    const position = typeof col?.position === 'number' ? col.position : index

    return {
      id: col?.id || col?._id || `${index}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      title,
      position,
    }
  }) as Column[]

  return normalized.sort((a, b) => a.position - b.position)
}
