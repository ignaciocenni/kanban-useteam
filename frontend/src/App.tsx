import { useState, useEffect } from 'react'
import { Board as BoardType, Task } from './types'
import { Board } from './components/Board'
import { Toast, ToastProps } from './components/Toast'
import { Modal } from './components/Modal'
import { mockBoard, mockTasks } from './data/mockData'
import './App.css'
import './components/Kanban.css'
import { getBoards, getTasks, createTask, updateTask, deleteTask, updateTaskPosition, exportBacklog } from './services/api'
import { getSocket, type TaskCreatedEvent, type TaskUpdatedEvent, type TaskDeletedEvent, type BoardUpdatedEvent } from './services/socket'
import { normalizeColumns } from './utils/columns'

function App() {
  const [boards, setBoards] = useState<BoardType[]>([mockBoard])
  const [tasks, setTasks] = useState<Task[]>(mockTasks)
  const [activeBoardId, setActiveBoardId] = useState<string>(mockBoard.id)
  const [activeBoardIndex, setActiveBoardIndex] = useState<number>(0)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportEmail, setExportEmail] = useState('')
  const [exportFields, setExportFields] = useState<string[]>([])
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [exportMessage, setExportMessage] = useState<string>('')
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const showToast = (type: ToastProps['type'], title: string, message?: string) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, type, title, message, onClose: removeToast }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  // Cargar datos iniciales del backend al montar el componente
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const apiBoards = await getBoards()

        if (!cancelled && apiBoards.length > 0) {
          // Normalizar columnas de cada tablero
          const normalizedBoards = apiBoards.map((b: any) => ({
            id: b.id || b._id,
            title: b.title || 'Sin título',
            description: b.description || '',
            columns: normalizeColumns(b.columns),
            createdAt: new Date(b.createdAt),
            updatedAt: new Date(b.updatedAt),
          })) as BoardType[]

          const first = normalizedBoards[0]
          const apiTasks = await getTasks(first.id)

          if (!cancelled) {
            setActiveBoardId(first.id)
            setBoards(normalizedBoards)

            // Normalizar tareas para compatibilidad con MongoDB
            const normalizedTasks = apiTasks.map(t => ({
              ...t,
              id: (t as any).id || (t as any)._id,
              boardId: (t as any).boardId || first.id,
              column: t.column,
              position: t.position ?? 0,
              createdAt: new Date(t.createdAt),
              updatedAt: new Date(t.updatedAt),
            })) as Task[]

            setTasks(normalizedTasks)
          }
        }
      } catch (e) {
        console.warn('Backend not available, using mock data:', e)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleCreateTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createTask(task)
      showToast('success', 'Tarea creada', 'La tarea se ha creado correctamente')
    } catch (error) {
      console.error('Error creating task:', error)
      showToast('error', 'Error', 'No se pudo crear la tarea')
      const mockTask: Task = {
        ...task,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setTasks(prev => [...prev, mockTask])
    }
  }

  const handleOpenExportModal = () => {
    setExportEmail('')
    setExportFields([])
    setExportStatus('idle')
    setExportMessage('')
    setIsExportModalOpen(true)
  }

  const handleCloseExportModal = () => {
    if (exportStatus === 'loading') return
    setIsExportModalOpen(false)
  }

  const handleToggleField = (field: string) => {
    setExportFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    )
  }

  const handleExportSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeBoardId || !exportEmail) {
      setExportStatus('error')
      setExportMessage('Debes seleccionar un tablero y un email válido.')
      return
    }
    try {
      setExportStatus('loading')
      setExportMessage('Enviando solicitud...')

      await exportBacklog({
        boardId: activeBoardId,
        email: exportEmail,
        fields: exportFields.length > 0 ? exportFields : undefined,
      })

      setExportStatus('success')
      setExportMessage('✅ Exportación solicitada con éxito. Revisa tu email.')
      showToast('success', 'Exportación iniciada', `El CSV se enviará a ${exportEmail}`)
      setTimeout(() => setIsExportModalOpen(false), 2000)
    } catch (error) {
      console.error('Error exporting backlog:', error)
      setExportStatus('error')
      setExportMessage('No se pudo solicitar la exportación. Intenta nuevamente.')
      showToast('error', 'Error en exportación', 'No se pudo procesar la solicitud')
    }
  }

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const updatedTask = await updateTask(id, updates)
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t))
      showToast('success', 'Tarea actualizada', 'Los cambios se guardaron correctamente')
    } catch (error) {
      console.error('Error updating task:', error)
      showToast('error', 'Error', 'No se pudo actualizar la tarea')
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t))
    }
  }

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id)
      setTasks(prev => prev.filter(t => t.id !== id))
      showToast('success', 'Tarea eliminada', 'La tarea se eliminó correctamente')
    } catch (error) {
      console.error('Error deleting task:', error)
      showToast('error', 'Error', 'No se pudo eliminar la tarea')
      setTasks(prev => prev.filter(t => t.id !== id))
    }
  }

  const handleUpdateTaskPosition = async (id: string, column: string, position: number) => {
    try {
      const updatedTask = await updateTaskPosition(id, column, position)
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t))
    } catch (error) {
      console.error('Error updating task position:', error)
      // Fallback: actualizar localmente
      setTasks(prev => prev.map(t => t.id === id ? { ...t, column, position, updatedAt: new Date() } : t))
    }
  }

  useEffect(() => {
    const socket = getSocket()

    // Sincronización en tiempo real: nueva tarea creada por otro usuario
    const handleTaskCreated = (task: TaskCreatedEvent) => {
      setTasks(prev => {
        const normalized = {
          ...task,
          id: task.id,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
        }

        // Evitar duplicados si la tarea ya existe
        const exists = prev.some(t => t.id === normalized.id)
        if (exists) return prev

        showToast('info', 'Nueva tarea', `Se agregó "${task.title}" al tablero`)
        return [...prev, normalized]
      })
    }

    // Sincronización en tiempo real: tarea actualizada
    const handleTaskUpdated = (task: TaskUpdatedEvent) => {
      setTasks(prev =>
        prev.map(t =>
          t.id === task.id
            ? { ...t, ...task, updatedAt: new Date(task.updatedAt) }
            : t,
        ),
      )
    }

    // Sincronización en tiempo real: tarea eliminada
    const handleTaskDeleted = (task: TaskDeletedEvent) => {
      setTasks(prev => prev.filter(taskItem => taskItem.id !== task.id))
      showToast('info', 'Tarea eliminada', 'Una tarea fue eliminada del tablero')
    }

    // Sincronización en tiempo real: tablero actualizado/creado/eliminado
    const handleBoardUpdated = (payload: BoardUpdatedEvent) => {
      if (payload.type === 'deleted' && payload.boardId) {
        setBoards(prev => prev.filter(b => b.id !== payload.boardId))
        setTasks(prev => prev.filter(task => task.boardId !== payload.boardId))
        return
      }
      if (payload.type === 'updated' || payload.type === 'created') {
        const board = payload.board
        if (!board) return

        setBoards(prev => {
          const normalized = {
            ...board,
            id: board.id || board._id,
            columns: normalizeColumns((board as any).columns),
            createdAt: new Date(board.createdAt ?? Date.now()),
            updatedAt: new Date(board.updatedAt ?? Date.now()),
          }

          const existing = prev.find(b => b.id === normalized.id)
          if (existing) {
            return prev.map(b => (b.id === normalized.id ? normalized : b))
          }
          return [...prev, normalized]
        })

        // Si es un tablero nuevo, cargarlo y activarlo
        if (payload.type === 'created') {
          setActiveBoardId(board.id || board._id)
          getTasks(board.id || board._id).then(apiTasks => {
            setTasks(
              apiTasks.map(t => ({
                ...t,
                id: (t as any).id || (t as any)._id,
                boardId: (t as any).boardId || (board.id || board._id),
                column: t.column,
                position: t.position ?? 0,
                createdAt: new Date(t.createdAt),
                updatedAt: new Date(t.updatedAt),
              })) as Task[],
            )
          })
        }
      }
    }

    socket.on('task.created', handleTaskCreated)
    socket.on('task.updated', handleTaskUpdated)
    socket.on('task.deleted', handleTaskDeleted)
    socket.on('board.updated', handleBoardUpdated)

    return () => {
      // Cleanup: los listeners se mantienen activos durante toda la sesión
    }
  }, [])

  const handleSwitchBoard = async (index: number) => {
    setActiveBoardIndex(index)
    const board = boards[index]
    setActiveBoardId(board.id)
    
    // Cargar tareas del nuevo board
    try {
      const apiTasks = await getTasks(board.id)
      const normalizedTasks = apiTasks.map(t => ({
        ...t,
        id: (t as any).id || (t as any)._id,
        boardId: (t as any).boardId || board.id,
        column: t.column,
        position: t.position ?? 0,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      })) as Task[]
      setTasks(normalizedTasks)
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }

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
          {boards.length > 1 && boards.map((board, index) => (
            <button
              key={board.id}
              onClick={() => handleSwitchBoard(index)}
              style={{
                padding: '6px 14px',
                background: index === activeBoardIndex 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: index === activeBoardIndex ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: index === activeBoardIndex ? '600' : '500',
                fontSize: '0.8rem',
                transition: 'all 0.3s ease',
                boxShadow: index === activeBoardIndex 
                  ? '0 2px 8px rgba(59, 130, 246, 0.4)' 
                  : 'none'
              }}
            >
              {board.title}
            </button>
          ))}
          <button
            onClick={handleOpenExportModal}
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
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.4)'
            }}
          >
            📤 Exportar
          </button>
        </div>
      </header>

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>

      <main className="app-main">
        <div className="boards-container">
          {boards.length > 0 ? (
            <Board
              board={boards[activeBoardIndex]}
              tasks={tasks}
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

      {isExportModalOpen && (
        <Modal onClose={handleCloseExportModal}>
          <form className="modal-export" onSubmit={handleExportSubmit}>
            <h2>Exportar backlog</h2>
            <p>Ingresa el email que recibirá el CSV generado por N8N.</p>

            <label className="form-group" style={{ marginBottom: 0 }}>
              <span>Email destino</span>
              <input
                type="email"
                value={exportEmail}
                onChange={e => setExportEmail(e.target.value)}
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
                { key: 'createdAt', label: 'Fecha de creación' }
              ].map(field => (
                <label key={field.key}>
                  <input
                    type="checkbox"
                    checked={exportFields.includes(field.key)}
                    onChange={() => handleToggleField(field.key)}
                  />
                  {field.label}
                </label>
              ))}
              <small>Si no seleccionas ninguno, se enviarán todos los campos por defecto.</small>
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
              <button type="button" onClick={handleCloseExportModal} disabled={exportStatus === 'loading'}>
                Cancelar
              </button>
              <button type="submit" disabled={exportStatus === 'loading'}>
                Enviar exportación
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default App
