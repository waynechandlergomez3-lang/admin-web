import React, { useEffect, useState } from 'react'
import toast from '../services/toast'

export default function ToastContainer(){
  const [toasts, setToasts] = useState([])
  useEffect(()=>{
    const unsub = toast.subscribe((t)=>{
      if(t.remove){ setToasts(prev => prev.filter(x=>x.id!==t.id)); return }
      setToasts(prev=>[t,...prev])
    })
    return unsub
  },[])

  const iconFor = (type) => {
    if(type==='success') return '✅'
    if(type==='error') return '❌'
    return 'ℹ️'
  }

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-3">
      {toasts.map(t=> (
        <div key={t.id} className={`flex items-start gap-3 max-w-sm p-3 rounded-lg shadow-lg border ${t.type==='error'?'bg-red-50 border-red-300':t.type==='success'?'bg-green-50 border-green-300':'bg-slate-50 border-slate-200'}`}>
          <div className="text-xl">{iconFor(t.type)}</div>
          <div className="flex-1">
            {t.title && <div className="font-semibold text-sm text-slate-800">{t.title}</div>}
            <div className="text-sm text-slate-700">{t.message}</div>
          </div>
          <button className="text-slate-500" onClick={()=>toast.remove(t.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}
