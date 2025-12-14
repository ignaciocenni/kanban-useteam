import React, { useState } from 'react';
import { Column as ColumnType, Task } from '../types';
import { Card } from './Card';
import { TaskForm } from './TaskForm';
import { Modal } from './Modal';

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (targetColumnId: string) => void;
  onDragStart?: (task: Task) => void;
  onCreateTask?: (columnId: string) => void;
  onEditTask?: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask?: (id: string) => Promise<void>;
  onDragOverTask?: (taskId: string | null) => void;
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
  onDragOverTask,
}) => {
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  /* =======================
     Column drag handlers
     ======================= */

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Drop en columna → no sobre una card
    onDragOverTask?.(null);
    onDrop?.(column.id);
  };

  const handleColumnDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // IMPORTANTE:
    // Si estoy sobre la columna (no sobre una task),
    // limpiamos dragOverTask para indicar "drop al final"
    onDragOverTask?.(null);
    onDragOver?.(e);
  };

  /* =======================
     Task handlers
     ======================= */

  const handleCreateTask = () => {
    onCreateTask?.(column.id);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleEditTaskSubmit = async (taskData: Partial<Task>) => {
    if (!editingTask || !taskData.title || !onEditTask) return;

    try {
      await onEditTask(editingTask.id, {
        title: taskData.title,
        description: taskData.description || '',
      });
      setEditingTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!onDeleteTask) return;

    try {
      await onDeleteTask(taskId);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  /* =======================
     Render
     ======================= */

  return (
    <div
      className="kanban-column"
      onDragOver={handleColumnDragOver}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <h3 className="column-title">{column.title}</h3>
        <span className="task-count">{tasks.length}</span>
      </div>

      <div className="column-content">
        {tasks.map((task) => (
          <div
            key={task.id}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();

              // SOLO acá seteamos dragOverTask
              onDragOverTask?.(task.id);
            }}
            onDragLeave={(e) => {
              e.stopPropagation();
              // Al salir de la card limpiamos
              onDragOverTask?.(null);
            }}
          >
            <Card
              task={task}
              onDragStart={onDragStart}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
            />
          </div>
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
  );
};
