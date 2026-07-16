export interface ToastMessage { id: number; text: string; type: 'success' | 'error' }

type Listener = (msg: ToastMessage) => void
let listener: Listener | null = null
let nextId = 0

export function subscribe(fn: Listener) { listener = fn }
export function toast(text: string, type: 'success' | 'error' = 'success') {
  listener?.({ id: nextId++, text, type })
}
