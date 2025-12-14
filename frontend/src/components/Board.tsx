import React, { useState } from "react";
import type { BoardContract } from "../contracts/board.contract";
import type { Task } from "../types";
import type { Column as ColumnType } from "../types";
import { Column } from "./Column";
import { TaskForm } from "./TaskForm";
import { Modal } from "./Modal";
import { useKanbanStore } from "../store/useKanbanStore";

type BoardWithColumns = BoardContract & { columns?: ColumnType[] };

interface BoardProps {
  board: BoardWithColumns;
  tasks: Task[];
  onCreateTask?: (task: Partial<Task>) => Promise<void>;
  onUpdateTask?: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask?: (id: string) => Promise<void>;
  onUpdateTaskPosition?: (
    id: string,
    columnId: string,
    position: number
  ) => Promise<void>;
}

export const Board: React.FC<BoardProps> = ({
  board,
  tasks,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onUpdateTaskPosition,
}) => {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [showCreateForm, setShowCreateForm] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  // Store (solo reorder optimista)
  const reorderTaskLocally = useKanbanStore(
    (state) => state.reorderTaskLocally
  );

  // =======================
  //   Drag handlers
  // =======================

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  /**
   * Calcula `newPosition` al soltar una tarjeta y aplica
   * reordenamiento optimista seguido de actualización en backend.
   *
   * Algoritmo:
   * - Si el drop es en zona vacía, usa el fondo de la columna.
   * - En la misma columna, se excluye la tarea arrastrada del cálculo base.
   * - Si hay `dragOverTaskId`, se toma su índice como posición destino.
   * - Se clamp-ea `newPosition` a [0, length] y se llama al store para
   *   actualizar la UI; luego se invoca `onUpdateTaskPosition` al backend.
   */
  const handleDrop = async (targetColumnId: string) => {
    if (!draggedTask) return;

    const columnTasksRaw = tasks
      .filter((t) => t.columnId === targetColumnId)
      .sort((a, b) => a.position - b.position);

    const isSameColumn = draggedTask.columnId === targetColumnId;
    const baseColumnTasks = isSameColumn
      ? columnTasksRaw.filter((t) => t.id !== draggedTask.id)
      : columnTasksRaw;

    // =========================
    // CALCULO DE newPosition
    // =========================
    let newPosition: number;

    if (!dragOverTaskId) {
      // Drop en zona vacía → fondo de columna
      newPosition = baseColumnTasks.length;
    } else {
      const overIndex = baseColumnTasks.findIndex(
        (t) => t.id === dragOverTaskId
      );

      if (overIndex === -1) {
        newPosition = baseColumnTasks.length;
      } else {
        newPosition = overIndex;
      }
    }

    // Clamp defensivo
    newPosition = Math.max(0, Math.min(newPosition, baseColumnTasks.length));

    // =========================
    // REORDER OPTIMISTA
    // =========================
    reorderTaskLocally(draggedTask.id, targetColumnId, newPosition);

    // =========================
    // BACKEND
    // =========================
    try {
      await onUpdateTaskPosition?.(draggedTask.id, targetColumnId, newPosition);
    } catch (error) {
      console.error("Error updating task position:", error);
    }

    // Reset estado drag
    setDraggedTask(null);
    setDragOverTaskId(null);
  };

  // =======================
  //   Create task
  // =======================

  const handleCreateTask = (columnId: string) => {
    setShowCreateForm(columnId);
  };

  const handleCreateTaskSubmit = async (taskData: Partial<Task>) => {
    if (!taskData.title || !showCreateForm) return;

    try {
      const newTask = {
        title: taskData.title,
        description: taskData.description || "",
        boardId: board.id,
        columnId: showCreateForm,
        position: tasks.filter((t) => t.columnId === showCreateForm).length,
      };

      await onCreateTask?.(newTask);
      setShowCreateForm(null);
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  // =======================
  //   Helpers
  // =======================

  const getTasksByColumn = (columnId: string): Task[] =>
    tasks
      .filter((task) => task.columnId === columnId)
      .sort((a, b) => a.position - b.position);

  // =======================
  //   Render
  // =======================

  return (
    <div className="kanban-board">
      <div className="board-header">
        <h2 className="board-title">{board.title}</h2>
        {board.description && (
          <p className="board-description">{board.description}</p>
        )}
      </div>

      <div className="board-columns">
        {(board.columns || []).map((column: ColumnType) => (
          <Column
            key={column.id}
            column={column}
            tasks={getTasksByColumn(column.id)}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragStart={handleDragStart}
            onCreateTask={handleCreateTask}
            onEditTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onDragOverTask={setDragOverTaskId}
          />
        ))}
      </div>

      {showCreateForm && (
        <Modal onClose={() => setShowCreateForm(null)}>
          <TaskForm
            title="Nueva tarea"
            onSubmit={handleCreateTaskSubmit}
            onCancel={() => setShowCreateForm(null)}
          />
        </Modal>
      )}
    </div>
  );
};
