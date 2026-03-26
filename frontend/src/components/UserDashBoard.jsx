// import React from 'react'
// import { motion } from 'framer-motion'
// import Navbar from '../components/Navbar'
// import { useNavigate } from 'react-router-dom'
// import { useSelector } from 'react-redux'

// const UserDashBoard = () => {
//   const navigate = useNavigate()
//   const { userData } = useSelector(state => state.user)

//   return (
//     <>
//       <Navbar />

//       <motion.main
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         transition={{ duration: 0.6 }}
//         className="
//           w-full min-h-screen
//           pt-[120px]
//           bg-gradient-to-b from-sky-50 via-white to-white
//         "
//       >
//         <div className="w-full pl-12 pr-6 md:pl-24 md:pr-12">
//           <motion.div
//             initial={{ y: 40, opacity: 0 }}
//             animate={{ y: 0, opacity: 1 }}
//             transition={{ delay: 0.2 }}
//             className="max-w-5xl"
//           >
//             <motion.div
//               initial={{ scale: 0.9, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               transition={{ delay: 0.3 }}
//               className="
//                 inline-flex items-center gap-2
//                 bg-sky-100 border border-sky-200
//                 text-sky-700 px-4 py-1.5
//                 rounded-full text-sm font-medium mb-8
//               "
//             >
//               ⚡ AI-Powered Citizen-as-a-Sensor System
//             </motion.div>

//             <motion.h1
//               initial={{ y: 30, opacity: 0 }}
//               animate={{ y: 0, opacity: 1 }}
//               transition={{ delay: 0.4 }}
//               className="text-4xl md:text-6xl font-bold mb-6"
//             >
//               Automated Infrastructure Detection
//               <span className="block text-sky-500 mt-2">
//                 For Vadodara City
//               </span>
//             </motion.h1>

//             <motion.p
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               transition={{ delay: 0.5 }}
//               className="text-lg text-slate-500 mb-12 max-w-3xl"
//             >
//               Report potholes, damaged roads and drainage blockages instantly.
//               AI helps prioritize repairs to prevent accidents.
//             </motion.p>

//             {/* ✅ BUTTONS CENTER FIX */}
//             <motion.div
//               initial={{ y: 20, opacity: 0 }}
//               animate={{ y: 0, opacity: 1 }}
//               transition={{ delay: 0.6 }}
//               className="
//                 flex flex-col sm:flex-row
//                 justify-center items-center
//                 gap-4
//               "
//             >
//               <motion.button
//                 whileHover={{ scale: 1.05 }}
//                 onClick={() => {
//                   if (!userData) {
//                     navigate('/signin')
//                   } else {
//                     navigate('/report')
//                   }
//                 }}
//                 className="
//                   bg-sky-500 hover:bg-sky-600
//                   text-white px-8 py-3
//                   rounded-xl font-semibold shadow-lg
//                 "
//               >
//                 {userData ? 'Report Issue →' : 'Login to Report →'}
//               </motion.button>

//               <motion.button
//                 whileHover={{ scale: 1.05 }}
//                 className="
//                   bg-white border border-gray-200
//                   px-8 py-3 rounded-xl
//                   font-semibold
//                 "
//               >
//                 View Dashboard
//               </motion.button>
//             </motion.div>
//           </motion.div>
//         </div>
//       </motion.main>
//     </>
//   )
// }

// export default UserDashBoard

import React from "react";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  AlertTriangle,
  Zap,
  Search,
  Trash2,
  MapPin,
  FileCheck,
  CheckCircle
} from "lucide-react";

/* ================== ANIMATION ================== */

const containerVariant = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

/* ================== STAT CARD ================== */

