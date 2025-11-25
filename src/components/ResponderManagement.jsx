import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { showConfirm } from '../services/confirm'
import { notify } from '../services/toast'

const RESPONDER_TYPES = [
  'FIRE',
  'MEDICAL',
  'POLICE',
  'RESCUE',
  'DISASTER_MANAGEMENT',
  'COMMUNITY_RESPONDER'
]

export default function ResponderManagement() {
  const [responders, setResponders] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({})
  const [selectedResponder, setSelectedResponder] = useState(null)
  const [editingTypes, setEditingTypes] = useState({})
  const [emergencies, setEmergencies] = useState([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedEmergency, setSelectedEmergency] = useState(null)

  useEffect(() => {
    fetchResponders()
    fetchEmergencies()
  }, [])

  const fetchResponders = async () => {
    setLoading(true)
    try {
      const res = await api.get('/users?role=RESPONDER')
      const respondersList = Array.isArray(res.data) ? res.data : res.data.data || []
      setResponders(respondersList)
      
      // Calculate stats
      const typeStats = {}
      RESPONDER_TYPES.forEach(type => {
        typeStats[type] = respondersList.filter(r => 
          Array.isArray(r.responderTypes) && r.responderTypes.includes(type)
        ).length
      })
      setStats(typeStats)
    } catch (err) {
      console.error('Failed to fetch responders', err)
      notify({ type: 'error', title: 'Error', message: 'Failed to load responders' })
    } finally {
      setLoading(false)
    }
  }

  const fetchEmergencies = async () => {
    try {
      const res = await api.get('/emergencies')
      const emergencyList = Array.isArray(res.data) ? res.data : res.data.data || []
      setEmergencies(emergencyList.filter(e => e.status !== 'RESOLVED'))
    } catch (err) {
      console.error('Failed to fetch emergencies', err)
    }
  }

  const updateResponderTypes = async (responderId, types) => {
    try {
      await api.put(`/users/${responderId}`, { responderTypes: types })
      notify({ type: 'success', title: 'Success', message: 'Responder types updated' })
      fetchResponders()
      setEditingTypes({})
    } catch (err) {
      console.error('Failed to update responder types', err)
      notify({ type: 'error', title: 'Error', message: 'Failed to update responder types' })
    }
  }

  const toggleResponderType = (responderId, type) => {
    const current = editingTypes[responderId] || responders.find(r => r.id === responderId)?.responderTypes || []
    const updated = current.includes(type)
      ? current.filter(t => t !== type)
      : [...current, type]
    setEditingTypes({ ...editingTypes, [responderId]: updated })
  }

  const assignResponderToEmergency = async (responderId, emergencyId) => {
    try {
      await api.post(`/emergencies/${emergencyId}/assign`, { responderId })
      notify({ type: 'success', title: 'Success', message: 'Responder assigned to emergency' })
      setShowAssignModal(false)
      fetchResponders()
      fetchEmergencies()
    } catch (err) {
      console.error('Failed to assign responder', err)
      notify({ type: 'error', title: 'Error', message: 'Failed to assign responder' })
    }
  }

  const toggleResponderStatus = async (responderId, currentStatus) => {
    try {
      await api.post('/users/update-responder-status', {
        userId: responderId,
        status: currentStatus === 'AVAILABLE' ? 'ON_DUTY' : 'AVAILABLE'
      })
      notify({ type: 'success', title: 'Success', message: 'Responder status updated' })
      fetchResponders()
    } catch (err) {
      console.error('Failed to update responder status', err)
      notify({ type: 'error', title: 'Error', message: 'Failed to update responder status' })
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Responder Management</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {RESPONDER_TYPES.map((type) => (
          <div key={type} className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 shadow">
            <p className="text-xs uppercase font-semibold opacity-90">{type.replace(/_/g, ' ')}</p>
            <p className="text-2xl font-bold">{stats[type] || 0}</p>
          </div>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-2">Loading responders...</p>
        </div>
      )}

      {/* Responders Table */}
      {!loading && responders.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No responders found</p>
        </div>
      )}

      {!loading && responders.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Responder Types</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {responders.map((responder) => (
                  <tr key={responder.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900">{responder.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{responder.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(responder.responderTypes || []).map((type) => (
                          <span key={type} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            {type}
                          </span>
                        ))}
                        {(!responder.responderTypes || responder.responderTypes.length === 0) && (
                          <span className="text-xs text-gray-500">None assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        responder.responderStatus === 'AVAILABLE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {responder.responderStatus || 'AVAILABLE'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedResponder(responder.id === selectedResponder ? null : responder.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                        >
                          {selectedResponder === responder.id ? 'Close' : 'Edit'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedResponder(responder)
                            setShowAssignModal(true)
                          }}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => toggleResponderStatus(responder.id, responder.responderStatus)}
                          className="px-3 py-1 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700"
                        >
                          {responder.responderStatus === 'AVAILABLE' ? 'Set Duty' : 'Set Available'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Edit Types Section */}
          {selectedResponder && (
            <div className="bg-gray-50 border-t p-6">
              {responders.find(r => r.id === selectedResponder) && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">
                    Edit Responder Types: {responders.find(r => r.id === selectedResponder)?.name}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {RESPONDER_TYPES.map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(editingTypes[selectedResponder] || responders.find(r => r.id === selectedResponder)?.responderTypes || []).includes(type)}
                          onChange={() => toggleResponderType(selectedResponder, type)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-gray-700">{type.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={() => updateResponderTypes(selectedResponder, editingTypes[selectedResponder] || [])}
                    className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedResponder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Assign {selectedResponder.name} to Emergency
            </h2>

            {emergencies.length === 0 ? (
              <p className="text-gray-600 mb-4">No active emergencies available</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                {emergencies.map((emergency) => (
                  <div
                    key={emergency.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => assignResponderToEmergency(selectedResponder.id, emergency.id)}
                  >
                    <div className="font-semibold text-gray-800">{emergency.type}</div>
                    <div className="text-sm text-gray-600">{emergency.description}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Status: {emergency.status} | Priority: {emergency.priority}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                setShowAssignModal(false)
                setSelectedResponder(null)
              }}
              className="w-full px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
