import { useState, useEffect } from 'react'
import { Board as BoardType, Task, Column } from './types'
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

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        console.log('Loading data from backend...')
        const apiBoards = await getBoards()
        console.log('Boards loaded:', apiBoards.length)

        if (!cancelled && apiBoards.length > 0) {
          const normalizedBoards = apiBoards.map((b: any) => {
            console.log('📋 Raw board from API:', b.id, 'title:', b.title)
            console.log('📋 Raw columns:', JSON.stringify(b.columns, null, 2))
            const normalized = normalizeColumns(b.columns)
            console.log('📋 Normalized columns:', normalized.map((c: Column) => c.title))
            return {
              id: b.id || b._id,
              title: b.title || 'Sin título',
              description: b.description || '',
              columns: normalized,
              createdAt: new Date(b.createdAt),
              updatedAt: new Date(b.updatedAt),
            }
          }) as BoardType[]
          console.log('📋 Normalized boards:', normalizedBoards.map(b => ({ 
            id: b.id, 
            title: b.title, 
            columns: b.columns.map((c: Column) => c.title) 
          })))

          const first = normalizedBoards[0]
          console.log('Loading tasks for board:', first.id)

          const apiTasks = await getTasks(first.id)
          console.log('Tasks loaded:', apiTasks.length)

          if (!cancelled) {
            setActiveBoardId(first.id)
            setBoards(normalizedBoards)

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
            console.log('Data loaded successfully:', {
              boards: normalizedBoards.length,
              tasks: normalizedTasks.length
            })
          }
        } else {
          console.log('No boards from API, keeping mock data')
        }
      } catch (e) {
        console.warn('Backend not available, using mock data:', e)
        // Ya tenemos los mocks por defecto
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleCreateTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTask = await createTask(task)
      console.log('✅ Task created via API:', newTask.id)
    } catch (error) {
      console.error('❌ Error creating task:', error)
      // Fallback: agregar localmente solo si falla el API
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

    const handleTaskCreated = (task: TaskCreatedEvent) => {
      console.log('📥 Task created via WebSocket:', task.id, 'boardId:', task.boardId)
      setTasks(prev => {
        const normalized = {
          ...task,
          id: task.id,
          createdAt: new Date(task.createdAt),
          updatedAt: new Date(task.updatedAt),
        }

        // Verificar si la tarea ya existe
        const exists = prev.some(t => t.id === normalized.id)
        if (exists) {
          console.log('⚠️ Task already exists, skipping:', normalized.id)
          return prev
        }

        console.log('✅ Adding new task:', normalized.id, 'to column:', normalized.column)
        return [...prev, normalized]
      })
    }

    const handleTaskUpdated = (task: TaskUpdatedEvent) => {
      console.log('Task updated via WebSocket:', task.id)
      setTasks(prev =>
        prev.map(t =>
          t.id === task.id
            ? {
                ...t,
                ...task,
                updatedAt: new Date(task.updatedAt),
              }
            : t,
        ),
      )
    }

    const handleTaskDeleted = (task: TaskDeletedEvent) => {
      console.log('Task deleted via WebSocket:', task.id)
      setTasks(prev => prev.filter(taskItem => taskItem.id !== task.id))
    }

    const handleBoardUpdated = (payload: BoardUpdatedEvent) => {
      console.log('📥 Board updated via WebSocket:', payload.type)
      if (payload.type === 'deleted' && payload.boardId) {
        setBoards(prev => prev.filter(b => b.id !== payload.boardId))
        setTasks(prev => prev.filter(task => task.boardId !== payload.boardId))
        return
      }
      if (payload.type === 'updated' || payload.type === 'created') {
        const board = payload.board
        if (!board) return

        console.log('📋 Board from WebSocket:', board.id, 'columns:', (board as any).columns)

        setBoards(prev => {
          const normalized = {
            ...board,
            id: board.id || board._id,
            columns: normalizeColumns((board as any).columns),
            createdAt: new Date(board.createdAt ?? Date.now()),
            updatedAt: new Date(board.updatedAt ?? Date.now()),
          }

          console.log('📋 Normalized board columns:', normalized.columns.map((c: Column) => c.title))

          const existing = prev.find(b => b.id === normalized.id)
          if (existing) {
            return prev.map(b => (b.id === normalized.id ? normalized : b))
          }
          return [...prev, normalized]
        })

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
      // Solo desconectar si el componente realmente se desmonta
      // No desconectar en re-renders
      console.log('🔄 WebSocket useEffect cleanup')
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
            marginTop: '12px',
            padding: '10px 18px',
            background: '#6a11cb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(106, 17, 203, 0.35)'
          }}
        >
          Exportar backlog
        </button>
        {boards.length > 1 && (
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {boards.map((board, index) => (
              <button
                key={board.id}
                onClick={() => handleSwitchBoard(index)}
                style={{
                  padding: '8px 16px',
                  background: index === activeBoardIndex ? '#4CAF50' : '#ddd',
                  color: index === activeBoardIndex ? 'white' : 'black',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: index === activeBoardIndex ? 'bold' : 'normal'
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
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
              padding: '24px',
              borderRadius: '12px',
              width: '420px',
              maxWidth: '90vw',
              boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <h2 style={{ margin: 0, color: '#4e54c8' }}>Exportar backlog</h2>
            <p style={{ margin: 0, color: '#555' }}>
              Ingresa el email que recibirá el CSV generado por N8N.
            </p>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontWeight: 600 }}>Email destino</span>
              <input
                type="email"
                value={exportEmail}
                onChange={e => setExportEmail(e.target.value)}
                required
                placeholder="usuario@dominio.com"
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #ccc'
                }}
              />
            </label>

            <fieldset
              style={{
                border: '1px solid #eee',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <legend style={{ padding: '0 8px', color: '#6a11cb', fontWeight: 600 }}>Campos a exportar (opcional)</legend>
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
              <small style={{ color: '#777' }}>Si no seleccionas ninguno, se enviarán todos los campos por defecto.</small>
            </fieldset>

            {exportStatus !== 'idle' && (
              <div
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  backgroundColor:
                    exportStatus === 'loading'
                      ? '#e3f2fd'
                      : exportStatus === 'success'
                        ? '#e8f5e9'
                        : '#ffebee',
                  color:
                    exportStatus === 'loading'
                      ? '#1565c0'
                      : exportStatus === 'success'
                        ? '#1b5e20'
                        : '#c62828'
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
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  background: 'white',
                  cursor: 'pointer'
                }}
                disabled={exportStatus === 'loading'}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#6a11cb',
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
                disabled={exportStatus === 'loading'}
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
