import { useState, useEffect } from 'react'
import { Board as BoardType, Task } from './types'
import { Board } from './components/Board'
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
      // WebSocket actualizará el estado automáticamente
    } catch (error) {
      console.error('Error creating task:', error)
      // Fallback: agregar localmente si falla el API
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

    setExportStatus('loading')
    setExportMessage('Enviando solicitud de exportación...')

    try {
      await exportBacklog({
        boardId: activeBoardId,
        email: exportEmail,
        fields: exportFields.length > 0 ? exportFields : undefined
      })
      setExportStatus('success')
      setExportMessage('Exportación solicitada correctamente. Revisa tu email.')
      setTimeout(() => {
        setIsExportModalOpen(false)
      }, 1500)
    } catch (error) {
      console.error('Error exporting backlog:', error)
      setExportStatus('error')
      setExportMessage('No se pudo solicitar la exportación. Intenta nuevamente.')
    }
  }

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const updatedTask = await updateTask(id, updates)
      setTasks(prev => prev.map(t => t.id === id ? updatedTask : t))
    } catch (error) {
      console.error('Error updating task:', error)
      // Fallback: actualizar localmente
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t))
    }
  }

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id)
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (error) {
      console.error('Error deleting task:', error)
      // Fallback: eliminar localmente
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
        <h1>Kanban UseTeam</h1>
        <p>Tablero Kanban colaborativo</p>
        <button
          onClick={handleOpenExportModal}
          style={{
            marginTop: '6px',
            padding: '8px 18px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.8rem',
            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)'
          }}
        >
          📤 Exportar backlog
        </button>
        {boards.length > 1 && (
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {boards.map((board, index) => (
              <button
                key={board.id}
                onClick={() => handleSwitchBoard(index)}
                style={{
                  padding: '6px 14px',
                  background: index === activeBoardIndex 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                    : 'rgba(255, 255, 255, 0.8)',
                  color: index === activeBoardIndex ? 'white' : '#4a5568',
                  border: index === activeBoardIndex ? 'none' : '2px solid rgba(102, 126, 234, 0.2)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: index === activeBoardIndex ? '600' : '500',
                  fontSize: '0.8rem',
                  transition: 'all 0.3s ease',
                  boxShadow: index === activeBoardIndex 
                    ? '0 2px 8px rgba(102, 126, 234, 0.3)' 
                    : 'none'
                }}
              >
                {board.title}
              </button>
            ))}
          </div>
        )}
      </header>

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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
        >
          <form
            onSubmit={handleExportSubmit}
            style={{
              background: 'white',
              padding: '28px',
              borderRadius: '16px',
              width: '440px',
              maxWidth: '90vw',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px'
            }}
          >
            <h2 style={{ margin: 0, color: '#2d3748', fontWeight: '700', fontSize: '1.5rem' }}>Exportar backlog</h2>
            <p style={{ margin: 0, color: '#718096', fontSize: '0.95rem' }}>
              Ingresa el email que recibirá el CSV generado por N8N.
            </p>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontWeight: 600, color: '#374151' }}>Email destino</span>
              <input
                type="email"
                value={exportEmail}
                onChange={e => setExportEmail(e.target.value)}
                required
                placeholder="usuario@dominio.com"
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #e2e8f0',
                  background: '#f7fafc',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease',
                  color: '#2d3748'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#667eea'
                  e.currentTarget.style.background = 'white'
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0'
                  e.currentTarget.style.background = '#f7fafc'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </label>

            <fieldset
              style={{
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                background: '#f7fafc',
                color: '#2d3748'
              }}
            >
              <legend style={{ padding: '0 10px', color: '#667eea', fontWeight: 700, fontSize: '0.875rem' }}>Campos a exportar (opcional)</legend>
              {[
                { key: 'title', label: 'Título' },
                { key: 'description', label: 'Descripción' },
                { key: 'column', label: 'Columna' },
                { key: 'position', label: 'Posición' },
                { key: 'createdAt', label: 'Fecha de creación' }
              ].map(field => (
                <label key={field.key} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={exportFields.includes(field.key)}
                    onChange={() => handleToggleField(field.key)}
                  />
                  {field.label}
                </label>
              ))}
              <small style={{ color: '#a0aec0', fontSize: '0.8rem' }}>Si no seleccionas ninguno, se enviarán todos los campos por defecto.</small>
            </fieldset>

            {exportStatus !== 'idle' && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor:
                    exportStatus === 'loading'
                      ? 'rgba(102, 126, 234, 0.1)'
                      : exportStatus === 'success'
                        ? 'rgba(72, 187, 120, 0.1)'
                        : 'rgba(239, 68, 68, 0.1)',
                  color:
                    exportStatus === 'loading'
                      ? '#667eea'
                      : exportStatus === 'success'
                        ? '#38a169'
                        : '#ef4444',
                  fontWeight: '500',
                  fontSize: '0.9rem'
                }}
              >
                {exportMessage}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={handleCloseExportModal}
                style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#e2e8f0',
                  color: '#4a5568',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s ease'
                }}
                disabled={exportStatus === 'loading'}
                onMouseEnter={(e) => e.currentTarget.style.background = '#cbd5e0'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#e2e8f0'}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                disabled={exportStatus === 'loading'}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)'
                }}
              >
                {exportStatus === 'loading' ? 'Enviando...' : 'Enviar exportación'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default App
