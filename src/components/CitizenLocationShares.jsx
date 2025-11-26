import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { notify } from '../services/toast'
import MapView from './MapView'

export default function CitizenLocationShares() {
  const [shares, setShares] = useState([])
  const [filteredShares, setFilteredShares] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // all | recent | old
  const [selectedShare, setSelectedShare] = useState(null)
  const [showMap, setShowMap] = useState(false)

  useEffect(() => {
    fetchLocationShares()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [shares, searchQuery, filterStatus])

  const fetchLocationShares = async () => {
    setLoading(true)
    try {
      // Get all users with their location data
      const res = await api.get('/users?role=RESIDENT')
      const residents = Array.isArray(res.data) ? res.data : res.data.data || []

      // Filter residents who have shared location (those with Location relation)
      const sharesData = residents
        .filter(r => r.Location && r.Location.latitude && r.Location.longitude)
        .map(r => ({
          id: r.id,
          userId: r.id,
          userName: r.name || 'Unknown',
          userEmail: r.email,
          latitude: r.Location.latitude,
          longitude: r.Location.longitude,
          updatedAt: r.Location.updatedAt,
          address: r.address || 'Not specified',
          barangay: r.barangay || 'Not specified',
          phone: r.phone || 'Not provided',
        }))
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

      setShares(sharesData)
      notify({ type: 'success', title: 'Success', message: `Loaded ${sharesData.length} location shares` })
    } catch (err) {
      console.error('Failed to fetch location shares', err)
      notify({ type: 'error', title: 'Error', message: 'Failed to load location shares' })
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = shares

    // Filter by status
    if (filterStatus === 'recent') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      filtered = filtered.filter(s => new Date(s.updatedAt) > oneHourAgo)
    } else if (filterStatus === 'old') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      filtered = filtered.filter(s => new Date(s.updatedAt) <= oneHourAgo)
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(s =>
        s.userName?.toLowerCase().includes(query) ||
        s.userEmail?.toLowerCase().includes(query) ||
        s.barangay?.toLowerCase().includes(query) ||
        s.address?.toLowerCase().includes(query)
      )
    }

    setFilteredShares(filtered)
  }

  const getTimeAgo = (date) => {
    const now = new Date()
    const past = new Date(date)
    const diffMs = now - past
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  const openMap = (share) => {
    setSelectedShare(share)
    setShowMap(true)
  }

  const getMapUrl = (lat, lon) => {
    return `https://www.google.com/maps?q=${lat},${lon}`
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white text-lg font-bold">L</div>
          <div>
            <h3 className="text-lg font-semibold">Citizen Location Shares</h3>
            <div className="text-xs text-slate-400">Track location shares from concerned citizens</div>
          </div>
        </div>
        <div className="text-sm text-slate-500">{filteredShares.length} of {shares.length} shares</div>
      </div>

      {/* Search and Filter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg mb-4">
        <input
          type="text"
          placeholder="Search by name, email, barangay..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="col-span-2 p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Shares</option>
          <option value="recent">Recent (1 hour)</option>
          <option value="old">Older Shares</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-lg p-4 shadow">
          <p className="text-xs uppercase font-semibold opacity-90">Total Shares</p>
          <p className="text-2xl font-bold">{shares.length}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 shadow">
          <p className="text-xs uppercase font-semibold opacity-90">Recent (1h)</p>
          <p className="text-2xl font-bold">
            {shares.filter(s => new Date(s.updatedAt) > new Date(Date.now() - 3600000)).length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-lg p-4 shadow">
          <p className="text-xs uppercase font-semibold opacity-90">Unique Users</p>
          <p className="text-2xl font-bold">{new Set(shares.map(s => s.userId)).size}</p>
        </div>
      </div>

      {/* Table */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <p className="text-gray-600 mt-2">Loading location shares...</p>
        </div>
      )}

      {!loading && filteredShares.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No location shares found</p>
        </div>
      )}

      {!loading && filteredShares.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Citizen</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Location</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Barangay</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Last Share</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredShares.map((share) => (
                <tr key={share.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-gray-900">{share.userName}</p>
                      <p className="text-xs text-gray-500">{share.userEmail}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs">
                      <p>{share.latitude.toFixed(4)}</p>
                      <p>{share.longitude.toFixed(4)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded">
                      {share.barangay}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      <p className="text-gray-900 font-medium">{getTimeAgo(share.updatedAt)}</p>
                      <p className="text-gray-500">{new Date(share.updatedAt).toLocaleString()}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openMap(share)}
                        className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium hover:bg-emerald-200"
                      >
                        View Map
                      </button>
                      <a
                        href={getMapUrl(share.latitude, share.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200"
                      >
                        Google Maps
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Map Modal */}
      {showMap && selectedShare && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedShare.userName}'s Location
              </h2>
              <button
                onClick={() => {
                  setShowMap(false)
                  setSelectedShare(null)
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Leaflet Map View */}
            <div className="rounded-lg overflow-hidden mb-4 bg-gray-100">
              <MapView 
                emergencies={selectedShare ? [{
                  id: selectedShare.id,
                  type: 'Location Share',
                  description: `Shared by ${selectedShare.userName}`,
                  priority: 'medium',
                  location: { 
                    lat: selectedShare.latitude, 
                    lng: selectedShare.longitude 
                  }
                }] : []}
                evacCenters={[]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-slate-50 p-4 rounded">
                <p className="text-xs text-gray-500 mb-2">Name</p>
                <p className="text-sm font-medium text-gray-900">{selectedShare.userName}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded">
                <p className="text-xs text-gray-500 mb-2">Email</p>
                <p className="text-sm font-medium text-gray-900">{selectedShare.userEmail}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded">
                <p className="text-xs text-gray-500 mb-2">Barangay</p>
                <p className="text-sm font-medium text-gray-900">{selectedShare.barangay}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded">
                <p className="text-xs text-gray-500 mb-2">Last Share</p>
                <p className="text-sm font-medium text-gray-900">{new Date(selectedShare.updatedAt).toLocaleString()}</p>
              </div>
              <div className="col-span-2 bg-slate-50 p-4 rounded">
                <p className="text-xs text-gray-500 mb-2">Coordinates</p>
                <p className="text-sm font-mono text-gray-900">
                  {selectedShare.latitude.toFixed(6)}, {selectedShare.longitude.toFixed(6)}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={getMapUrl(selectedShare.latitude, selectedShare.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Open in Google Maps
              </a>
              <button
                onClick={() => {
                  setShowMap(false)
                  setSelectedShare(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
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
