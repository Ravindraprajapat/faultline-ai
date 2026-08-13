import React, { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet'
import L from 'leaflet'
import { motion } from 'framer-motion'
import axios from 'axios'
import { serverUrl } from '../App'
import Navbar from '../components/Navbar'
import { Filter, MapPin, RefreshCw } from 'lucide-react'
import { useSelector } from 'react-redux'
import { fetchWardPolygon, geojsonToLatLngs } from '../utils/wardPolygon'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png'
})

const STATUS_COLORS_MAP = {
  PENDING: '#f59e0b',
  IN_PROGRESS: '#3b82f6',
  RESOLVED: '#22c55e'
}

function makeIcon(status) {
  const color = STATUS_COLORS_MAP[status] || '#94a3b8'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22S28 24.5 28 14C28 6.27 21.73 0 14 0z"
      fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
  </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -38]
  })
}

function ResizeMap() {
  const map = useMap()
  useEffect(() => { setTimeout(() => map.invalidateSize(), 200) }, [map])
  return null
}

// Zooms map to fit the polygon bounds
function FitBounds({ polygon }) {
  const map = useMap()
  useEffect(() => {
    if (polygon && polygon.length > 0) {
      const flatPoints = Array.isArray(polygon[0][0])
        ? polygon.flat(1)
        : polygon
      map.fitBounds(L.latLngBounds(flatPoints), { padding: [30, 30] })
    }
  }, [polygon, map])
  return null
}

const STATUS_COLORS = {
  PENDING: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  IN_PROGRESS: 'text-blue-600 bg-blue-50 border-blue-200',
  RESOLVED: 'text-green-600 bg-green-50 border-green-200'
}

const OfficerMap = () => {
  const { userData } = useSelector(state => state.user)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [ward, setWard] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [wardPolygon, setWardPolygon] = useState(null)

  const fetchReports = async () => {
    setLoading(true)
    setRefreshing(true)
    try {
      const [{ data: repData }, { data: wardsData }] = await Promise.all([
        axios.get(`${serverUrl}/api/admin/officer/reports`, { withCredentials: true }),
        axios.get(`${serverUrl}/api/admin/wards`, { withCredentials: true })
      ])
      setReports(repData.reports || [])
      const wardName = repData.ward || userData?.assignedWard || ''
      setWard(wardName)
      setLastUpdated(new Date())

      // Find matching stored Ward document from MongoDB
      const matchedWardDoc = (wardsData.wards || []).find(w => {
        const cleanWard = wardName.includes(' - ') ? wardName.split(' - ').slice(1).join(' - ').trim() : wardName.trim()
        return w.wardName === cleanWard || w.wardName === wardName || cleanWard.toLowerCase().includes(w.wardName.toLowerCase())
      })

      if (matchedWardDoc) {
        setWardPolygon(geojsonToLatLngs(matchedWardDoc.geometry))
      } else if (wardName) {
        fetchWardPolygon(wardName).then(poly => setWardPolygon(poly))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Initial load only
  useEffect(() => { fetchReports() }, [])

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

  const mapCenter = useMemo(() => {
    const valid = reports.filter(r => r.location?.latitude && r.location?.longitude)
    if (!valid.length) return [22.3072, 73.1812]
    return [
      valid.reduce((s, r) => s + r.location.latitude, 0) / valid.length,
      valid.reduce((s, r) => s + r.location.longitude, 0) / valid.length
    ]
  }, [reports])

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      <Navbar />

      <div className="pt-[120px] pb-10 px-4 md:px-8 max-w-[1400px] mx-auto">

        {/* Header with top refresh button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-start justify-between"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-slate-900">My Ward Map</h1>
              {ward && (
                <span className="bg-sky-100 text-sky-700 text-sm font-semibold px-3 py-1 rounded-full border border-sky-200">
                  <MapPin size={13} className="inline mr-1" />
                  {ward}
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm">
              Issues reported in your assigned ward
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

        {/* Stats */}
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
            <div key={s.label} className={`${s.bg} rounded-xl border border-slate-100 shadow-sm p-4`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Filter bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 mb-5 flex items-center gap-4"
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
            {filtered.length} issue{filtered.length !== 1 ? 's' : ''} shown
          </span>
        </motion.div>

        <div className="flex gap-5 h-[600px]">

          {/* Issues List */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-80 flex-shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 z-10">
              <h3 className="font-semibold text-slate-800 text-sm">
                Issues ({filtered.length})
              </h3>
            </div>

            {loading ? (
              <div className="p-6 text-slate-400 text-sm text-center flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin" /> Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-slate-400 text-sm text-center">No issues found</div>
            ) : (
              <div className="p-3 space-y-2">
                {filtered.map(r => (
                  <div
                    key={r._id}
                    className="border border-slate-100 rounded-xl p-3 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-semibold text-sm text-slate-800">
                        {r.aiAnalysis?.detectedType?.replace('_', ' ') || 'Unknown'}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[r.status]}`}>
                        {r.status?.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {r.location?.address ||
                        `${r.location?.latitude?.toFixed(4)}, ${r.location?.longitude?.toFixed(4)}`}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={`text-[10px] font-semibold ${
                        r.priorityLevel === 'HIGH' ? 'text-red-500' :
                        r.priorityLevel === 'MEDIUM' ? 'text-orange-500' : 'text-gray-400'
                      }`}>
                        ⚡ {r.priorityLevel}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(r.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      👤 {r.reportedBy?.name || 'Unknown'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Map */}
          <div className="flex-1 rounded-2xl overflow-hidden shadow-md border border-slate-100">
            <MapContainer
              center={mapCenter}
              zoom={14}
              scrollWheelZoom
              className="h-full w-full"
            >
              <ResizeMap />
              <FitBounds polygon={wardPolygon} />
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Ward boundary polygon */}
              {wardPolygon && (
                <Polygon
                  positions={wardPolygon}
                  pathOptions={{
                    color: '#2563eb',
                    fillColor: '#93c5fd',
                    fillOpacity: 0.25,
                    weight: 2.5,
                    opacity: 0.8
                  }}
                >
                  <Popup>
                    <div className="text-sm font-semibold text-slate-800">{ward}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Your assigned ward</div>
                  </Popup>
                </Polygon>
              )}
              {filtered
                .filter(r => r.location?.latitude && r.location?.longitude)
                .map(r => (
                  <Marker
                    key={r._id}
                    position={[r.location.latitude, r.location.longitude]}
                    icon={makeIcon(r.status)}
                  >
                    <Popup>
                      <div className="text-sm space-y-1">
                        <strong>{r.aiAnalysis?.detectedType?.replace('_', ' ')}</strong>
                        <div className={`text-xs font-medium ${
                          r.status === 'PENDING' ? 'text-yellow-600' :
                          r.status === 'IN_PROGRESS' ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {r.status?.replace('_', ' ')}
                        </div>
                        <div className="text-xs text-slate-500">
                          {r.location?.address || 'No address'}
                        </div>
                        <div className="text-xs text-slate-400">
                          Reported by: {r.reportedBy?.name}
                        </div>
                        {r.imageUrl && (
                          <a href={r.imageUrl} target="_blank" rel="noreferrer">
                            <img src={r.imageUrl} alt="issue" className="w-full h-20 object-cover rounded mt-1" />
                          </a>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MapContainer>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-6 text-xs text-slate-500">
          <span className="font-medium">Map Legend:</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Pending</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> In Progress</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Resolved</span>
        </div>
      </div>
    </div>
  )
}

export default OfficerMap
