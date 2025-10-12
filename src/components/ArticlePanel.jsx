import React, { useState } from 'react'
import api from '../services/api'
import toast from '../services/toast'

export default function ArticlePanel(){
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchPreview = async () => {
    try{
      setLoading(true)
      // let backend create and return the article (we treat this as preview + save)
      const res = await api.post('/articles', { url })
      setPreview(res.data)
  }catch(err){ console.error('preview', err); toast.notify({ type: 'error', message: 'Failed to fetch preview' }) }
    setLoading(false)
  }

  const saveArticle = async () => {
    try{
  if(!preview) return toast.notify({ type: 'error', message: 'No preview to save' })
  toast.notify({ type: 'success', message: 'Article saved' })
      setUrl('')
      setPreview(null)
  }catch(err){ console.error(err); toast.notify({ type: 'error', message: 'Failed to save' }) }
  }

  return (
    <div className="bg-white rounded-xl shadow p-4 space-y-3">
      <h3 className="font-semibold">Article / News</h3>
      <div className="flex gap-2">
        <input className="flex-1 p-2 border rounded" placeholder="https://example.com/article" value={url} onChange={e=>setUrl(e.target.value)} />
        <button className="px-3 py-1 bg-sky-600 text-white rounded" onClick={fetchPreview} disabled={!url || loading}>{loading ? 'Loading...' : 'Preview'}</button>
      </div>

      {preview && (
        <div className="border rounded p-3 flex gap-3">
          <img src={preview.imageUrl || '/favicon.png'} style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 8 }} />
          <div>
            <div className="font-semibold">{preview.title}</div>
            <div className="text-xs text-slate-500">{preview.source}</div>
            <div className="mt-2 text-sm text-slate-700">{preview.description}</div>
            <div className="mt-3 flex gap-2">
              <button className="px-2 py-1 bg-emerald-600 text-white rounded" onClick={saveArticle}>Save</button>
              <a className="px-2 py-1 bg-gray-200 rounded" href={preview.url} target="_blank">Open</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
