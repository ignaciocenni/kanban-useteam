import React, { useEffect, useRef, useState } from 'react'
import { Task } from '../types'

interface CardProps {
  task: Task
  onDragStart?: (task: Task) => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
}

export const Card: React.FC<CardProps> = ({ task, onDragStart, onDragOver, onEdit, onDelete }) => {
  const [isDragging, setIsDragging] = useState(false)
  const dragPreviewRef = useRef<HTMLElement | null>(null)

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEdit) onEdit(task)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(task.id)
    }
  }

  const cleanupDragPreview = () => {
    if (dragPreviewRef.current && dragPreviewRef.current.parentNode) {
      dragPreviewRef.current.parentNode.removeChild(dragPreviewRef.current)
      dragPreviewRef.current = null
    }
  }

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', task.id)

    const source = e.currentTarget
    const rect = source.getBoundingClientRect()
    const preview = source.cloneNode(true) as HTMLElement
    preview.classList.add('kanban-card-drag-preview')
    preview.style.width = `${rect.width}px`
    preview.style.height = `${rect.height}px`
    preview.style.top = '-9999px'
    preview.style.left = '-9999px'
    preview.style.position = 'fixed'
    preview.style.margin = '0'
    preview.classList.remove('dragging')

    document.body.appendChild(preview)
    dragPreviewRef.current = preview

    e.dataTransfer.setDragImage(preview, rect.width / 2, rect.height / 2)

    onDragStart?.(task)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    cleanupDragPreview()
  }

  useEffect(() => {
    return () => {
      cleanupDragPreview()
    }
  }, [])

  return (
    <div
      className={`kanban-card${isDragging ? ' dragging' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragOver={onDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="card-header">
        <h4 className="card-title">{task.title}</h4>
        {(onEdit || onDelete) && (
          <div className="card-actions">
            {onEdit && (
              <button
                className="card-action-btn edit-btn"
                onClick={handleEdit}
                title="Editar tarea"
              >
                ✏️
              </button>
            )}
            {onDelete && (
              <button
                className="card-action-btn delete-btn"
                onClick={handleDelete}
                title="Eliminar tarea"
              >
                🗑️
              </button>
            )}
          </div>
        )}
      </div>

      {task.description && (
        <div className="card-description">
          <p>{task.description}</p>
        </div>
      )}

      <div className="card-footer">
        <span className="card-date">
          {new Date(task.createdAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  )
}
