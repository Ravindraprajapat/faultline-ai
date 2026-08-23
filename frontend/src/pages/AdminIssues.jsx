import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { serverUrl } from '../App'
import Navbar from '../components/Navbar'
import {
  Filter, RefreshCw, CheckCircle, Clock, AlertCircle,
  ChevronDown, UserCheck, Trash2, MapPin, X
} from 'lucide-react'

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

const AdminIssues = () => {
  const [reports, setReports] = useState([])
  const [wards, setWards] = useState([])          // ward summary
  const [officers, setOfficers] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [assigningWard, setAssigningWard] = useState(null)
  const [filters, setFilters] = useState({ status: 'ALL', issue: 'ALL', ward: 'ALL' })
  const [cleaning, setCleaning] = useState(false)
  const [cleanMsg, setCleanMsg] = useState('')

  // filtersActive = any filter is set → show complaints table
  const filtersActive = filters.status !== 'ALL' || filters.issue !== 'ALL' || filters.ward !== 'ALL'

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [reportsRes, wardsRes, officersRes] = await Promise.all([
        axios.get(`${serverUrl}/api/admin/reports`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/admin/ward-summary`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/admin/officers`, { withCredentials: true })
      ])
      setReports(reportsRes.data.reports)
      setWards(wardsRes.data.wards)
      setOfficers(officersRes.data.officers)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Filtered complaints
  const filtered = reports.filter(r => {
    if (filters.status !== 'ALL' && r.status !== filters.status) return false
    if (filters.issue !== 'ALL' && r.aiAnalysis?.detectedType !== filters.issue) return false
    if (filters.ward !== 'ALL' && r.location?.ward !== filters.ward) return false
    return true
  })

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id)
    try {
      const { data } = await axios.patch(
        `${serverUrl}/api/admin/reports/${id}/status`,
        { status: newStatus },
        { withCredentials: true }
      )
      setReports(prev => prev.map(r => r._id === id ? data.report : r))
    } catch (err) { console.error(err) }
    finally { setUpdatingId(null) }
  }

  const handleAssignWardOfficer = async (ward, officerId) => {
    setAssigningWard(ward)
    try {
      await axios.post(
        `${serverUrl}/api/admin/ward-officer`,
        { ward, officerId: officerId || null },
        { withCredentials: true }
      )
      // Refresh ward summary to reflect new assignment
      const { data } = await axios.get(`${serverUrl}/api/admin/ward-summary`, { withCredentials: true })
      setWards(data.wards)
    } catch (err) { console.error(err) }
    finally { setAssigningWard(null) }
  }

  const handleCleanup = async () => {
    if (!window.confirm('Delete all reports without ward info? This cannot be undone.')) return
    setCleaning(true)
    try {
      const { data } = await axios.delete(`${serverUrl}/api/admin/reports/wardless`, { withCredentials: true })
      setCleanMsg(`Deleted ${data.deleted} wardless report(s).`)
      fetchAll()
    } catch { setCleanMsg('Cleanup failed.') }
    finally {
      setCleaning(false)
      setTimeout(() => setCleanMsg(''), 4000)
    }
  }

  const clearFilters = () => setFilters({ status: 'ALL', issue: 'ALL', ward: 'ALL' })

  const uniqueWards = [...new Set(reports.map(r => r.location?.ward).filter(Boolean))]
  const issueTypes = ['POTHOLE', 'ROAD_CRACK', 'GARBAGE', 'STREETLIGHT', 'WATER_LEAK', 'OTHER']

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'PENDING').length,
    inProgress: reports.filter(r => r.status === 'IN_PROGRESS').length,
    resolved: reports.filter(r => r.status === 'RESOLVED').length
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      <Navbar />

      <div className="pt-[120px] pb-16 px-6 md:px-10 max-w-[1400px] mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Issues Dashboard</h1>
            <p className="text-slate-500 mt-1">
              {filtersActive ? 'Filtered complaints view' : 'Ward overview & officer assignments'}
            </p>
          </div>
          <button onClick={fetchAll} disabled={loading}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </motion.div>

        {cleanMsg && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">
            {cleanMsg}
          </div>
        )}

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Issues', value: stats.total, color: 'text-slate-900', bg: 'bg-white' },
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

        {/* Filter bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-slate-600">
            <Filter size={16} className="text-sky-500" />
            <span className="font-medium text-sm">Filter complaints:</span>
          </div>

          {[
            { key: 'status', label: 'All Status', options: [['PENDING','Pending'],['IN_PROGRESS','In Progress'],['RESOLVED','Resolved']] },
            { key: 'issue', label: 'All Issue Types', options: issueTypes.map(t => [t, t.replace('_',' ')]) },
            { key: 'ward', label: 'All Wards', options: uniqueWards.map(w => [w, w]) }
          ].map(({ key, label, options }) => (
            <div className="relative" key={key}>
              <select value={filters[key]}
                onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
                className="appearance-none border border-slate-200 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-sky-400 focus:outline-none bg-white cursor-pointer">
                <option value="ALL">{label}</option>
                {options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-3 text-slate-400 pointer-events-none" />
            </div>
          ))}

          {filtersActive && (
            <button onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 px-3 py-2 rounded-lg cursor-pointer">
              <X size={13} /> Clear filters
            </button>
          )}

          <div className="ml-auto flex items-center gap-3">
            <button onClick={handleCleanup} disabled={cleaning}
              className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-medium cursor-pointer disabled:opacity-50">
              <Trash2 size={15} />
              {cleaning ? 'Cleaning...' : 'Delete Wardless'}
            </button>
          </div>
        </motion.div>

        {/* ===== DEFAULT VIEW: Ward Summary + Officer Assignment ===== */}
        <AnimatePresence mode="wait">
          {!filtersActive ? (
            <motion.div key="ward-view"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ delay: 0.2 }}>

              <div className="flex items-center gap-2 mb-4">
                <MapPin size={16} className="text-sky-500" />
                <h2 className="font-semibold text-slate-800">Ward Overview & Officer Assignments</h2>
                <span className="text-xs text-slate-400 ml-1">— one officer per ward</span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-400">
                  <RefreshCw size={20} className="animate-spin mr-2" /> Loading...
                </div>
              ) : wards.length === 0 ? (
                <div className="text-center py-20 text-slate-400">No ward data yet. Reports need ward info.</div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-5 py-3 font-semibold text-slate-600">Ward</th>
                        <th className="text-left px-5 py-3 font-semibold text-slate-600">Total</th>
                        <th className="text-left px-5 py-3 font-semibold text-slate-600">Pending</th>
                        <th className="text-left px-5 py-3 font-semibold text-slate-600">In Progress</th>
                        <th className="text-left px-5 py-3 font-semibold text-slate-600">Resolved</th>
                        <th className="text-left px-5 py-3 font-semibold text-slate-600">Assigned Officer</th>
                        <th className="text-left px-5 py-3 font-semibold text-slate-600">Change Officer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wards.map(w => (
                        <tr key={w.ward} className="border-b border-slate-50 hover:bg-slate-50 transition">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <MapPin size={13} className="text-sky-400" />
                              <span className="font-medium text-slate-800">{w.ward}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-slate-600 font-semibold">{w.total}</td>
                          <td className="px-5 py-4">
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700">
                              {w.pending}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                              {w.inProgress}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                              {w.resolved}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {w.officer ? (
                              <div>
                                <div className="font-medium text-slate-800 text-xs">{w.officer.name}</div>
                                <div className="text-[10px] text-slate-400">{w.officer.email}</div>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs">Unassigned</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="relative">
                              {(() => {
                                const matchingOfficers = officers.filter(o => {
                                  if (!o.assignedWard) return false
                                  const oWard = o.assignedWard.trim().toLowerCase()
                                  const wWard = w.ward.trim().toLowerCase()
                                  const oSub = oWard.includes(' - ') ? oWard.split(' - ').slice(1).join(' - ').trim() : oWard
                                  const wSub = wWard.includes(' - ') ? wWard.split(' - ').slice(1).join(' - ').trim() : wWard
                                  return oWard === wWard || oSub === wSub
                                })

                                return (
                                  <select
                                    value={w.officer?._id || ''}
                                    disabled={assigningWard === w.ward}
                                    onChange={e => handleAssignWardOfficer(w.ward, e.target.value)}
                                    className="appearance-none border border-slate-200 rounded-lg px-3 py-1.5 pr-7 text-xs focus:ring-2 focus:ring-sky-400 focus:outline-none bg-white cursor-pointer disabled:opacity-50 min-w-[160px]">
                                    <option value="">Unassigned</option>
                                    {matchingOfficers.length === 0 ? (
                                      <option value="" disabled>No officer assigned to this ward.</option>
                                    ) : (
                                      matchingOfficers.map(o => (
                                        <option key={o._id} value={o._id}>{o.name}</option>
                                      ))
                                    )}
                                  </select>
                                )
                              })()}
                              {assigningWard === w.ward
                                ? <RefreshCw size={12} className="absolute right-2 top-2.5 text-sky-400 animate-spin pointer-events-none" />
                                : <UserCheck size={12} className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
                              }
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="mt-3 text-xs text-slate-400">
                Use filters above to view complaints for a specific ward, status, or issue type.
              </p>
            </motion.div>

          ) : (
            /* ===== FILTERED VIEW: Complaints Table ===== */
            <motion.div key="complaints-view"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={{ delay: 0.1 }}>

              <div className="flex items-center gap-2 mb-4">
                <Filter size={16} className="text-sky-500" />
                <h2 className="font-semibold text-slate-800">Complaints</h2>
                <span className="text-xs text-slate-400">({filtered.length} results)</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-20 text-slate-400">
                    <RefreshCw size={20} className="animate-spin mr-2" /> Loading...
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-20 text-slate-400">No complaints match the selected filters</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">#</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Issue Type</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Reported By</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Ward / Address</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Priority</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Officer</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Date</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Image</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Update Status</th>
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
                              <div className="text-slate-700 font-medium text-xs">{r.location?.ward || 'Unknown'}</div>
                              <div className="text-xs text-slate-400 truncate max-w-[150px]">
                                {r.location?.address || `${r.location?.latitude?.toFixed(4)}, ${r.location?.longitude?.toFixed(4)}`}
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
                            <td className="px-4 py-4 text-xs text-slate-600">
                              {r.assignedTo?.name || (
                                (() => {
                                  const wardEntry = wards.find(w => {
                                    const ws = w.ward.includes(' - ') ? w.ward.split(' - ').slice(1).join(' - ').trim() : w.ward
                                    return r.location?.ward?.toLowerCase().includes(ws.toLowerCase()) || ws.toLowerCase().includes(r.location?.ward?.toLowerCase())
                                  })
                                  return wardEntry?.officer?.name
                                    ? <span className="text-sky-600">{wardEntry.officer.name}</span>
                                    : <span className="text-slate-300">Unassigned</span>
                                })()
                              )}
                            </td>
                            <td className="px-4 py-4 text-slate-400 text-xs whitespace-nowrap">
                              {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-4">
                              {r.imageUrl ? (
                                <a href={r.imageUrl} target="_blank" rel="noreferrer">
                                  <img src={r.imageUrl} alt="issue" className="w-12 h-12 object-cover rounded-lg border border-slate-200 hover:scale-110 transition" />
                                </a>
                              ) : <span className="text-slate-300 text-xs">No image</span>}
                            </td>
                            <td className="px-4 py-4">
                              <div className="relative">
                                <select value={r.status} disabled={updatingId === r._id}
                                  onChange={e => handleStatusChange(r._id, e.target.value)}
                                  className="appearance-none border border-slate-200 rounded-lg px-3 py-1.5 pr-7 text-xs focus:ring-2 focus:ring-sky-400 focus:outline-none bg-white cursor-pointer disabled:opacity-50">
                                  <option value="PENDING">Pending</option>
                                  <option value="IN_PROGRESS">In Progress</option>
                                  <option value="RESOLVED">Resolved</option>
                                </select>
                                <ChevronDown size={12} className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default AdminIssues
