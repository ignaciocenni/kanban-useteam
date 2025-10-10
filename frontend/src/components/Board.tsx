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

  const handleDrop = async (targetColumn: string) => {
    if (!draggedTask) return

    const currentTasksInColumn = tasks
      .filter(t => t.column === targetColumn)
      .sort((a, b) => a.position - b.position)

    console.log('🎯 Drop:', {
      draggedTask: draggedTask.title,
      draggedColumn: draggedTask.column,
      targetColumn,
      dragOverTask,
      currentOrder: currentTasksInColumn.map(t => t.title)
    })

    if (!dragOverTask) {
      if (draggedTask.column === targetColumn) {
        console.log('⚠️ Same column, no target - no action')
        setDraggedTask(null)
        setDragOverTask(null)
        return
      }

      const newPosition = currentTasksInColumn.length
      console.log('🎯 Moving to end of column, position:', newPosition)

      try {
        await onUpdateTaskPosition?.(draggedTask.id, targetColumn, newPosition)
      } catch (error) {
        console.error('Error updating task position:', error)
      }

      setDraggedTask(null)
      setDragOverTask(null)
      return
    }

    const targetTask = currentTasksInColumn.find(t => t.id === dragOverTask)

    if (!targetTask) {
      console.log('⚠️ Target task not found in target column')
      console.log('⚠️ dragOverTask ID:', dragOverTask)
      console.log('⚠️ Available tasks:', currentTasksInColumn.map(t => ({ id: t.id, title: t.title })))

      const newPosition = currentTasksInColumn.length
      console.log('🎯 Fallback move to end, position:', newPosition)

      try {
        await onUpdateTaskPosition?.(draggedTask.id, targetColumn, newPosition)
      } catch (error) {
        console.error('Error updating task position:', error)
      }

      setDraggedTask(null)
      setDragOverTask(null)
      return
    }

    const tasksWithoutDragged = currentTasksInColumn.filter(t => t.id !== draggedTask.id)
    const targetIndexInFilteredArray = tasksWithoutDragged.findIndex(t => t.id === dragOverTask)
    const draggedIndex = currentTasksInColumn.findIndex(t => t.id === draggedTask.id)
    const targetIndex = currentTasksInColumn.findIndex(t => t.id === dragOverTask)
    const isDraggingDown =
      draggedTask.column === targetColumn &&
      draggedIndex !== -1 &&
      targetIndex !== -1 &&
      draggedIndex < targetIndex

    console.log('🎯 Target task:', targetTask.title)
    console.log('🎯 Tasks without dragged:', tasksWithoutDragged.map(t => t.title))
    console.log('🎯 Target index in filtered array:', targetIndexInFilteredArray)
    console.log('🎯 Dragged index:', draggedIndex, 'Target index:', targetIndex)
    console.log('🎯 Dragging down?', isDraggingDown)

    let newPosition = targetIndexInFilteredArray
    if (isDraggingDown) {
      newPosition = targetIndexInFilteredArray + 1
    }

    console.log('🎯 Final new position:', newPosition)

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
