const subscribers = new Set()

export function subscribe(fn){ subscribers.add(fn); return ()=>subscribers.delete(fn) }

// showConfirm returns a Promise that resolves to true/false
export function showConfirm({ title='Confirm', message='Are you sure?', confirmText='Confirm', cancelText='Cancel' } = {}){
  return new Promise(resolve => {
    const id = Math.random().toString(36).slice(2,9)
    const payload = { id, title, message, confirmText, cancelText }
    // notify subscribers to open modal
    subscribers.forEach(fn=>fn({ id, action: 'open', payload, resolve }))
    // cleanup: if nobody resolves, the modal should call resolve
  })
}

export function closeConfirm(id, result){
  subscribers.forEach(fn=>fn({ id, action: 'close', result }))
}

export default { subscribe, showConfirm, closeConfirm }
