import { create } from "zustand";
import type { TaskContract } from "../contracts/task.contract";
import type { BoardContract } from "../contracts/board.contract";
import { getSocket } from "../services/socket";
import { getClientId } from "../services/clientId";
import type { Task } from "../types";
import {
  fromTaskContract,
  fromTaskContractPartial,
} from "../mappers/task.mapper";

interface KanbanState {
  boards: BoardContract[];
  tasks: Task[];
  activeBoardId: string | null;
  lastMoveMeta?: { taskId: string; prevColumnId: string; nextColumnId: string };

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

/**
 * Store Zustand para gestión de estado Kanban.
 *
 * Características:
 * - Persiste estado en localStorage para persistencia entre sesiones.
 * - Proporciona métodos para manipulación y sincronización con backend.
 * - Implementa reordenamiento optimista para mejorar experiencia de usuario.
 */
export const useKanbanStore = create<KanbanState>((set, get) => ({
  boards: [],
  tasks: [],
  activeBoardId: null,
  lastMoveMeta: undefined,

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

  /**
   * Reordenamiento optimista en memoria.
   *
   * Objetivos:
   * - Actualizar inmediatamente la UI al arrastrar/soltar sin esperar backend.
   * - Mantener índices (`position`) consecutivos desde 0 en cada columna.
   *
   * Detalles:
   * - `safePosition` se clamp-ea a [0, length] de la columna destino.
   * - Se inserta la tarea movida en la posición objetivo y se reindexa destino.
   * - Si cambia de columna, se reindexa la columna origen; otras columnas intactas.
   * - Complejidad O(n) respecto de la cantidad de tareas en las columnas afectadas.
   */
  reorderTaskLocally: (taskId, newColumnId, newPosition) => {
    set((state) => {
      const taskToMove = state.tasks.find((t) => t.id === taskId);
      if (!taskToMove) return state;

      // 0. Extraer columna origen
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

      // 5. Reindexar columna destino
      const reorderedTargetColumn = [
        ...targetColumnTasks.slice(0, safePosition),
        updatedMovedTask,
        ...targetColumnTasks.slice(safePosition),
      ].map((task, index) => ({
        ...task,
        position: index,
      }));

      // 6. Si cambia de columna, reindexar la columna origen
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

      // 7. Otras columnas intactas
      const otherTasks = remainingTasks.filter(
        (t) => t.columnId !== newColumnId && t.columnId !== sourceColumnId
      );

      return {
        tasks: [...otherTasks, ...sourceColumnTasks, ...reorderedTargetColumn],
        /**
         * Meta del último movimiento para que App distinga
         * intención del usuario al emitir toasts locales:
         * - prevColumnId === nextColumnId → reordenamiento intra-columna (sin toast local)
         * - prevColumnId !== nextColumnId → movimiento entre columnas (toast local)
         */
        lastMoveMeta: {
          taskId,
          prevColumnId: sourceColumnId,
          nextColumnId: newColumnId,
        },
      };
    });
  },

  /**
   * Inicializa suscripción a eventos de tiempo real.
   *
   * Puntos clave:
   * - `clientId` por pestaña: el backend adjunta `clientId` y el frontend
   *   descarta eventos originados en la misma pestaña para evitar duplicados.
   * - Se mapean contratos (`TaskContract`) a tipos de dominio (`Task`) con mappers.
   * - Se emiten toasts a través de `window.dispatchEvent('kanban:toast', ...)`
   *   para centralizar UI de notificaciones.
   */
  initSocket: () => {
    // 1. Obtener socket y clientId
    const socket = getSocket();
    const clientId = getClientId();

    // 2. Desuscribir eventos existentes
    socket.off("task.created");
    socket.off("task.updated");
    socket.off("task.deleted");

    // 3. Suscribir eventos de tareas
    socket.on(
      "task.created",
      (payload: TaskContract & { clientId?: string }) => {
        if (payload.clientId === clientId) return;
        get().applyTaskCreated(fromTaskContract(payload));
        try {
          window.dispatchEvent(
            new CustomEvent("kanban:toast", {
              detail: {
                type: "info",
                title: "Se creó una nueva tarea",
              },
            })
          );
        } catch {}
      }
    );

    // 4. Suscribir evento de actualización
    socket.on(
      "task.updated",
      (payload: Partial<TaskContract> & { id: string; clientId?: string }) => {
        if (payload.clientId === clientId) return;

        const existing = get().tasks.find((t) => t.id === payload.id);
        if (!existing) return;

        const patch = fromTaskContractPartial(payload);
        get().applyTaskUpdated({ ...existing, ...patch } as Task);
        try {
          /**
           * Criterio de toasts:
           * - Movimiento real de columna: `columnId` cambia → toast de "cambió de columna".
           * - Edición de contenido: `title`/`description` cambian → toast de "actualizada".
           * - Reordenamiento intra-columna (incluye reindexado): solo cambia `position` y no cambia `columnId` → sin toast.
           *   Se ignoran toasts para evitar duplicados por múltiples `task.updated` derivados de reindexado.
           */
          const prevColumnId = existing.columnId;
          const nextColumnId =
            patch.columnId !== undefined ? patch.columnId : prevColumnId;
          const isMove =
            patch.columnId !== undefined && nextColumnId !== prevColumnId;
          const isEdit =
            (patch.title !== undefined && patch.title !== existing.title) ||
            (patch.description !== undefined &&
              patch.description !== existing.description);
          const isSameColumnReorder =
            !isMove &&
            !isEdit &&
            patch.position !== undefined &&
            nextColumnId === prevColumnId;

          if (isSameColumnReorder) {
            return;
          }
          /**
           * Edición remota:
           * Emitir toast SIEMPRE cuando `title` y/o `description` cambian respecto del estado previo,
           * incluso si el backend incluye `position` en el payload (no confundir con reordenamiento).
           */
          window.dispatchEvent(
            new CustomEvent("kanban:toast", {
              detail: {
                type: "info",
                title: isMove
                  ? "Una tarea cambió de columna"
                  : isEdit
                  ? "Una tarea fue actualizada"
                  : undefined,
              },
            })
          );
        } catch {}
      }
    );

    // 5. Suscribir evento de eliminación
    socket.on("task.deleted", (payload: { id: string; clientId?: string }) => {
      if (payload.clientId === clientId) return;
      get().applyTaskDeleted(payload.id);
      try {
        window.dispatchEvent(
          new CustomEvent("kanban:toast", {
            detail: { type: "warning", title: "Una tarea fue eliminada" },
          })
        );
      } catch {}
    });
  },
}));
