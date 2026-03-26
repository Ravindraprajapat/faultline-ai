import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap
} from "react-leaflet";
import L from "leaflet";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import { Filter, Locate } from "lucide-react";
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

/* ---------------- DUMMY DATA ---------------- */
const dummyComplaints = [
  {
    id: 1,
    category: "Pothole",
    severity: "High",
    status: "Pending",
    lat: 22.3072,
    lng: 73.1812
  },
  {
    id: 2,
    category: "Garbage",
    severity: "Medium",
    status: "In Progress",
    lat: 22.3105,
    lng: 73.1901
  },
  {
    id: 3,
    category: "Streetlight",
    severity: "Low",
    status: "Resolved",
    lat: 22.3,
    lng: 73.185
  }
];

const CityMap = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [filteredData, setFilteredData] = useState(dummyComplaints);

  const [filters, setFilters] = useState({
    category: "All",
    status: "All",
    severity: "All"
  });

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

  /* ---------------- FILTER LOGIC ---------------- */
  useEffect(() => {
    let data = dummyComplaints;

    if (filters.category !== "All") {
      data = data.filter(c => c.category === filters.category);
    }

    if (filters.status !== "All") {
      data = data.filter(c => c.status === filters.status);
    }

    if (filters.severity !== "All") {
      data = data.filter(c => c.severity === filters.severity);
    }

    setFilteredData(data);
  }, [filters]);

  return (
    <>
      <Navbar />

      <div className="pt-[120px] min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
        <div className="max-w-7xl mx-auto px-6 flex gap-6">

          {/* FILTER PANEL */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-72 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-fit"
          >
            <div className="flex items-center gap-2 mb-6">
              <Filter size={18} className="text-sky-500" />
              <h3 className="font-semibold text-slate-800">Filters</h3>
            </div>

            {["category", "status", "severity"].map(type => (
              <div className="mb-4" key={type}>
                <label className="text-sm font-medium text-slate-600 capitalize">
                  {type}
                </label>
                <select
                  className="mt-2 w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-400"
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
              className="mt-4 w-full flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-lg"
            >
              <Locate size={16} />
              Detect My Location
            </button>
          </motion.div>

          {/* MAP SECTION */}
          <div className="flex-1">
            <div className="h-[650px] w-full rounded-2xl overflow-hidden shadow-md border border-slate-100">

              <MapContainer
                center={[22.3072, 73.1812]}
                zoom={13}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <ResizeMap />

                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

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

                {filteredData.map(c => (
                  <Marker key={c.id} position={[c.lat, c.lng]}>
                    <Popup>
                      <strong>{c.category}</strong>
                      <br />
                      Severity: {c.severity}
                      <br />
                      Status: {c.status}
                    </Popup>
                  </Marker>
                ))}

              </MapContainer>

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CityMap;