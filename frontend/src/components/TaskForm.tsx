import React, { useState } from 'react'
import { Task } from '../types'

interface TaskFormProps {
  title: string
  initialData?: Partial<Task>
  onSubmit: (data: Partial<Task>) => void
  onCancel: () => void
}

export const TaskForm: React.FC<TaskFormProps> = ({
  title,
  initialData,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <>
      <h3>{title}</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Título:</label>
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Descripción:</label>
          <textarea
            value={formData.description}
            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>Cancelar</button>
          <button type="submit">Guardar</button>
        </div>
      </form>
    </>
  )
}
