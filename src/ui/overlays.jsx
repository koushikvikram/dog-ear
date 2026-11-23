import React, { useEffect, useRef } from 'react'
import { Button, Dialog, Drawer, DrawerHeader, Scrim, Sheet, SheetHeader } from '../design-system/index.js'

// Only the topmost overlay reacts to Escape.
const stack = []
function useEscape(onClose) {
  const fn = useRef(onClose); fn.current = onClose
  useEffect(() => {
    const me = {}
    stack.push(me)
    const f = e => { if (e.key === 'Escape' && stack[stack.length - 1] === me) { e.stopPropagation(); fn.current() } }
    window.addEventListener('keydown', f)
    return () => { window.removeEventListener('keydown', f); stack.splice(stack.indexOf(me), 1) }
  }, [])
}

// Focus the first field when an overlay opens, unless something inside already took focus (autoFocus).
function useFirstFocus(ref, enabled = true) {
  useEffect(() => {
    if (!enabled || !ref.current || ref.current.contains(document.activeElement)) return
    const el = ref.current.querySelector('input:not([tabindex="-1"]),textarea,select')
    el && el.focus()
  }, [])  // eslint-disable-line
}

/*
  Create/edit forms. kind:
    'drawer'  desktop right-hand drawer (440px) behind a scrim
    'bottom'  phone Your books: the same drawer docked at the bottom, behind a scrim
    'sheet'   phone Book: a sheet above the tab bar, no scrim, titled with a noun
*/
export function FormOverlay({ kind = 'drawer', title, onClose, children, actions, focus = true, label, tall, head }) {
  const ref = useRef()
  useEscape(onClose)
  useFirstFocus(ref, focus)
  if (kind === 'sheet') {
    return (
      <Sheet label={label || (typeof title === 'string' ? title : 'Details')} className={tall ? 'app-sheet--tall' : null}>
        <div ref={ref} style={{ display: 'contents' }}>
          {head || <SheetHeader title={title} onClose={onClose} actions={actions} />}
          {children}
        </div>
      </Sheet>
    )
  }
  return (
    <>
      <Scrim onClick={onClose} />
      <Drawer placement={kind === 'bottom' ? 'bottom' : 'right'} role="dialog" aria-modal="true"
        aria-label={label || (typeof title === 'string' ? title : 'Details')}>
        <div ref={ref} style={{ display: 'contents' }}>
          <DrawerHeader title={title} onClose={onClose} />
          <div className="app-drawer-body">{children}</div>
        </div>
      </Drawer>
    </>
  )
}

// Destructive confirmation: Cancel (secondary, focused) and the danger fill button. Escape cancels.
export function ConfirmDialog({ title, confirmLabel, onCancel, onConfirm, children }) {
  useEscape(onCancel)
  return (
    <>
      <Scrim label="Cancel" onClick={onCancel} />
      <Dialog title={title} titleId="confirm-title" aria-modal="true"
        actions={<>
          <Button variant="secondary" autoFocus onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </>}>
        {children}
      </Dialog>
    </>
  )
}

// Closes a popup (menu, popover) on outside pointer-down and on Escape.
export function useDismiss(ref, open, onClose) {
  const fn = useRef(onClose); fn.current = onClose
  useEffect(() => {
    if (!open) return
    const down = e => ref.current && !ref.current.contains(e.target) && fn.current()
    const key = e => e.key === 'Escape' && fn.current()
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key) }
  }, [open])  // eslint-disable-line
}
