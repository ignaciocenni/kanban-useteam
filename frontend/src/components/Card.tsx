import React, { useState } from 'react'
import { Task } from '../types'

interface CardProps {
  task: Task
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void
  onEdit?: (task: Task) => void
  onDelete?: (taskId: string) => void
}

export const Card: React.FC<CardProps> = ({ task, onDragStart, onDragOver, onEdit, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false)

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEdit) onEdit(task)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete && confirm(`¿Eliminar tarea "${task.title}"?`)) {
      onDelete(task.id)
    }
  }

  return (
    <div
      className="kanban-card"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="card-header">
        <h4 className="card-title">{task.title}</h4>
        {isHovered && (
          <div className="card-actions">
            <button
              className="card-action-btn edit-btn"
              onClick={handleEdit}
              title="Editar tarea"
            >
              ✏️
            </button>
            <button
              className="card-action-btn delete-btn"
              onClick={handleDelete}
              title="Eliminar tarea"
            >
              🗑️
            </button>
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
