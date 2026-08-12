import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  MapPin,
  Image as ImageIcon,
  Send,
  Loader2,
  CheckCircle
} from 'lucide-react'
import axios from 'axios'
import Navbar from '../components/Navbar'
import { serverUrl } from '../App'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

/* ---- Extract best ward label from Nominatim address object ---- */
const extractWard = addr => {
  // Try suburb → quarter → neighbourhood → city_district → county → state_district
  const ward =
    addr.suburb ||
    addr.quarter ||
    addr.neighbourhood ||
    addr.city_district ||
    addr.county ||
    addr.state_district ||
    null

  if (!ward) return 'Unknown'

  // Normalise: "Ward 5 - Sayajigunj" style if it already contains "ward"
  return ward
}

const Report = () => {
  const { currenCity } = useSelector(state => state.user)
  const [image, setImage] = useState(null)
  const [location, setLocation] = useState(null) // { latitude, longitude, address, ward }
  const [locLoading, setLocLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleImageChange = e => {
    const file = e.target.files[0]
    if (file) setImage(file)
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported')
      return
    }

    setLocLoading(true)

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords

        try {
          // Reverse geocode using OpenStreetMap Nominatim (free, no API key)
          const { data } = await axios.get(
            `https://nominatim.openstreetmap.org/reverse`,
            {
              params: {
                lat: latitude,
                lon: longitude,
                format: 'json',
                addressdetails: 1
              },
              headers: { 'Accept-Language': 'en' }
            }
          )

          const addr = data.address || {}
          const ward = extractWard(addr)
          const address =
            data.display_name ||
            `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`

          setLocation({ latitude, longitude, address, ward })
        } catch {
          // If reverse geocode fails, still save coords with unknown ward
          setLocation({
            latitude,
            longitude,
            address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            ward: 'Unknown'
          })
        } finally {
          setLocLoading(false)
        }
      },
      () => {
        alert('Location permission denied')
        setLocLoading(false)
      }
    )
  }

  const handleSubmit = async () => {
    if (!image) return alert('Please upload image')
    if (!location) return alert('Please fetch location')

    setLoading(true)
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append('image', image)
      formData.append('latitude', location.latitude)
      formData.append('longitude', location.longitude)
      formData.append('address', location.address)
      formData.append('ward', location.ward)

      await axios.post(`${serverUrl}/report/report-submit/report`, formData, {
        withCredentials: true
      })

      setSuccess(true)
      setImage(null)
      setLocation(null)
      setTimeout(() => {
        setSuccess(false)
        navigate('/track-status')
      }, 1500)
    } catch (error) {
      console.log(error.response)
      console.log(error.response?.data)
      alert(error.response?.data?.message || 'Failed to submit complaint')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className='min-h-screen w-full flex items-center justify-center
                    bg-gradient-to-br from-sky-50 via-white to-sky-100 px-4'
    >
      <Navbar />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className='bg-white w-full max-w-lg rounded-2xl shadow-xl p-8 border border-sky-200'
      >
        <h1 className='text-3xl font-bold text-center text-sky-500 mb-2'>
          Report an Issue
        </h1>

        <p className='text-center text-gray-500 mb-8'>
          Help us improve city infrastructure
        </p>

        {/* Success */}
        {success && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className='flex items-center justify-center gap-2 bg-green-100 text-green-700 p-3 rounded-lg mb-6'
          >
            <CheckCircle size={20} />
            Complaint Submitted Successfully!
          </motion.div>
        )}

        {/* Image Upload */}
        <div className='mb-6'>
          <label className='block text-gray-700 font-medium mb-2'>
            Upload Image
          </label>
          <label
            className='flex flex-col items-center justify-center
                            border-2 border-dashed border-sky-300
                            rounded-xl p-6 cursor-pointer hover:bg-sky-50 transition'
          >
            <ImageIcon size={36} className='text-sky-400 mb-2' />
            <span className='text-sm text-gray-500'>
              {image ? image.name : 'Click to upload image'}
            </span>
            <input
              type='file'
              accept='image/*'
              onChange={handleImageChange}
              className='hidden'
            />
          </label>
        </div>

        {/* Location */}
        <div className='mb-6'>
          <label className='block text-gray-700 font-medium mb-2'>
            {currenCity || 'Location'}
          </label>

          <div className='flex items-center gap-2'>
            <div className='flex-1 border border-sky-200 rounded-lg px-3 py-2 text-sm text-gray-600'>
              {locLoading ? (
                <span className='flex items-center gap-2 text-sky-500'>
                  <Loader2 size={14} className='animate-spin' />
                  Detecting location & ward...
                </span>
              ) : location ? (
                <div>
                  <div className='flex items-center gap-1.5'>
                    <MapPin size={14} className='text-sky-500 flex-shrink-0' />
                    <span className='truncate'>{location.address}</span>
                  </div>
                  {location.ward && location.ward !== 'Unknown' && (
                    <div className='mt-1 inline-flex items-center gap-1 bg-sky-50 text-sky-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-sky-200'>
                      📍 Ward: {location.ward}
                    </div>
                  )}
                </div>
              ) : (
                <span className='flex items-center gap-1.5 text-gray-400'>
                  <MapPin size={14} />
                  Location not selected
                </span>
              )}
            </div>

            <button
              onClick={handleGetLocation}
              disabled={locLoading}
              className='p-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white transition cursor-pointer disabled:opacity-50'
            >
              <MapPin size={18} />
            </button>
          </div>
        </div>

        {/* Submit */}
        <motion.button
          whileHover={!loading && { scale: 1.03 }}
          whileTap={!loading && { scale: 0.97 }}
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full flex items-center justify-center cursor-pointer gap-2
                     text-white font-semibold py-3 rounded-xl shadow-md transition
                     ${
                       loading
                         ? 'bg-sky-300 cursor-not-allowed'
                         : 'bg-sky-500 hover:bg-sky-600'
                     }`}
        >
          {loading ? (
            <>
              <Loader2 className='animate-spin' size={18} />
              Processing...
            </>
          ) : (
            <>
              <Send size={18} />
              Submit Complaint
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  )
}

export default Report
