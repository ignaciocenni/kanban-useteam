import { useState, useEffect } from 'react';
import { Board } from './components/Board';
import { Toast, ToastProps } from './components/Toast';
import { Modal } from './components/Modal';
import './App.css';
import './components/Kanban.css';
import {
  getBoards,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  updateTaskPosition,
  exportBacklog,
} from './services/api';
import { useKanbanStore } from './store/useKanbanStore';
import type { Task } from './types';

function App() {
  const {
    boards,
    tasks,
    activeBoardId,
    setBoards,
    setTasks,
    setActiveBoard,
    initSocket,
  } = useKanbanStore();

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportEmail, setExportEmail] = useState('');
  const [exportFields, setExportFields] = useState<string[]>([]);
  const [exportStatus, setExportStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [exportMessage, setExportMessage] = useState<string>('');

  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const [activeBoardIndex, setActiveBoardIndex] = useState<number>(0);

  const showToast = (
    type: ToastProps['type'],
    title: string,
    message?: string
  ) => {
    const id = Date.now().toString();
    setToasts((prev) => [
      ...prev,
      { id, type, title, message, onClose: removeToast },
    ]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ==========================================================
  // Cargar datos iniciales
  // ==========================================================
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const apiBoards = await getBoards();
        if (cancelled) return;

        if (apiBoards.length === 0) {
          setBoards([]);
          setTasks([]);
          setActiveBoard(null);
          return;
        }

        setBoards(apiBoards);
        const firstBoardId = apiBoards[0].id;
        setActiveBoard(firstBoardId);
        setActiveBoardIndex(0);

        const apiTasks = await getTasks(firstBoardId);
        if (cancelled) return;
        setTasks(apiTasks);
      } catch (e) {
        console.warn('Backend no disponible');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [setBoards, setTasks, setActiveBoard]);

  // ==========================================================
  // Inicializar WebSocket
  // ==========================================================
  useEffect(() => {
    initSocket();
  }, [initSocket]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{
        type: ToastProps['type'];
        title: string;
        message?: string;
      }>).detail;
      if (!detail) return;
      showToast(detail.type, detail.title, detail.message);
    };
    window.addEventListener('kanban:toast', handler as EventListener);
    return () => {
      window.removeEventListener('kanban:toast', handler as EventListener);
    };
  }, []);

  // ==========================================================
  // HANDLERS DE CRUD
  // ==========================================================

  const handleCreateTask = async (task: Partial<Task>) => {
    try {
      const created = await createTask(task);
      setTasks([...tasks, created]);
      showToast('success', 'Tarea creada correctamente');
    } catch (error) {
      showToast('error', 'Error', 'No se pudo crear la tarea');
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const updatedTask = await updateTask(id, updates);
      setTasks(tasks.map((t) => (t.id === id ? updatedTask : t)));
      showToast('success', 'Cambios guardados');
    } catch (error) {
      showToast('error', 'Error', 'No se pudo actualizar la tarea');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
      setTasks(tasks.filter((t) => t.id !== id));
      showToast('success', 'Tarea eliminada');
    } catch {
      showToast('error', 'Error', 'No se pudo eliminar la tarea');
    }
  };

  const handleUpdateTaskPosition = async (
    id: string,
    columnId: string,
    position: number
  ) => {
    try {
      const updated = await updateTaskPosition(id, columnId, position);
      const currentTasks = useKanbanStore.getState().tasks;
      setTasks(currentTasks.map((t) => (t.id === id ? updated : t)));
      const columns = (boards as any)[activeBoardIndex]?.columns;
      const columnTitle =
        columns && Array.isArray(columns)
          ? columns.find((c) => c.id === columnId)?.title
          : undefined;
      /**
       * Criterio de toasts locales post-movimiento:
       * - Si el último movimiento fue intra-columna (prev === next), NO emitir toast.
       * - Si fue entre columnas (prev !== next), emitir "Tarea movida a <columna destino>".
       */
      const meta = useKanbanStore.getState().lastMoveMeta;
      const isSameColumn =
        meta && meta.taskId === id && meta.prevColumnId === meta.nextColumnId;
      if (!isSameColumn) {
        showToast(
          'info',
          columnTitle ? `Tarea movida a «${columnTitle}»` : 'Tarea movida'
        );
      }
    } catch {}
  };

  // ==========================================================
  // Cambio de tablero
  // ==========================================================
  const handleSwitchBoard = async (index: number) => {
    const currentBoards = useKanbanStore.getState().boards;
    setActiveBoardIndex(index);
    const board = currentBoards[index];
    setActiveBoard(board.id);

    try {
      const apiTasks = await getTasks(board.id);
      setTasks(apiTasks);
    } catch {}
  };

  // ==========================================================
  // FUNCIONES DEL MODAL DE EXPORTACIÓN
  // ==========================================================
  const openExportModal = () => {
    setIsExportModalOpen(true);
    setExportEmail('');
    setExportFields([]);
    setExportStatus('idle');
    setExportMessage('');
  };

  const closeExportModal = () => {
    setIsExportModalOpen(false);
    setExportEmail('');
    setExportFields([]);
    setExportStatus('idle');
    setExportMessage('');
  };

  const toggleExportField = (fieldKey: string) => {
    setExportFields((prev) =>
      prev.includes(fieldKey)
        ? prev.filter((f) => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const handleExportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setExportStatus('loading');
    setExportMessage('Enviando solicitud de exportación...');

    try {
      if (!activeBoardId) {
        throw new Error('No hay board activo');
      }
      await exportBacklog({
        boardId: activeBoardId,
        email: exportEmail,
        fields: exportFields.length > 0 ? exportFields : undefined,
      });

      setExportStatus('success');
      setExportMessage(
        `Exportación enviada exitosamente a ${exportEmail}. Revisa tu bandeja de entrada.`
      );

      setTimeout(() => {
        closeExportModal();
      }, 3000);
    } catch (error) {
      setExportStatus('error');
      setExportMessage(
        'Error al enviar la exportación. Por favor intenta nuevamente.'
      );
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="App">
      <header className="app-header">
        <div className="app-header-left">
          <div>
            <h1>Kanban UseTeam</h1>
            <p>Tablero Kanban colaborativo en tiempo real</p>
          </div>
        </div>
        <div className="app-header-right">
          {boards.length > 1 &&
            boards.map((board, index) => (
              <button
                key={board.id}
                onClick={() => handleSwitchBoard(index)}
                style={{
                  padding: '6px 14px',
                  background:
                    index === activeBoardIndex
                      ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                      : 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border:
                    index === activeBoardIndex
                      ? 'none'
                      : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: index === activeBoardIndex ? '600' : '500',
                  fontSize: '0.8rem',
                  transition: 'all 0.3s ease',
                  boxShadow:
                    index === activeBoardIndex
                      ? '0 2px 8px rgba(59, 130, 246, 0.4)'
                      : 'none',
                }}
              >
                {board.title}
              </button>
            ))}
          <button
            onClick={openExportModal}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '0.8rem',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow =
                '0 4px 16px rgba(59, 130, 246, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow =
                '0 2px 8px rgba(59, 130, 246, 0.4)';
            }}
          >
            📤 Exportar
          </button>
        </div>
      </header>

      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>

      <main className="app-main">
        <div className="boards-container">
          {boards.length > 0 && activeBoardId ? (
            <Board
              board={boards[activeBoardIndex]}
              tasks={tasks.filter((t) => t.boardId === activeBoardId)}
              onCreateTask={handleCreateTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onUpdateTaskPosition={handleUpdateTaskPosition}
            />
          ) : (
            <div className="no-boards">
              <h2>No hay tableros disponibles</h2>
              <p>Crea tu primer tablero para comenzar</p>
            </div>
          )}
        </div>
      </main>

      {isExportModalOpen && activeBoardId && (
        <Modal onClose={closeExportModal}>
          <form className="modal-export" onSubmit={handleExportSubmit}>
            <h2>Exportar backlog</h2>
            <p>Ingresa el email que recibirá el CSV generado por N8N.</p>

            <label className="form-group" style={{ marginBottom: 0 }}>
              <span>Email destino</span>
              <input
                type="email"
                value={exportEmail}
                onChange={(e) => setExportEmail(e.target.value)}
                required
                placeholder="usuario@dominio.com"
              />
            </label>

            <fieldset className="modal-fieldset">
              <legend>Campos a exportar (opcional)</legend>
              {[
                { key: 'title', label: 'Título' },
                { key: 'description', label: 'Descripción' },
                { key: 'column', label: 'Columna' },
                { key: 'position', label: 'Posición' },
                { key: 'createdAt', label: 'Fecha de creación' },
              ].map((field) => (
                <label key={field.key}>
                  <input
                    type="checkbox"
                    checked={exportFields.includes(field.key)}
                    onChange={() => toggleExportField(field.key)}
                  />
                  {field.label}
                </label>
              ))}
              <small>
                Si no seleccionas ninguno, se enviarán todos los campos por
                defecto.
              </small>
            </fieldset>

            {exportStatus !== 'idle' && (
              <div
                className={`modal-status ${
                  exportStatus === 'loading'
                    ? 'is-loading'
                    : exportStatus === 'success'
                    ? 'is-success'
                    : 'is-error'
                }`}
              >
                {exportMessage}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                onClick={closeExportModal}
                disabled={exportStatus === 'loading'}
              >
                Cancelar
              </button>
              <button type="submit" disabled={exportStatus === 'loading' || !activeBoardId}>
                Enviar exportación
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default App;
