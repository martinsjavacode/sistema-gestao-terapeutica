export interface ConfirmOptions {
  message: string
  details?: string
  confirmLabel?: string
  variant?: 'danger' | 'primary'
}

export interface ConfirmState extends ConfirmOptions {
  resolve: (v: boolean) => void
}

type Listener = (s: ConfirmState) => void
let listener: Listener | null = null

export function subscribeConfirm(fn: Listener) { listener = fn }

export function confirm(msgOrOptions: string | ConfirmOptions): Promise<boolean> {
  const options: ConfirmOptions = typeof msgOrOptions === 'string'
    ? { message: msgOrOptions }
    : msgOrOptions
  return new Promise(resolve => listener?.({ ...options, resolve }))
}
