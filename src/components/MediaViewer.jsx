import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { API_BASE } from '../services/config'
import { confirmAction } from '../services/confirm'
import { showToast } from '../services/toast'

// Helper to build full media URL
const getMediaUrl = (mediaUrl) => {
  if (!mediaUrl) return ''
  if (mediaUrl.startsWith('http')) return mediaUrl
  // Hardcode the backend base URL for media serving
  const backendBase = 'https://sagipero-backend-production.up.railway.app'
  const fullUrl = `${backendBase}${mediaUrl}`
  console.log('📸 Media URL:', { mediaUrl, fullUrl })
  return fullUrl
}

export default function MediaViewer() {
  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedMedia, setSelectedMedia] = useState(null)
  const [reviewingId, setReviewingId] = useState(null)
  const [reviewStatus, setReviewStatus] = useState('APPROVED')
  const [reviewNotes, setReviewNotes] = useState('')

  useEffect(() => {
    fetchMediaAndStats()
  }, [selectedStatus])

  const fetchMediaAndStats = async () => {
    setLoading(true)
    try {
      // Fetch stats
      const statsRes = await api.get('/media/admin/stats')
      setStats(statsRes.data)

      // Fetch media
      const query = selectedStatus !== 'all' ? `?status=${selectedStatus.toUpperCase()}` : ''
      const mediaRes = await api.get(`/media/admin/all${query}`)
      setMedia(Array.isArray(mediaRes.data) ? mediaRes.data : [])
    } catch (err) {
      console.error('Failed to fetch media', err)
      showToast('Failed to load media submissions', 'error')
    } finally {
      setLoading(false)
    }
  }

  const updateMediaStatus = async (id, status, notes) => {
    try {
      await api.patch(`/media/admin/${id}/status`, { status, notes })
      showToast(`Media marked as ${status}`, 'success')
      setReviewingId(null)
      setReviewNotes('')
      fetchMediaAndStats()
    } catch (err) {
      console.error('Failed to update media status', err)
      showToast('Failed to update media status', 'error')
    }
  }

  const deleteMedia = async (id) => {
    const confirmed = await confirmAction('Delete this submission permanently?')
    if (!confirmed) return

    try {
      await api.delete(`/media/${id}`)
      showToast('Submission deleted', 'success')
      fetchMediaAndStats()
    } catch (err) {
      console.error('Failed to delete media', err)
      showToast('Failed to delete submission', 'error')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED':
        return '#4CAF50'
      case 'REJECTED':
        return '#F44336'
      case 'PENDING':
      default:
        return '#FFC107'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return '✓'
      case 'REJECTED':
        return '✕'
      case 'PENDING':
      default:
        return '⏱'
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Citizen Media Submissions</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'bg-blue-500' },
          { label: 'Pending', value: stats.pending, color: 'bg-yellow-500' },
          { label: 'Approved', value: stats.approved, color: 'bg-green-500' },
          { label: 'Rejected', value: stats.rejected, color: 'bg-red-500' }
        ].map((stat) => (
          <div key={stat.label} className={`${stat.color} text-white rounded-lg p-4 shadow`}>
            <p className="text-sm opacity-90">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {['all', 'PENDING', 'APPROVED', 'REJECTED'].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedStatus === status
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {status === 'all' ? 'All' : status}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-2">Loading submissions...</p>
        </div>
      )}

      {/* Media Grid */}
      {!loading && media.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No submissions found</p>
        </div>
      )}

      {!loading && media.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {media.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
              {/* Media Preview */}
              <div
                className="relative w-full h-48 bg-gray-200 cursor-pointer overflow-hidden group"
                onClick={() => setSelectedMedia(item)}
              >
                {item.mediaType === 'photo' ? (
                  <img
                    src={getMediaUrl(item.mediaUrl)}
                    alt={item.caption || 'Submission'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <span className="text-white text-4xl">▶</span>
                  </div>
                )}

                {/* Status Badge */}
                <div
                  className="absolute top-2 right-2 px-3 py-1 rounded-full text-white text-sm font-semibold flex items-center gap-1"
                  style={{ backgroundColor: getStatusColor(item.status) }}
                >
                  <span>{getStatusIcon(item.status)}</span>
                  {item.status}
                </div>

                {item.mediaType === 'video' && (
                  <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-semibold">
                    VIDEO
                  </div>
                )}
              </div>

              {/* Media Info */}
              <div className="p-4">
                {/* User Info */}
                {item.User && (
                  <div className="mb-3 pb-3 border-b">
                    <p className="font-semibold text-gray-800">{item.User.name}</p>
                    <p className="text-sm text-gray-600">{item.User.email}</p>
                    {item.User.barangay && (
                      <p className="text-xs text-gray-500">📍 {item.User.barangay}</p>
                    )}
                  </div>
                )}

                {/* Caption */}
                {item.caption && (
                  <p className="text-sm text-gray-700 mb-2 line-clamp-2">{item.caption}</p>
                )}

                {/* Timestamp */}
                <p className="text-xs text-gray-500 mb-2">
                  {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString()}
                </p>

                {/* Admin Notes */}
                {item.notes && (
                  <div className="bg-gray-50 border-l-4 border-blue-500 p-2 mb-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Admin Notes:</p>
                    <p className="text-xs text-gray-600">{item.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setReviewingId(item.id)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                  >
                    Review
                  </button>
                  <button
                    onClick={() => deleteMedia(item.id)}
                    className="px-3 py-2 bg-red-100 text-red-600 rounded text-sm font-medium hover:bg-red-200"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Review Submission</h2>

            {/* Status Selection */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Optional)</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add review notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setReviewingId(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  updateMediaStatus(reviewingId, reviewStatus, reviewNotes)
                }
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-40"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute -top-10 right-0 text-white text-2xl hover:opacity-70 transition-opacity"
            >
              ✕
            </button>

            {selectedMedia.mediaType === 'photo' ? (
              <img
                src={getMediaUrl(selectedMedia.mediaUrl)}
                alt={selectedMedia.caption || 'Submission'}
                className="w-full rounded-lg"
              />
            ) : (
              <video
                src={getMediaUrl(selectedMedia.mediaUrl)}
                controls
                className="w-full rounded-lg"
              />
            )}

            {selectedMedia.caption && (
              <p className="text-white text-center mt-4 text-sm">{selectedMedia.caption}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
