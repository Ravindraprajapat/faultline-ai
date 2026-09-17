import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { serverUrl } from '../App'
import Navbar from '../components/Navbar'
import { Filter, RefreshCw, CheckCircle, Clock, AlertCircle, MapPin, ChevronDown, Navigation, X, Loader2 } from 'lucide-react'
import { useSelector } from 'react-redux'

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
  RESOLVED: 'bg-green-100 text-green-700 border-green-200'
}

const STATUS_ICONS = {
  PENDING: <AlertCircle size={13} />,
  IN_PROGRESS: <Clock size={13} />,
  RESOLVED: <CheckCircle size={13} />
}

const PRIORITY_COLORS = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-orange-100 text-orange-700',
  LOW: 'bg-gray-100 text-gray-600'
}

const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const BarChart = ({ pending, inProgress, resolved }) => {
  const total = pending + inProgress + resolved || 1
  const bars = [
    { label: 'Pending', value: pending, color: 'bg-yellow-400', text: 'text-yellow-700' },
    { label: 'In Progress', value: inProgress, color: 'bg-blue-400', text: 'text-blue-700' },
    { label: 'Resolved', value: resolved, color: 'bg-green-400', text: 'text-green-700' }
  ]

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
      <h3 className="font-semibold text-slate-800 mb-5">Issues Overview</h3>
      <div className="flex items-end gap-8 h-40 px-4">
        {bars.map(b => (
          <div key={b.label} className="flex flex-col items-center gap-2 flex-1">
            <span className={`text-sm font-bold ${b.text}`}>{b.value}</span>
            <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max((b.value / total) * 100, b.value > 0 ? 8 : 0)}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className={`w-full rounded-t-lg ${b.color}`}
                style={{ minHeight: b.value > 0 ? '8px' : '0' }}
              />
            </div>
            <span className="text-xs text-slate-500 font-medium text-center">{b.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex rounded-full overflow-hidden h-3">
        {bars.map(b => (
          b.value > 0 && (
            <div
              key={b.label}
              className={`${b.color} transition-all duration-700`}
              style={{ width: `${(b.value / total) * 100}%` }}
              title={`${b.label}: ${b.value}`}
            />
          )
        ))}
      </div>
      <div className="flex gap-4 mt-2 justify-center">
        {bars.map(b => (
          <span key={b.label} className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className={`w-2.5 h-2.5 rounded-sm ${b.color}`} />
            {b.label} ({Math.round((b.value / total) * 100)}%)
          </span>
        ))}
      </div>
    </div>
  )
}

const OfficerIssues = () => {
  const { userData } = useSelector(state => state.user)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [ward, setWard] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  // Resolution Live Location Modal State
  const [resolveModalReport, setResolveModalReport] = useState(null)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [capturedLocation, setCapturedLocation] = useState(null)
  const [locationError, setLocationError] = useState('')
  const [submittingResolve, setSubmittingResolve] = useState(false)

  const fetchReports = async () => {
    setLoading(true)
    setRefreshing(true)
    try {
      const { data } = await axios.get(`${serverUrl}/api/admin/officer/reports`, {
        withCredentials: true
      })
      setReports(data.reports)
      setWard(data.ward || userData?.assignedWard || '')
      setLastUpdated(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchReports() }, [])

  const handleOpenResolveModal = (report) => {
    setResolveModalReport(report)
    setCapturedLocation(null)
    setLocationError('')
    setGettingLocation(false)
    setSubmittingResolve(false)
  }

  const handleCloseResolveModal = () => {
    setResolveModalReport(null)
    setCapturedLocation(null)
    setLocationError('')
    setGettingLocation(false)
    setSubmittingResolve(false)
  }

  const handleGetLiveLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      return
    }

    setGettingLocation(true)
    setLocationError('')
    setCapturedLocation(null)

    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const compLat = resolveModalReport?.location?.latitude
        const compLng = resolveModalReport?.location?.longitude

        if (typeof compLat !== 'number' || typeof compLng !== 'number') {
          setLocationError('Complaint location coordinates are invalid or missing.')
          setGettingLocation(false)
          return
        }

        const distance = calculateDistanceMeters(lat, lng, compLat, compLng)

        if (distance > 50) {
          setLocationError('Cannot resolve this complaint. You must be within 50 meters of the reported location.')
        } else {
          setCapturedLocation({
            latitude: lat,
            longitude: lng,
            distance
          })
        }
        setGettingLocation(false)
      },
      err => {
        setGettingLocation(false)
        if (err.code === 1) {
          setLocationError('Location permission is required to resolve this complaint.')
        } else {
          setLocationError('Unable to get your live location. Please try again.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const handleConfirmResolve = async () => {
    if (!capturedLocation || !resolveModalReport) return
    if (capturedLocation.distance > 50) {
      setLocationError('Cannot resolve this complaint. You must be within 50 meters of the reported location.')
      return
    }

    setSubmittingResolve(true)
    setLocationError('')

    try {
      const { data } = await axios.patch(
        `${serverUrl}/api/admin/officer/reports/${resolveModalReport._id}/status`,
        {
          status: 'RESOLVED',
          latitude: capturedLocation.latitude,
          longitude: capturedLocation.longitude
        },
        { withCredentials: true }
      )

      setReports(prev =>
        prev.map(r => (r._id === resolveModalReport._id ? data.report : r))
      )
      handleCloseResolveModal()
    } catch (e) {
      console.error(e)
      const msg =
        e?.response?.data?.message || 'Failed to resolve complaint.'
      setLocationError(msg)
    } finally {
      setSubmittingResolve(false)
    }
  }

  const handleStatusChange = async (report, newStatus) => {
    if (newStatus === 'RESOLVED') {
      handleOpenResolveModal(report)
      return
    }

    setUpdatingId(report._id)
    try {
      const { data } = await axios.patch(
        `${serverUrl}/api/admin/officer/reports/${report._id}/status`,
        { status: newStatus },
        { withCredentials: true }
      )
      setReports(prev => prev.map(r => (r._id === report._id ? data.report : r)))
    } catch (e) {
      console.error(e)
      const msg =
        e?.response?.data?.message || 'Failed to update complaint status.'
      alert(msg)
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = useMemo(() => {
    if (statusFilter === 'ALL') return reports
    return reports.filter(r => r.status === statusFilter)
  }, [reports, statusFilter])

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'PENDING').length,
    inProgress: reports.filter(r => r.status === 'IN_PROGRESS').length,
    resolved: reports.filter(r => r.status === 'RESOLVED').length
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      <Navbar />

      <div className="pt-[120px] pb-16 px-6 md:px-10 max-w-[1200px] mx-auto">

        {/* Header with top refresh button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-start justify-between"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-slate-900">Ward Complaints</h1>
              {ward && (
                <span className="bg-sky-100 text-sky-700 text-sm font-semibold px-3 py-1 rounded-full border border-sky-200">
                  <MapPin size={13} className="inline mr-1" />
                  {ward}
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm">
              All complaints reported in your assigned ward
              {lastUpdated && (
                <span className="ml-2 text-slate-400">
                  · Last updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>

          {/* TOP REFRESH BUTTON */}
          <button
            onClick={fetchReports}
            disabled={loading || refreshing}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer"
          >
            <RefreshCw size={15} className={(loading || refreshing) ? 'animate-spin' : ''} />
            Refresh
          </button>
        </motion.div>

        {/* Stats cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          {[
            { label: 'Total', value: stats.total, color: 'text-slate-900', bg: 'bg-white' },
            { label: 'Pending', value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Resolved', value: stats.resolved, color: 'text-green-600', bg: 'bg-green-50' }
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl border border-slate-100 shadow-sm p-5`}>
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <BarChart
            pending={stats.pending}
            inProgress={stats.inProgress}
            resolved={stats.resolved}
          />
        </motion.div>

        {/* Filter bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-wrap items-center gap-4"
        >
          <Filter size={15} className="text-sky-500" />
          <span className="text-sm font-medium text-slate-600">Filter by Status:</span>
          <div className="flex gap-2">
            {['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  statusFilter === s
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s === 'ALL' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-slate-400">
            {filtered.length} of {reports.length} complaints
          </span>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <RefreshCw size={20} className="animate-spin mr-2" />
              Loading complaints...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-400">No complaints found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Issue Type</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Reported By</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Address</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Priority</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Update Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Assigned Officer</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Image</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r._id} className="border-b border-slate-50 hover:bg-slate-50 transition">
                      <td className="px-4 py-4 text-slate-400">{i + 1}</td>

                      <td className="px-4 py-4 font-medium text-slate-800">
                        {r.aiAnalysis?.detectedType?.replace('_', ' ') || 'N/A'}
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-800">{r.reportedBy?.name || 'N/A'}</div>
                        <div className="text-xs text-slate-400">{r.reportedBy?.email}</div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="text-xs text-slate-500 max-w-[180px] truncate">
                          {r.location?.address ||
                            `${r.location?.latitude?.toFixed(4)}, ${r.location?.longitude?.toFixed(4)}`}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${PRIORITY_COLORS[r.priorityLevel] || 'bg-gray-100 text-gray-600'}`}>
                          {r.priorityLevel || 'N/A'}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[r.status]}`}>
                          {STATUS_ICONS[r.status]}
                          {r.status?.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="relative">
                          <select
                            value={r.status}
                            disabled={updatingId === r._id}
                            onChange={e => handleStatusChange(r, e.target.value)}
                            className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-400 transition disabled:opacity-50 ${STATUS_COLORS[r.status]}`}
                          >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                          </select>
                          <ChevronDown size={12} className="absolute right-2 top-2.5 pointer-events-none opacity-60" />
                        </div>
                      </td>

                      <td className="px-4 py-4 text-xs text-slate-600">
                        {r.assignedTo?.name || <span className="text-slate-300">Unassigned</span>}
                      </td>

                      <td className="px-4 py-4 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>

                      <td className="px-4 py-4">
                        {r.imageUrl ? (
                          <a href={r.imageUrl} target="_blank" rel="noreferrer">
                            <img
                              src={r.imageUrl}
                              alt="issue"
                              className="w-12 h-12 object-cover rounded-lg border border-slate-200 hover:scale-110 transition"
                            />
                          </a>
                        ) : (
                          <span className="text-slate-300 text-xs">No image</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* ===== RESOLUTION LIVE LOCATION MODAL ===== */}
      <AnimatePresence>
        {resolveModalReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-sky-100 relative"
            >
              <button
                onClick={handleCloseResolveModal}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 mb-3 text-sky-600 font-semibold text-lg">
                <Navigation size={20} />
                <span>Resolve Complaint</span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3.5 mb-4 text-xs text-slate-600 space-y-1 border border-slate-100">
                <div>
                  <span className="font-semibold text-slate-700">Issue: </span>
                  {resolveModalReport.aiAnalysis?.detectedType?.replace('_', ' ') || 'Civic Complaint'}
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Location: </span>
                  {resolveModalReport.location?.address || `${resolveModalReport.location?.latitude?.toFixed(4)}, ${resolveModalReport.location?.longitude?.toFixed(4)}`}
                </div>
              </div>

              {/* Status & Error Alerts */}
              {!capturedLocation && !locationError && (
                <div className="bg-sky-50 border border-sky-200 text-sky-700 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>Live location is required to resolve this complaint.</span>
                </div>
              )}

              {capturedLocation && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
                  <CheckCircle size={16} className="shrink-0" />
                  <span>
                    Live location captured ({capturedLocation.distance.toFixed(1)}m from complaint).
                  </span>
                </div>
              )}

              {locationError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl mb-4 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{locationError}</span>
                </div>
              )}

              {/* Step 1: Get Live Location Button */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGetLiveLocation}
                  disabled={gettingLocation || submittingResolve}
                  className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-xs transition cursor-pointer shadow-sm"
                >
                  {gettingLocation ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Getting live location...</span>
                    </>
                  ) : (
                    <>
                      <Navigation size={14} />
                      <span>{capturedLocation ? 'Re-capture Live Location' : 'GET LIVE LOCATION'}</span>
                    </>
                  )}
                </button>

                {/* Step 2: Final Resolve Button */}
                <button
                  type="button"
                  onClick={handleConfirmResolve}
                  disabled={!capturedLocation || capturedLocation.distance > 50 || submittingResolve}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3 rounded-xl text-xs transition cursor-pointer shadow-md"
                >
                  {submittingResolve ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Resolving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      <span>RESOLVE COMPLAINT</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default OfficerIssues
