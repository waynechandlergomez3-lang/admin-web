const subscribers = new Set()
export function subscribe(fn){ subscribers.add(fn); return ()=>subscribers.delete(fn) }
export function notify({ type='info', title='', message='', timeout=4000 }){
  const id = Math.random().toString(36).slice(2,9)
  subscribers.forEach(fn=>fn({ id, type, title, message }))
  if(timeout>0){ setTimeout(()=>{ subscribers.forEach(fn=>fn({ id, remove: true })) }, timeout) }
  return id
}
export function remove(id){ subscribers.forEach(fn=>fn({ id, remove: true })) }

export default { subscribe, notify, remove }
