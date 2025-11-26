import React, { useEffect, useState } from 'react'
import api from '../services/api'
import toast from '../services/toast'

export default function CitizenMediaReview({ onEmergencyCreated = () => {} }) {
  const [mediaList, setMediaList] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [processingId, setProcessingId] = useState(null)

  const loadMedia = async () => {
    try {
      setLoading(true)
      const res = await api.get('/media/admin/all', { 
        params: { status: statusFilter }
      })
      setMediaList(res.data || [])
    } catch (err) {
      console.error('Failed to load media', err)
      toast.notify({ type: 'error', message: 'Failed to load media' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMedia()
  }, [statusFilter])

  const handleVerify = async (mediaId) => {
    if (processingId) return
    
    setProcessingId(mediaId)
    try {
      const res = await api.post('/media/admin/verify', { mediaId })
      
      toast.notify({ 
        type: 'success', 
        message: `Media verified! Emergency ${res.data.emergency.id} created.` 
      })
      
      onEmergencyCreated(res.data.emergency)
      await loadMedia()
      setSelectedMedia(null)
      setVerifyModalOpen(false)
    } catch (err) {
      console.error('Verification failed', err)
      const errorMsg = err.response?.data?.error || 'Verification failed'
      const isActiveEmergency = err.response?.data?.userActiveEmergency
      
      if (isActiveEmergency) {
        toast.notify({ 
          type: 'error', 
          message: `${errorMsg}\n\nUser has active emergency: ${isActiveEmergency.status}` 
        })
      } else {
        toast.notify({ type: 'error', message: errorMsg })
      }
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (mediaId) => {
    if (processingId) return
    
    if (!rejectReason.trim()) {
      toast.notify({ type: 'error', message: 'Please provide a reason for rejection' })
      return
    }

    setProcessingId(mediaId)
    try {
      await api.patch(`/media/admin/${mediaId}/status`, {
        status: 'REJECTED',
        notes: rejectReason
      })
      
      toast.notify({ type: 'success', message: 'Media rejected' })
      await loadMedia()
      setSelectedMedia(null)
      setRejectReason('')
    } catch (err) {
      console.error('Rejection failed', err)
      toast.notify({ type: 'error', message: 'Failed to reject media' })
    } finally {
      setProcessingId(null)
    }
  }

  const getEmergencyTypeColor = (type) => {
    const colors = {
      FIRE: '#ff6b6b',
      MEDICAL: '#e74c3c',
      POLICE: '#3498db',
      RESCUE: '#f39c12',
      DISASTER_MANAGEMENT: '#9b59b6',
      COMMUNITY_RESPONDER: '#16a085',
      FLOOD: '#2980b9',
      EARTHQUAKE: '#8b4513'
    }
    return colors[type] || '#95a5a6'
  }

  return (
    <div className="space-y-4">
      {/* Header and Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">Citizen Media Reviews</h2>
          <div className="flex gap-2">
            {['PENDING', 'APPROVED', 'REJECTED'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="text-center py-8 text-slate-500">Loading...</div>}

        {!loading && mediaList.length === 0 && (
          <div className="text-center py-8 text-slate-500">No media submissions found</div>
        )}

        {!loading && mediaList.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-700">User</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-700">Type</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-700">Media</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-700">Description</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-700">Location</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-700">Submitted</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mediaList.map(media => (
                  <tr key={media.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">{media.User?.name || 'Unknown'}</div>
                      <div className="text-xs text-slate-500">{media.User?.phone || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block px-2 py-1 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: getEmergencyTypeColor(media.emergencyType) }}
                      >
                        {(media.emergencyType || 'UNKNOWN').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {media.mediaType === 'video' ? '🎥' : '📷'} {media.mediaType}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-700 max-w-xs truncate">{media.caption || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {media.locationLat && media.locationLng ? (
                        <div>
                          {media.locationLat.toFixed(4)}, {media.locationLng.toFixed(4)}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(media.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedMedia(media)
                            setVerifyModalOpen(true)
                          }}
                          disabled={processingId === media.id}
                          className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
                        >
                          {processingId === media.id ? '...' : 'Review'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {verifyModalOpen && selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setVerifyModalOpen(false); setRejectReason('') }} />
          <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Review Media Submission</h3>
              <button
                onClick={() => { setVerifyModalOpen(false); setRejectReason('') }}
                className="text-slate-500 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Media Preview */}
            <div className="mb-6">
              <div className="aspect-video bg-black rounded-lg overflow-hidden mb-3">
                {selectedMedia.mediaType === 'video' ? (
                  <video src={selectedMedia.mediaUrl} controls className="w-full h-full object-cover" />
                ) : (
                  <img src={selectedMedia.mediaUrl} alt="submission" className="w-full h-full object-cover" />
                )}
              </div>
            </div>

            {/* Details */}
            <div className="bg-slate-50 rounded-lg p-4 mb-6 space-y-3">
              <div>
                <div className="text-xs font-semibold text-slate-600 uppercase">User</div>
                <div className="text-sm font-medium text-slate-900">{selectedMedia.User?.name}</div>
                <div className="text-xs text-slate-500">{selectedMedia.User?.phone} • {selectedMedia.User?.barangay}</div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600 uppercase">Emergency Type</div>
                <span
                  className="inline-block px-2 py-1 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: getEmergencyTypeColor(selectedMedia.emergencyType) }}
                >
                  {(selectedMedia.emergencyType || 'UNKNOWN').replace(/_/g, ' ')}
                </span>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600 uppercase">Location</div>
                <div className="text-sm text-slate-700">
                  {selectedMedia.locationLat && selectedMedia.locationLng ? (
                    <>
                      Lat: {selectedMedia.locationLat.toFixed(6)}, Lng: {selectedMedia.locationLng.toFixed(6)}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${selectedMedia.locationLat},${selectedMedia.locationLng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 text-blue-600 underline"
                      >
                        View on Map
                      </a>
                    </>
                  ) : (
                    'No location provided'
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600 uppercase">Description</div>
                <div className="text-sm text-slate-700">{selectedMedia.caption}</div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600 uppercase">Submitted</div>
                <div className="text-sm text-slate-700">{new Date(selectedMedia.createdAt).toLocaleString()}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              {/* Verify Button */}
              <button
                onClick={() => handleVerify(selectedMedia.id)}
                disabled={processingId === selectedMedia.id}
                className="w-full px-4 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingId === selectedMedia.id ? 'Processing...' : '✓ Verify & Create Emergency'}
              </button>

              {/* Reject Section */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Rejection Reason (optional)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Why are you rejecting this submission?"
                  maxLength={300}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  rows={3}
                />
                <div className="text-xs text-slate-500 mt-1">{rejectReason.length}/300</div>

                <button
                  onClick={() => handleReject(selectedMedia.id)}
                  disabled={processingId === selectedMedia.id}
                  className="w-full mt-3 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingId === selectedMedia.id ? 'Processing...' : '✕ Reject'}
                </button>
              </div>

              {/* Cancel Button */}
              <button
                onClick={() => { setVerifyModalOpen(false); setRejectReason('') }}
                className="w-full px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-medium hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
