import React, { useState } from 'react'
import { Column as ColumnType, Task } from '../types'
import { Card } from './Card'
import { TaskForm } from './TaskForm'
import { Modal } from './Modal'

interface ColumnProps {
  column: ColumnType
  tasks: Task[]
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (targetColumn: string) => void
  onDragStart?: (task: Task) => void
  onCreateTask?: (column: string) => void
  onEditTask?: (id: string, updates: Partial<Task>) => Promise<void>
  onDeleteTask?: (id: string) => Promise<void>
  onDragOverTask?: (taskId: string | null) => void
}

export const Column: React.FC<ColumnProps> = ({
  column,
  tasks,
  onDragOver,
  onDrop,
  onDragStart,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onDragOverTask
}) => {
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onDrop?.(column.title)
    onDragOverTask?.(null) // Reset drag over state
  }

  const handleCreateTask = () => {
    onCreateTask?.(column.title)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
  }

  const handleEditTaskSubmit = async (taskData: Partial<Task>) => {
    if (editingTask && taskData.title && onEditTask) {
      try {
        await onEditTask(editingTask.id, {
          title: taskData.title,
          description: taskData.description || ''
        })
        setEditingTask(null)
      } catch (error) {
        console.error('Error updating task:', error)
      }
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (onDeleteTask) {
      try {
        await onDeleteTask(taskId)
      } catch (error) {
        console.error('Error deleting task:', error)
      }
    }
  }

  return (
    <div
      className="kanban-column"
      onDragOver={onDragOver}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <h3 className="column-title">{column.title}</h3>
        <span className="task-count">{tasks.length}</span>
      </div>

      <div className="column-content">
        {tasks.map(task => (
          <Card
            key={task.id}
            task={task}
            onDragStart={onDragStart}
            onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
              e.preventDefault()
              e.stopPropagation()
              onDragOverTask?.(task.id)
            }}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
          />
        ))}

        {tasks.length === 0 && (
          <div className="empty-column">
            <p>Sin tareas</p>
          </div>
        )}
      </div>

      <button
        className="add-task-button"
        onClick={handleCreateTask}
        title="Agregar nueva tarea"
      >
        + Agregar tarea
      </button>

      {/* Task Edit Modal */}
      {editingTask && (
        <Modal onClose={() => setEditingTask(null)}>
          <TaskForm
            title="Editar tarea"
            initialData={editingTask}
            onSubmit={handleEditTaskSubmit}
            onCancel={() => setEditingTask(null)}
          />
        </Modal>
      )}
    </div>
  )
}
