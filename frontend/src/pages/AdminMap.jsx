import React, { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { serverUrl } from '../App'
import Navbar from '../components/Navbar'
import { MapPin, ChevronDown, ChevronUp, X, User, RefreshCw } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

/* ── Fix default icon path (prevents broken img) ── */
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png'
})

/* ── Inline SVG DivIcon — never breaks, no CDN needed ── */
function makePinIcon(color, count) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26S36 31.5 36 18C36 8.06 27.94 0 18 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="18" cy="18" r="10" fill="white" opacity="0.9"/>
      <text x="18" y="23" text-anchor="middle" font-size="11"
        font-weight="bold" fill="${color}" font-family="Arial,sans-serif">${count}</text>
    </svg>`

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -46]
  })
}

function ResizeMap() {
  const map = useMap()
  useEffect(() => { setTimeout(() => map.invalidateSize(), 200) }, [map])
  return null
}

function getWardCentroid(reports) {
  const valid = reports.filter(r => r.location?.latitude && r.location?.longitude)
  if (!valid.length) return [22.3072, 73.1812]
  return [
    valid.reduce((s, r) => s + r.location.latitude, 0) / valid.length,
    valid.reduce((s, r) => s + r.location.longitude, 0) / valid.length
  ]
}

const STATUS_COLORS = {
  PENDING: 'text-yellow-600 bg-yellow-50',
  IN_PROGRESS: 'text-blue-600 bg-blue-50',
  RESOLVED: 'text-green-600 bg-green-50'
}

const AdminMap = () => {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedWard, setSelectedWard] = useState(null)
  const [wardFilter, setWardFilter] = useState('ALL')
  const [expandedWard, setExpandedWard] = useState(null)

  const fetchReports = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${serverUrl}/api/admin/reports`, { withCredentials: true })
      setReports(data.reports)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchReports() }, [])

  /* ── Group by ward ── */
  const wardGroups = useMemo(() => {
    const groups = {}
    reports.forEach(r => {
      const ward = r.location?.ward
      if (!ward || ward === 'Unknown') return
      if (!groups[ward]) groups[ward] = []
      groups[ward].push(r)
    })
    return groups
  }, [reports])

  /* ── Sort wards by pending+inProgress desc ── */
  const sortedWards = useMemo(() => {
    return Object.entries(wardGroups)
      .map(([ward, reps]) => ({
        ward,
        pending: reps.filter(r => r.status === 'PENDING').length,
        inProgress: reps.filter(r => r.status === 'IN_PROGRESS').length,
        resolved: reps.filter(r => r.status === 'RESOLVED').length,
        total: reps.length,
        centroid: getWardCentroid(reps)
      }))
      .sort((a, b) => (b.pending + b.inProgress) - (a.pending + a.inProgress))
  }, [wardGroups])

  const maxPendingWard = sortedWards[0]?.ward

  const wardDetailReports = useMemo(() => {
    if (!selectedWard) return []
    const reps = wardGroups[selectedWard] || []
    return wardFilter === 'ALL' ? reps : reps.filter(r => r.status === wardFilter)
  }, [selectedWard, wardGroups, wardFilter])

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      <Navbar />

      <div className="pt-[120px] pb-10 px-4 md:px-8 max-w-[1500px] mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Issue Map</h1>
            <p className="text-slate-500 mt-1">Ward-wise distribution of infrastructure issues</p>
          </div>
          <button onClick={fetchReports} disabled={loading}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition cursor-pointer">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </motion.div>

        <div className="flex gap-5 h-[700px]">

          {/* ── LEFT PANEL ── */}
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            className="w-72 flex-shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-y-auto">

            <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 z-10">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <MapPin size={16} className="text-sky-500" />
                Ward Summary
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Sorted by active issues · 🔴 = most pending</p>
            </div>

            {loading ? (
              <div className="p-6 text-slate-400 text-sm text-center flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin" /> Loading...
              </div>
            ) : sortedWards.length === 0 ? (
              <div className="p-6 text-slate-400 text-sm text-center">No ward data found</div>
            ) : (
              <div className="p-3 space-y-2">
                {sortedWards.map(({ ward, pending, inProgress, resolved, total }) => (
                  <div key={ward}
                    className={`rounded-xl border transition ${
                      expandedWard === ward
                        ? 'border-sky-300 bg-sky-50'
                        : 'border-slate-100 hover:border-sky-200 hover:bg-slate-50'
                    }`}>

                    {/* Ward header row */}
                    <div className="flex items-center justify-between p-3 cursor-pointer"
                      onClick={() => setExpandedWard(expandedWard === ward ? null : ward)}>
                      <div className="flex items-center gap-2">
                        {ward === maxPendingWard && (
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" title="Most pending issues" />
                        )}
                        <span className="font-semibold text-sm text-slate-800 leading-tight">{ward}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">{total}</span>
                        {expandedWard === ward
                          ? <ChevronUp size={13} className="text-slate-400" />
                          : <ChevronDown size={13} className="text-slate-400" />}
                      </div>
                    </div>

                    {/* Status pills */}
                    <div className="px-3 pb-2 flex gap-1 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-50 text-yellow-600 font-semibold">{pending} Pending</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold">{inProgress} In Progress</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 font-semibold">{resolved} Resolved</span>
                    </div>

                    {/* View Details button */}
                    <div className="px-3 pb-3">
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedWard(ward); setWardFilter('ALL') }}
                        className="w-full text-xs bg-sky-500 hover:bg-sky-600 text-white py-1.5 rounded-lg font-medium transition cursor-pointer">
                        View Details
                      </button>
                    </div>

                    {/* Expanded officer info */}
                    <AnimatePresence>
                      {expandedWard === ward && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-slate-100">
                          <div className="p-3 space-y-1.5">
                            {(wardGroups[ward] || []).filter(r => r.assignedTo).length > 0 ? (
                              [...new Map(
                                (wardGroups[ward] || [])
                                  .filter(r => r.assignedTo)
                                  .map(r => [r.assignedTo._id, r.assignedTo])
                              ).values()].map(officer => (
                                <div key={officer._id} className="flex items-center gap-2 text-xs text-slate-600">
                                  <User size={11} className="text-sky-400" />
                                  <span className="font-medium">{officer.name}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-400">No officer assigned</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* ── MAP ── */}
          <div className="flex-1 rounded-2xl overflow-hidden shadow-md border border-slate-100">
            {!loading && (
              <MapContainer
                center={[22.3072, 73.1812]}
                zoom={13}
                scrollWheelZoom
                className="h-full w-full">
                <ResizeMap />
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {sortedWards.map(({ ward, centroid, total, pending, inProgress, resolved }) => {
                  const isHotspot = ward === maxPendingWard
                  const pinColor = isHotspot ? '#ef4444' : '#0ea5e9'
                  const activeCount = pending + inProgress

                  return (
                    <Marker
                      key={ward}
                      position={centroid}
                      icon={makePinIcon(pinColor, total)}>
                      <Popup minWidth={200}>
                        <div className="py-1">
                          {/* Ward name */}
                          <div className="flex items-center gap-1.5 mb-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: pinColor }}
                            />
                            <strong className="text-slate-800 text-sm">{ward}</strong>
                            {isHotspot && (
                              <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold ml-auto">
                                Most Active
                              </span>
                            )}
                          </div>

                          {/* Count rows */}
                          <div className="space-y-1 text-xs mb-3">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">Total Complaints</span>
                              <span className="font-bold text-slate-800">{total}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="flex items-center gap-1 text-yellow-600">
                                <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                                Pending
                              </span>
                              <span className="font-semibold text-yellow-700">{pending}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="flex items-center gap-1 text-blue-600">
                                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                                In Progress
                              </span>
                              <span className="font-semibold text-blue-700">{inProgress}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="flex items-center gap-1 text-green-600">
                                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                                Resolved
                              </span>
                              <span className="font-semibold text-green-700">{resolved}</span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          {total > 0 && (
                            <div className="flex rounded-full overflow-hidden h-2 mb-3">
                              {pending > 0 && <div className="bg-yellow-400" style={{ width: `${(pending / total) * 100}%` }} />}
                              {inProgress > 0 && <div className="bg-blue-400" style={{ width: `${(inProgress / total) * 100}%` }} />}
                              {resolved > 0 && <div className="bg-green-400" style={{ width: `${(resolved / total) * 100}%` }} />}
                            </div>
                          )}

                          <button
                            onClick={() => { setSelectedWard(ward); setWardFilter('ALL') }}
                            className="w-full bg-sky-500 hover:bg-sky-600 text-white text-xs py-1.5 rounded-lg font-medium transition cursor-pointer">
                            View All Issues →
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
              </MapContainer>
            )}
            {loading && (
              <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50">
                <RefreshCw size={20} className="animate-spin mr-2" /> Loading map...
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center gap-6 text-xs text-slate-500">
          <span className="font-medium">Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Most pending ward
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" /> Other wards
          </span>
          <span className="text-slate-400">· Number on pin = total complaints in ward</span>
        </div>

        {/* ── WARD DETAIL MODAL ── */}
        <AnimatePresence>
          {selectedWard && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[1000] flex items-center justify-center p-4"
              onClick={() => setSelectedWard(null)}>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">

                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selectedWard}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      {(() => {
                        const w = sortedWards.find(s => s.ward === selectedWard)
                        return w ? (
                          <>
                            <span className="text-xs text-slate-500">{w.total} total</span>
                            <span className="text-xs text-yellow-600 font-semibold">{w.pending} pending</span>
                            <span className="text-xs text-blue-600 font-semibold">{w.inProgress} in progress</span>
                            <span className="text-xs text-green-600 font-semibold">{w.resolved} resolved</span>
                          </>
                        ) : null
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select value={wardFilter} onChange={e => setWardFilter(e.target.value)}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-sky-400 focus:outline-none cursor-pointer">
                      <option value="ALL">All Status</option>
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                    <button onClick={() => setSelectedWard(null)}
                      className="p-2 hover:bg-slate-100 rounded-lg cursor-pointer">
                      <X size={18} className="text-slate-500" />
                    </button>
                  </div>
                </div>

                {/* Modal body */}
                <div className="overflow-y-auto flex-1 p-4 space-y-3">
                  {wardDetailReports.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">No issues found</div>
                  ) : (
                    wardDetailReports.map(r => (
                      <div key={r._id}
                        className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50 transition">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-slate-800">
                                {r.aiAnalysis?.detectedType?.replace('_', ' ') || 'Unknown'}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status]}`}>
                                {r.status?.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mb-2">
                              {r.location?.address || `${r.location?.latitude?.toFixed(5)}, ${r.location?.longitude?.toFixed(5)}`}
                            </p>
                            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                              <span>👤 {r.reportedBy?.name || 'Unknown'}</span>
                              {r.assignedTo && (
                                <span className="text-sky-600 font-medium">🔧 {r.assignedTo.name}</span>
                              )}
                              <span>📅 {new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                              <span className={`font-semibold ${
                                r.priorityLevel === 'HIGH' ? 'text-red-500' :
                                r.priorityLevel === 'MEDIUM' ? 'text-orange-500' : 'text-gray-400'
                              }`}>⚡ {r.priorityLevel}</span>
                            </div>
                          </div>
                          {r.imageUrl && (
                            <a href={r.imageUrl} target="_blank" rel="noreferrer">
                              <img src={r.imageUrl} alt="issue"
                                className="w-16 h-16 object-cover rounded-lg border border-slate-200 flex-shrink-0" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default AdminMap
