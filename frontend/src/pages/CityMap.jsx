import React, { useState, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polygon,
  useMap
} from "react-leaflet";
import L from "leaflet";
import { motion } from "framer-motion";
import axios from "axios";
import { serverUrl } from "../App";
import Navbar from "../components/Navbar";
import { Filter, Locate, RefreshCw, AlertTriangle } from "lucide-react";
import { geojsonToLatLngs } from "../utils/wardPolygon";
import "leaflet/dist/leaflet.css";

/* ---------------- FIX MARKER ICON ---------------- */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png"
});

/* ---------------- FORCE MAP RESIZE FIX ---------------- */
function ResizeMap() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [map]);
  return null;
}

/* ---------------- FIT MAP BOUNDS TO POLYGON OR MARKERS ---------------- */
function FitBounds({ polygon, points }) {
  const map = useMap();
  useEffect(() => {
    if (polygon && polygon.length > 0) {
      const flatPoints = Array.isArray(polygon[0][0])
        ? polygon.flat(1)
        : polygon;
      map.fitBounds(L.latLngBounds(flatPoints), { padding: [30, 30] });
    } else if (points && points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [30, 30] });
    }
  }, [polygon, points, map]);
  return null;
}

const CityMap = () => {
  const [reports, setReports] = useState([]);
  const [dbWards, setDbWards] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingWards, setLoadingWards] = useState(true);
  const [reportsError, setReportsError] = useState(null);
  const [wardsError, setWardsError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [wardPolygon, setWardPolygon] = useState(null);

  const [filters, setFilters] = useState({
    category: "All",
    status: "All",
    severity: "All"
  });

  const fetchReports = async () => {
    setLoadingReports(true);
    setReportsError(null);
    try {
      const { data } = await axios.get(`${serverUrl}/report/report-submit/reports`, {
        withCredentials: true
      });
      const repList = data.reports || [];
      setReports(repList);
      console.log("CITY MAP REPORTS:", repList);
      console.log("CITY MAP FIRST REPORT:", repList[0]);
    } catch (e) {
      console.error("CITY MAP REPORT FETCH ERROR:", e);
      setReportsError("Unable to load your complaints.");
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchWards = async () => {
    setLoadingWards(true);
    setWardsError(null);
    try {
      const { data } = await axios.get(`${serverUrl}/api/admin/wards`, {
        withCredentials: true
      });
      const wardList = data.wards || [];
      setDbWards(wardList);
      console.log("CITY MAP WARDS:", wardList);
    } catch (e) {
      console.error("CITY MAP WARD FETCH ERROR:", e);
      setWardsError("Unable to load ward boundary.");
    } finally {
      setLoadingWards(false);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchWards();
  }, []);

  /* ---------------- DETERMINE USER WARD & MATCH GEOMETRY ---------------- */
  const userWardName = useMemo(() => {
    if (!reports.length) return null;
    return reports[0]?.location?.ward || null;
  }, [reports]);

  useEffect(() => {
    console.log("CITY MAP USER WARD:", userWardName);
    if (userWardName && dbWards.length) {
      // Primary exact match
      let matchedWard = dbWards.find(w => w.wardName === userWardName);

      // Fallback match normalizing whitespace/case if needed
      if (!matchedWard) {
        matchedWard = dbWards.find(
          w => w.wardName.trim().toLowerCase() === userWardName.trim().toLowerCase()
        );
      }

      console.log("CITY MAP MATCHED WARD:", matchedWard);

      if (matchedWard && matchedWard.geometry) {
        setWardPolygon(geojsonToLatLngs(matchedWard.geometry));
      }
    }
  }, [userWardName, dbWards]);

  /* ---------------- FILTER REPORTS BELONGING TO USER'S WARD ---------------- */
  const wardReports = useMemo(() => {
    if (!userWardName) return [];
    return reports.filter(r => r.location?.ward === userWardName);
  }, [reports, userWardName]);

  const filteredReports = useMemo(() => {
    return wardReports.filter(r => {
      // Category filter (detectedType)
      if (filters.category !== "All") {
        const cat = r.aiAnalysis?.detectedType || "";
        if (cat.toLowerCase() !== filters.category.toLowerCase()) {
          return false;
        }
      }
      // Status filter
      if (filters.status !== "All") {
        const statusMap = {
          Pending: "PENDING",
          "In Progress": "IN_PROGRESS",
          Resolved: "RESOLVED"
        };
        const expectedStatus = statusMap[filters.status] || filters.status.toUpperCase();
        if (r.status !== expectedStatus) {
          return false;
        }
      }
      // Severity filter
      if (filters.severity !== "All") {
        const priority = r.priorityLevel || "";
        if (priority.toUpperCase() !== filters.severity.toUpperCase()) {
          return false;
        }
      }
      return true;
    });
  }, [wardReports, filters]);

  /* ---------------- GEOLOCATION ---------------- */
  const detectLocation = () => {
    navigator.geolocation.getCurrentPosition(
      position => {
        setUserLocation([
          position.coords.latitude,
          position.coords.longitude
        ]);
      },
      () => alert("Location permission denied")
    );
  };

  const validReportPoints = useMemo(() => {
    return filteredReports
      .filter(r => r.location?.latitude && r.location?.longitude)
      .map(r => [r.location.latitude, r.location.longitude]);
  }, [filteredReports]);

  const isLoading = loadingReports || loadingWards;

  return (
    <>
      <Navbar />

      <div className="pt-[120px] min-h-screen bg-gradient-to-b from-sky-50 via-white to-white pb-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row gap-6">

          {/* FILTER PANEL */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-full md:w-72 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-fit"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-sky-500" />
                <h3 className="font-semibold text-slate-800">Filters</h3>
              </div>
              <button
                onClick={() => {
                  fetchReports();
                  fetchWards();
                }}
                disabled={isLoading}
                className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1 font-medium cursor-pointer"
              >
                <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            {userWardName && (
              <div className="mb-5 p-3 rounded-xl bg-sky-50 border border-sky-100">
                <span className="text-[11px] font-semibold text-sky-600 uppercase tracking-wider block">
                  My Ward
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {userWardName}
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  {wardReports.length} complaint{wardReports.length !== 1 ? "s" : ""} registered
                </span>
              </div>
            )}

            {["category", "status", "severity"].map(type => (
              <div className="mb-4" key={type}>
                <label className="text-sm font-medium text-slate-600 capitalize">
                  {type}
                </label>
                <select
                  className="mt-2 w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-400 text-sm"
                  value={filters[type]}
                  onChange={e =>
                    setFilters({ ...filters, [type]: e.target.value })
                  }
                >
                  <option>All</option>
                  {type === "category" && (
                    <>
                      <option>Pothole</option>
                      <option>Garbage</option>
                      <option>Streetlight</option>
                    </>
                  )}
                  {type === "status" && (
                    <>
                      <option>Pending</option>
                      <option>In Progress</option>
                      <option>Resolved</option>
                    </>
                  )}
                  {type === "severity" && (
                    <>
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </>
                  )}
                </select>
              </div>
            ))}

            <button
              onClick={detectLocation}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-lg transition text-sm font-medium cursor-pointer"
            >
              <Locate size={16} />
              Detect My Location
            </button>
          </motion.div>

          {/* MAP SECTION */}
          <div className="flex-1">
            <div className="h-[650px] w-full rounded-2xl overflow-hidden shadow-md border border-slate-100 relative">

              {/* DIAGNOSTIC / EMPTY OVERLAY BANNER */}
              {isLoading ? (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-md border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-sky-500" />
                  Loading reports and ward boundary...
                </div>
              ) : reportsError ? (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-50 text-red-700 px-4 py-2 rounded-xl shadow-md border border-red-200 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-500" />
                  {reportsError}
                </div>
              ) : wardsError ? (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-amber-50 text-amber-800 px-4 py-2 rounded-xl shadow-md border border-amber-200 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-600" />
                  {wardsError}
                </div>
              ) : wardReports.length === 0 ? (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-md border border-slate-200 text-xs font-semibold text-slate-600">
                  No complaints found for your ward.
                </div>
              ) : null}

              <MapContainer
                center={[22.3072, 73.1812]}
                zoom={13}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <ResizeMap />
                <FitBounds polygon={wardPolygon} points={validReportPoints} />

                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Ward boundary polygon from MongoDB stored GeoJSON */}
                {wardPolygon && (
                  <Polygon
                    positions={wardPolygon}
                    pathOptions={{
                      color: "#0EA5E9",
                      fillColor: "#38BDF8",
                      fillOpacity: 0.2,
                      weight: 2.5,
                      opacity: 0.8
                    }}
                  >
                    <Popup>
                      <div className="text-sm font-semibold text-slate-800">
                        {userWardName}
                      </div>
                      <div className="text-xs text-slate-500">
                        Your assigned ward boundary
                      </div>
                    </Popup>
                  </Polygon>
                )}

                {/* User Geolocation Marker */}
                {userLocation && (
                  <>
                    <Marker position={userLocation}>
                      <Popup>You are here 📍</Popup>
                    </Marker>

                    <Circle
                      center={userLocation}
                      radius={1000}
                      pathOptions={{ color: "#0EA5E9" }}
                    />
                  </>
                )}

                {/* Real User Complaint Markers */}
                {filteredReports.map(r => {
                  if (!r.location?.latitude || !r.location?.longitude) return null;
                  return (
                    <Marker
                      key={r._id}
                      position={[r.location.latitude, r.location.longitude]}
                    >
                      <Popup minWidth={220}>
                        <div className="p-1 space-y-1">
                          <div className="flex items-center justify-between gap-2 border-b pb-1">
                            <strong className="text-slate-800 text-sm">
                              {r.aiAnalysis?.detectedType || "Civic Issue"}
                            </strong>
                            <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-semibold">
                              {r.status}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 space-y-0.5 pt-1">
                            <p><strong>Complaint ID:</strong> {r._id}</p>
                            <p><strong>Ward:</strong> {r.location?.ward || "N/A"}</p>
                            <p><strong>Priority:</strong> {r.priorityLevel || r.severityScore || "N/A"}</p>
                            <p><strong>Address:</strong> {r.location?.address || "N/A"}</p>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

              </MapContainer>

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CityMap;