import React, { useEffect, useState } from 'react'
import confirm from '../services/confirm'
import toast from '../services/toast'

export default function ConfirmModal(){
  const [open, setOpen] = useState(false)
  const [payload, setPayload] = useState(null)
  const [currentResolve, setCurrentResolve] = useState(null)

  useEffect(()=>{
    const unsub = confirm.subscribe((msg)=>{
      if(msg.action === 'open'){
        setPayload(msg.payload)
        setCurrentResolve(()=>msg.resolve)
        setOpen(true)
      }
    })
    return unsub
  },[])

  const close = (result) => {
    setOpen(false)
    if(currentResolve) currentResolve(result)
    setCurrentResolve(null)
    setPayload(null)
  }

  if(!open || !payload) return null

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={()=>close(false)} />
      <div className="bg-white rounded-xl shadow-lg p-6 z-70 w-full max-w-md">
        <div className="flex items-start gap-3">
          <div className="text-2xl text-amber-500">⚠️</div>
          <div>
            <div className="text-lg font-semibold">{payload.title}</div>
            <div className="text-sm text-slate-600">{payload.message}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button className="px-3 py-1 rounded bg-gray-100" onClick={()=>close(false)}>{payload.cancelText || 'Cancel'}</button>
          <button className="px-3 py-1 rounded bg-amber-500 text-white" onClick={()=>close(true)}>{payload.confirmText || 'Confirm'}</button>
        </div>
      </div>
    </div>
  )
}
