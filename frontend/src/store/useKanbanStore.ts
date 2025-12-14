import { create } from 'zustand';
import type { TaskContract } from '../contracts/task.contract';
import type { BoardContract } from '../contracts/board.contract';
import { getSocket } from '../services/socket';
import { getClientId } from '../services/clientId';
import type { Task } from '../types';
import { fromTaskContract, fromTaskContractPartial } from '../mappers/task.mapper';

interface KanbanState {
  boards: BoardContract[];
  tasks: Task[];
  activeBoardId: string | null;

  setBoards: (boards: BoardContract[]) => void;
  setTasks: (tasks: Task[]) => void;
  setActiveBoard: (boardId: string | null) => void;

  applyTaskCreated: (task: Task) => void;
  applyTaskUpdated: (task: Task) => void;
  applyTaskDeleted: (taskId: string) => void;

  reorderTaskLocally: (
    taskId: string,
    newColumnId: string,
    newPosition: number
  ) => void;

  initSocket: () => void;
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  boards: [],
  tasks: [],
  activeBoardId: null,

  setBoards: (boards) => set({ boards }),
  setTasks: (tasks) => set({ tasks }),
  setActiveBoard: (id) => set({ activeBoardId: id }),

  applyTaskCreated: (task) =>
    set((state) =>
      state.tasks.some((t) => t.id === task.id)
        ? state
        : { tasks: [...state.tasks, task] }
    ),

  applyTaskUpdated: (task) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
    })),

  applyTaskDeleted: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    })),

  reorderTaskLocally: (taskId, newColumnId, newPosition) => {
    set((state) => {
      const taskToMove = state.tasks.find((t) => t.id === taskId);
      if (!taskToMove) return state;

      const sourceColumnId = taskToMove.columnId;

      // 1. Separar tareas
      const remainingTasks = state.tasks.filter((t) => t.id !== taskId);

      // 2. Tareas destino (ordenadas)
      const targetColumnTasks = remainingTasks
        .filter((t) => t.columnId === newColumnId)
        .sort((a, b) => a.position - b.position);

      // 3. Clamp de posición
      const safePosition = Math.max(
        0,
        Math.min(newPosition, targetColumnTasks.length)
      );

      // 4. Insertar tarea en nueva posición
      const updatedMovedTask: Task = {
        ...taskToMove,
        columnId: newColumnId,
        position: safePosition,
      };

      const reorderedTargetColumn = [
        ...targetColumnTasks.slice(0, safePosition),
        updatedMovedTask,
        ...targetColumnTasks.slice(safePosition),
      ].map((task, index) => ({
        ...task,
        position: index,
      }));

      // 5. Si cambia de columna, reindexar la columna origen
      const sourceColumnTasks =
        sourceColumnId === newColumnId
          ? []
          : remainingTasks
              .filter((t) => t.columnId === sourceColumnId)
              .sort((a, b) => a.position - b.position)
              .map((task, index) => ({
                ...task,
                position: index,
              }));

      // 6. Otras columnas intactas
      const otherTasks = remainingTasks.filter(
        (t) => t.columnId !== newColumnId && t.columnId !== sourceColumnId
      );

      return {
        tasks: [...otherTasks, ...sourceColumnTasks, ...reorderedTargetColumn],
      };
    });
  },

  initSocket: () => {
    const socket = getSocket();
    const clientId = getClientId();

    socket.off('task.created');
    socket.off('task.updated');
    socket.off('task.deleted');

    socket.on(
      'task.created',
      (payload: TaskContract & { clientId?: string }) => {
        if (payload.clientId === clientId) return;
        get().applyTaskCreated(fromTaskContract(payload));
        try {
          window.dispatchEvent(
            new CustomEvent('kanban:toast', {
              detail: {
                type: 'info',
                title: 'Se creó una nueva tarea',
              },
            })
          );
        } catch {}
      }
    );

    socket.on(
      'task.updated',
      (payload: Partial<TaskContract> & { id: string; clientId?: string }) => {
        if (payload.clientId === clientId) return;

        const existing = get().tasks.find((t) => t.id === payload.id);
        if (!existing) return;

        const patch = fromTaskContractPartial(payload);
        get().applyTaskUpdated({ ...existing, ...patch } as Task);
        try {
          const prevColumnId = existing.columnId;
          const nextColumnId =
            patch.columnId !== undefined ? patch.columnId : prevColumnId;
          const isMove =
            patch.columnId !== undefined && nextColumnId !== prevColumnId;
          const isEdit =
            Object.prototype.hasOwnProperty.call(payload, 'title') ||
            Object.prototype.hasOwnProperty.call(payload, 'description');
          window.dispatchEvent(
            new CustomEvent('kanban:toast', {
              detail: {
                type: 'info',
                title: isMove
                  ? 'Una tarea cambió de columna'
                  : isEdit
                  ? 'Una tarea fue actualizada'
                  : undefined,
              },
            })
          );
        } catch {}
      }
    );

    socket.on('task.deleted', (payload: { id: string; clientId?: string }) => {
      if (payload.clientId === clientId) return;
      get().applyTaskDeleted(payload.id);
      try {
        window.dispatchEvent(
          new CustomEvent('kanban:toast', {
            detail: { type: 'warning', title: 'Una tarea fue eliminada' },
          })
        );
      } catch {}
    });
  },
}));