const StatCard = ({ count, label, icon: Icon, subtle }) => (
  <motion.div
    variants={fadeUp}
    whileHover={{ y: -8, scale: 1.03 }}
    className="
      bg-white rounded-2xl
      border border-gray-100
      shadow-sm hover:shadow-xl
      p-6 flex items-center gap-4
      transition-all duration-300
    "
  >
    <div
      className={`
        w-14 h-14 rounded-xl
        flex items-center justify-center
        ${subtle ? "bg-gray-100" : "bg-sky-100"}
      `}
    >
      <Icon size={24} className={subtle ? "text-gray-500" : "text-sky-600"} />
    </div>

    <div>
      <div className="text-3xl font-bold text-slate-900">{count}</div>
      <div className="text-sm text-slate-500 font-medium">{label}</div>
    </div>
  </motion.div>
);

/* ================== FEATURE CARD ================== */

const FeatureCard = ({ title, desc }) => (
  <motion.div
    variants={fadeUp}
    className="flex gap-4"
  >
    <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0">
      <CheckCircle className="text-sky-600" size={22} />
    </div>

    <div>
      <h3 className="font-semibold text-lg text-slate-900 mb-2">
        {title}
      </h3>
      <p className="text-slate-500 text-sm leading-relaxed">
        {desc}
      </p>
    </div>
  </motion.div>
);

/* ================== DASHBOARD ================== */

const UserDashBoard = () => {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      <Navbar />

      <motion.main
        initial="hidden"
        animate="visible"
        variants={containerVariant}
        className="pt-[140px] pb-24 w-full"
      >
        <div className="w-full px-6 md:px-12 lg:px-20">

          {/* HERO */}
          <motion.div variants={fadeUp} className="text-center mb-28">
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
              Automated Infrastructure Detection
              <span className="block text-sky-500 mt-3">
                For Vadodara City
              </span>
            </h1>

            <p className="text-lg text-slate-500 max-w-3xl mx-auto mb-12">
              AI helps prioritize infrastructure repairs efficiently and intelligently.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-5">
              <motion.button
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.95 }}
                onClick={() =>
                  userData ? navigate("/report") : navigate("/signin")
                }
                className="bg-sky-500 text-white px-10 py-3 rounded-xl font-semibold shadow-lg"
              >
                {userData ? "Report Issue →" : "Login to Report →"}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white border border-gray-200 px-10 py-3 rounded-xl font-semibold hover:bg-gray-50"
              >
                View Dashboard
              </motion.button>
            </div>
          </motion.div>

          {/* STATS SECTION */}
          <motion.div
            variants={containerVariant}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 mb-32"
          >
            <StatCard count="24" label="Reported Potholes" icon={AlertTriangle} />
            <StatCard count="15" label="Streetlight Issues" icon={Zap} />
            <StatCard count="12" label="Drainage Blockages" icon={Search} />
            <StatCard count="31" label="Waste Reports" icon={Trash2} />
            <StatCard count="2" label="Bridge Inspections" icon={MapPin} subtle />
            <StatCard count="156" label="Total Resolved" icon={FileCheck} subtle />
          </motion.div>

          {/* SMART AI INFO SECTION */}
          <motion.div variants={containerVariant} className="text-center mb-16">
            <motion.h2
              variants={fadeUp}
              className="text-3xl md:text-4xl font-bold text-slate-900 mb-6"
            >
              Smart Maintenance AI
            </motion.h2>

            <motion.p
              variants={fadeUp}
              className="text-slate-500 max-w-3xl mx-auto mb-16"
            >
              We use Computer Vision and Neural Networks to process every report,
              ensuring the most critical infrastructure issues are resolved first.
            </motion.p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-16 text-left">
              <FeatureCard
                title="Automated Damage Assessment"
                desc="AI scans uploaded photos to measure pothole depth and automatically classify urgency levels."
              />
              <FeatureCard
                title="Geospatial Prioritization"
                desc="Issues are mapped against high-traffic zones to reduce congestion and risk."
              />
              <FeatureCard
                title="Smart Dispatch Logic"
                desc="Validated reports are routed to the nearest municipal team for faster response."
              />
            </div>
          </motion.div>

        </div>
      </motion.main>
    </div>
  );
};

export default UserDashBoard;