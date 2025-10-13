const MODAL_DATA_KEY = 'modalCount'

function getCount(): number {
  if (typeof document === 'undefined') return 0
  const value = document.body.dataset[MODAL_DATA_KEY]
  return value ? Number.parseInt(value, 10) || 0 : 0
}

function setCount(count: number) {
  if (typeof document === 'undefined') return
  if (count <= 0) {
    delete document.body.dataset[MODAL_DATA_KEY]
    document.body.classList.remove('modal-open')
  } else {
    document.body.dataset[MODAL_DATA_KEY] = String(count)
    document.body.classList.add('modal-open')
  }
}

export function lockBodyScroll() {
  const next = getCount() + 1
  setCount(next)
}

export function unlockBodyScroll() {
  const next = Math.max(0, getCount() - 1)
  setCount(next)
}
