import React, { useState } from 'react'
import { Eye, EyeOff, Lock, Mail, User, Phone, ShieldCheck, HardHat, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FcGoogle } from 'react-icons/fc'
import axios from 'axios'
import { serverUrl } from '../App'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../../firebase.js'
import { setUserData } from '../redux/userSlice.js'
import { useDispatch } from 'react-redux'

const VADODARA_WARDS = [
  'Ward 1 - Wadi', 'Ward 2 - Harni', 'Ward 3 - Manjalpur', 'Ward 4 - Fatehgunj',
  'Ward 5 - Sayajigunj', 'Ward 6 - Alkapuri', 'Ward 7 - Gotri', 'Ward 8 - Waghodia Road',
  'Ward 9 - Makarpura', 'Ward 10 - Karelibaug', 'Ward 11 - Akota', 'Ward 12 - Sama',
  'Ward 13 - Vasna', 'Ward 14 - Nizampura', 'Ward 15 - Gorwa'
]

const ROLES = [
  { key: 'user', label: 'User', icon: User, desc: 'Report infrastructure issues' },
  { key: 'admin', label: 'Admin', icon: ShieldCheck, desc: 'Full system access' },
  { key: 'officer', label: 'Ward Officer', icon: HardHat, desc: 'Manage assigned ward' }
]

const SignUp = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [assignedWard, setAssignedWard] = useState('')
  const [error, setError] = useState('')
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleSignUp = async () => {
    setError('')
    if (role === 'officer' && !assignedWard) {
      setError('Please select a ward for the officer.')
      return
    }
    try {
      const payload = { name: fullName, mobile, email, password, role }
      if (role === 'officer') payload.assignedWard = assignedWard

      const result = await axios.post(`${serverUrl}/api/auth/signup`, payload, {
        withCredentials: true
      })
      dispatch(setUserData(result.data))

      if (role === 'admin') navigate('/admin/issues')
      else if (role === 'officer') navigate('/officer/map')
      else navigate('/')
    } catch (err) {
      setError(err?.response?.data?.message || 'Sign up failed')
    }
  }

  const handleGoogleSignUp = async () => {
    if (!mobile) return alert('Mobile number is required')
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    try {
      const { data } = await axios.post(
        `${serverUrl}/api/auth/google-auth`,
        { name: result.user.displayName, email: result.user.email, mobile },
        { withCredentials: true }
      )
      dispatch(setUserData(data))
      navigate('/')
    } catch (err) {
      console.log('error in google signUp', err)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-sky-50 via-white to-sky-100"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-white rounded-2xl shadow-xl shadow-sky-100 w-full max-w-md p-8 border border-sky-200"
      >
        <h1 className="text-3xl font-bold mb-2 text-center text-sky-500">
          Create your Faultline AI account
        </h1>
        <p className="text-gray-600 mb-6 text-center">Sign up to get started</p>

        {/* Role Selector */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2 text-left text-sm">
            Register as
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map(({ key, label, icon: Icon, desc }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setRole(key); setAssignedWard('') }}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-semibold transition cursor-pointer ${
                  role === key
                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                    : 'border-slate-200 text-slate-500 hover:border-sky-200 hover:bg-slate-50'
                }`}
              >
                <Icon size={18} />
                {label}
                <span className="text-[10px] font-normal text-center leading-tight opacity-70">
                  {desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Full Name */}
        <motion.div
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-4"
        >
          <label className="block text-gray-700 font-medium mb-1 text-left">Full Name</label>
          <div className="relative">
            <User size={18} className="absolute left-3 top-[11px] text-gray-400" />
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full border border-sky-200 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-sky-400 focus:border-sky-500 outline-none transition"
            />
          </div>
        </motion.div>

        {/* Mobile */}
        <motion.div
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mb-4"
        >
          <label className="block text-gray-700 font-medium mb-1 text-left">Mobile</label>
          <div className="relative">
            <Phone size={18} className="absolute left-3 top-[11px] text-gray-400" />
            <input
              value={mobile}
              onChange={e => setMobile(e.target.value)}
              placeholder="Enter your mobile number"
              className="w-full border border-sky-200 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-sky-400 focus:border-sky-500 outline-none transition"
            />
          </div>
        </motion.div>

        {/* Ward selector — only for officer */}
        {role === 'officer' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4"
          >
            <label className="block text-gray-700 font-medium mb-1 text-left">Assigned Ward</label>
            <div className="relative">
              <MapPin size={18} className="absolute left-3 top-[11px] text-gray-400" />
              <select
                value={assignedWard}
                onChange={e => setAssignedWard(e.target.value)}
                className="w-full border border-sky-200 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-sky-400 focus:border-sky-500 outline-none transition appearance-none bg-white cursor-pointer"
              >
                <option value="">Select your ward</option>
                {VADODARA_WARDS.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
          </motion.div>
        )}

        {/* Email */}
        <motion.div
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-4"
        >
          <label className="block text-gray-700 font-medium mb-1 text-left">Email</label>
          <div className="relative">
            <Mail size={18} className="absolute left-3 top-[11px] text-gray-400" />
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full border border-sky-200 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-sky-400 focus:border-sky-500 outline-none transition"
            />
          </div>
        </motion.div>

        {/* Password */}
        <motion.div
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mb-5"
        >
          <label className="block text-gray-700 font-medium mb-1 text-left">Password</label>
          <div className="relative">
            <Lock size={18} className="absolute left-3 top-[11px] text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignUp()}
              placeholder="Enter a password"
              className="w-full border border-sky-200 rounded-lg pl-10 pr-10 py-2 focus:ring-2 focus:ring-sky-400 focus:border-sky-500 outline-none transition"
            />
            <button
              type="button"
              className="absolute right-3 top-[11px] text-gray-500 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </motion.div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-2 rounded-lg font-semibold text-white bg-sky-500 hover:bg-sky-600 shadow-md hover:shadow-lg focus:ring-2 focus:ring-sky-400 transition"
          onClick={handleSignUp}
        >
          Sign Up as {role === 'officer' ? 'Ward Officer' : role === 'admin' ? 'Admin' : 'User'}
        </motion.button>

        {role === 'user' && (
          <>
            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-gray-300" />
              <span className="px-3 text-sm text-gray-500">or</span>
              <div className="flex-1 h-px bg-gray-300" />
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="w-full flex items-center justify-center gap-3 border border-sky-200 rounded-lg py-2 bg-white hover:bg-gray-50 transition"
              onClick={handleGoogleSignUp}
            >
              <FcGoogle size={20} />
              Sign up using Google
            </motion.button>
          </>
        )}

        <p className="text-center mt-6">
          Already have an account?{' '}
          <span
            className="text-sky-500 font-semibold cursor-pointer"
            onClick={() => navigate('/signin')}
          >
            Sign In
          </span>
        </p>
      </motion.div>
    </motion.div>
  )
}

export default SignUp
