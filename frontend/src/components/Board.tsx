import React, { useState } from 'react'
import { Board as BoardType, Task } from '../types'
import { Column } from './Column'
import { TaskForm } from './TaskForm'

interface BoardProps {
  board: BoardType
  tasks: Task[]
  onCreateTask?: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  onUpdateTask?: (id: string, updates: Partial<Task>) => Promise<void>
  onDeleteTask?: (id: string) => Promise<void>
  onUpdateTaskPosition?: (id: string, column: string, position: number) => Promise<void>
}

export const Board: React.FC<BoardProps> = ({
  board,
  tasks,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onUpdateTaskPosition
}) => {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [showCreateForm, setShowCreateForm] = useState<string | null>(null)
  const [dragOverTask, setDragOverTask] = useState<string | null>(null)

  const handleDragStart = (task: Task) => {
    setDraggedTask(task)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  /**
   * Maneja el drop de una tarea en una columna
   * Calcula la nueva posición considerando:
   * - Si se suelta al final de la columna (sin target específico)
   * - Si se suelta sobre otra tarea (reordenamiento)
   * - Si se arrastra hacia arriba o hacia abajo en la misma columna
   */
  const handleDrop = async (targetColumn: string) => {
    if (!draggedTask) return

    const currentTasksInColumn = tasks
      .filter(t => t.column === targetColumn)
      .sort((a, b) => a.position - b.position)

    // Caso 1: Drop al final de la columna (sin target específico)
    if (!dragOverTask) {
      if (draggedTask.column === targetColumn) {
        setDraggedTask(null)
        setDragOverTask(null)
        return
      }

      const newPosition = currentTasksInColumn.length
      try {
        await onUpdateTaskPosition?.(draggedTask.id, targetColumn, newPosition)
      } catch (error) {
        console.error('Error updating task position:', error)
      }

      setDraggedTask(null)
      setDragOverTask(null)
      return
    }

    // Caso 2: Drop sobre otra tarea (reordenamiento)
    const targetTask = currentTasksInColumn.find(t => t.id === dragOverTask)

    if (!targetTask) {
      // Fallback: mover al final si no se encuentra la tarea target
      const newPosition = currentTasksInColumn.length
      try {
        await onUpdateTaskPosition?.(draggedTask.id, targetColumn, newPosition)
      } catch (error) {
        console.error('Error updating task position:', error)
      }

      setDraggedTask(null)
      setDragOverTask(null)
      return
    }

    // Calcular nueva posición considerando dirección del drag
    const tasksWithoutDragged = currentTasksInColumn.filter(t => t.id !== draggedTask.id)
    const targetIndexInFilteredArray = tasksWithoutDragged.findIndex(t => t.id === dragOverTask)
    const draggedIndex = currentTasksInColumn.findIndex(t => t.id === draggedTask.id)
    const targetIndex = currentTasksInColumn.findIndex(t => t.id === dragOverTask)
    const isDraggingDown =
      draggedTask.column === targetColumn &&
      draggedIndex !== -1 &&
      targetIndex !== -1 &&
      draggedIndex < targetIndex

    let newPosition = targetIndexInFilteredArray
    if (isDraggingDown) {
      newPosition = targetIndexInFilteredArray + 1
    }

    try {
      await onUpdateTaskPosition?.(draggedTask.id, targetColumn, newPosition)
    } catch (error) {
      console.error('Error updating task position:', error)
    }

    setDraggedTask(null)
    setDragOverTask(null)
  }

  const handleCreateTask = (column: string) => {
    setShowCreateForm(column)
  }

  const handleCreateTaskSubmit = async (taskData: Partial<Task>) => {
    if (taskData.title && showCreateForm) {
      try {
        const newTask = {
          title: taskData.title,
          description: taskData.description || '',
          boardId: board.id,
          column: showCreateForm,
          position: tasks.filter(t => t.column === showCreateForm).length
        }
        await onCreateTask?.(newTask)
        setShowCreateForm(null)
      } catch (error) {
        console.error('Error creating task:', error)
      }
    }
  }

  const getTasksByColumn = (columnTitle: string): Task[] => {
    return tasks
      .filter(task => task.column === columnTitle)
      .sort((a, b) => a.position - b.position)
  }

  return (
    <div className="kanban-board">
      <div className="board-header">
        <h2 className="board-title">{board.title}</h2>
        {board.description && (
          <p className="board-description">{board.description}</p>
        )}
      </div>

      <div className="board-columns">
        {board.columns.map((column, index) => (
          <Column
            key={column.id || `column-${index}`}
            column={column}
            tasks={getTasksByColumn(column.title)}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragStart={handleDragStart}
            onCreateTask={handleCreateTask}
            onEditTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onDragOverTask={setDragOverTask}
          />
        ))}
      </div>

      {/* Task Creation Modal */}
      {showCreateForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <TaskForm
            title="Nueva tarea"
            onSubmit={handleCreateTaskSubmit}
            onCancel={() => setShowCreateForm(null)}
          />
        </div>
      )}
    </div>
  )
}
