import { io, Socket } from 'socket.io-client'

export interface TaskCreatedEvent {
  id: string
  boardId: string
  title: string
  description?: string
  column: string
  position: number
  createdAt: string
  updatedAt: string
}

export interface TaskUpdatedEvent {
  id: string
  boardId: string
  title?: string
  description?: string
  column?: string
  position?: number
  updatedAt: string
}

export interface TaskDeletedEvent {
  id: string
  boardId: string
}

export interface BoardUpdatedEvent {
  type: 'created' | 'updated' | 'deleted'
  board?: any
  boardId?: string
}

interface SocketEvents {
  'task.created': (task: TaskCreatedEvent) => void
  'task.updated': (task: TaskUpdatedEvent) => void
  'task.deleted': (task: TaskDeletedEvent) => void
  'board.updated': (payload: BoardUpdatedEvent) => void
}

let socket: Socket<SocketEvents> | null = null

export function getSocket(): Socket<SocketEvents> {
  if (!socket) {
    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000'
    console.log('🔌 Connecting to WebSocket:', wsUrl)

    socket = io(wsUrl, {
      transports: ['websocket'],
      withCredentials: true,
    })

    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket?.id)
    })

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected')
    })

    socket.on('connect_error', (error) => {
      console.error('🚨 WebSocket connection error:', error)
    })
  }

  return socket
}

export function disconnectSocket() {
  if (socket) {
    console.log('🔌 Disconnecting WebSocket')
    socket.disconnect()
    socket = null
  }
}
