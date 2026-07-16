export interface ConfirmState { message: string; resolve: (v: boolean) => void }

type Listener = (s: ConfirmState) => void
let listener: Listener | null = null

export function subscribeConfirm(fn: Listener) { listener = fn }
export function confirm(msg: string): Promise<boolean> {
  return new Promise(resolve => listener?.({ message: msg, resolve }))
}
