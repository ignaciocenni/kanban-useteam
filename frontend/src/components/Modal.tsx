import React, { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { lockBodyScroll, unlockBodyScroll } from '../utils/modalLock'

interface ModalProps {
  children: ReactNode
  onClose?: () => void
  closeOnOverlay?: boolean
  closeOnEsc?: boolean
  contentStyle?: React.CSSProperties
  contentClassName?: string
}

export function Modal({
  children,
  onClose,
  closeOnOverlay = false,
  closeOnEsc = true,
  contentStyle,
  contentClassName,
}: ModalProps) {
  const root = typeof document !== 'undefined' ? document.body : null

  useEffect(() => {
    if (!root) return

    lockBodyScroll()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEsc) {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      unlockBodyScroll()
    }
  }, [closeOnEsc, onClose, root])

  if (!root) return null

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && closeOnOverlay) {
      onClose?.()
    }
  }

  const contentClass = contentClassName ? `modal-content ${contentClassName}` : 'modal-content'

  const overlay = (
    <div className="modal-overlay" onClick={handleOverlayClick} role="presentation">
      <div
        className={contentClass}
        role="dialog"
        aria-modal="true"
        style={contentStyle}
      >
        {children}
      </div>
    </div>
  )

  return createPortal(overlay, root)
}
