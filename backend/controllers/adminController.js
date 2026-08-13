import Report from '../model/Report.js'
import User from '../model/User.js'
import WardOfficer from '../model/WardOfficer.js'
import Ward from '../model/Ward.js'
import { sendComplaintResolvedNotification } from '../utils/notificationService.js'

// Admin / Officer: Get all stored Wards from MongoDB with GeoJSON geometry
export const getWards = async (req, res) => {
  try {
    const wards = await Ward.find().sort({ wardNumber: 1 })
    res.status(200).json({ success: true, wards })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: get ALL reports
export const getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('reportedBy', 'name email mobile')
      .populate('assignedTo', 'name email assignedWard')
      .sort({ createdAt: -1 })

    res.status(200).json({ success: true, reports })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: get ward summary — each ward with its officer and issue counts
export const getWardSummary = async (req, res) => {
  try {
    // All ward-officer mappings
    const wardOfficers = await WardOfficer.find().populate('officer', 'name email assignedWard')

    // All reports grouped by ward
    const reports = await Report.find({ 'location.ward': { $exists: true, $ne: null, $ne: '' } })
      .select('location.ward status')

    // Build ward map
    const wardMap = {}
    reports.forEach(r => {
      const w = r.location?.ward
      if (!w) return
      if (!wardMap[w]) wardMap[w] = { total: 0, pending: 0, inProgress: 0, resolved: 0 }
      wardMap[w].total++
      if (r.status === 'PENDING') wardMap[w].pending++
      else if (r.status === 'IN_PROGRESS') wardMap[w].inProgress++
      else if (r.status === 'RESOLVED') wardMap[w].resolved++
    })

    // Merge with officer assignments
    const result = Object.entries(wardMap).map(([ward, counts]) => {
      const mapping = wardOfficers.find(wo => {
        const woWard = wo.ward
        const woSuburb = woWard.includes(' - ') ? woWard.split(' - ').slice(1).join(' - ').trim() : woWard
        return woWard === ward ||
          ward.toLowerCase().includes(woSuburb.toLowerCase()) ||
          woSuburb.toLowerCase().includes(ward.toLowerCase())
      })
      return {
        ward,
        officer: mapping?.officer || null,
        wardOfficerId: mapping?._id || null,
        ...counts
      }
    }).sort((a, b) => (b.pending + b.inProgress) - (a.pending + a.inProgress))

    res.status(200).json({ success: true, wards: result })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: assign officer to a ward (stored in WardOfficer collection)
export const assignOfficerToWard = async (req, res) => {
  try {
    const { ward, officerId } = req.body

    if (!ward) return res.status(400).json({ message: 'Ward is required' })

    if (officerId) {
      const officer = await User.findById(officerId)
      if (!officer || officer.role !== 'officer') {
        return res.status(400).json({ message: 'Invalid officer' })
      }
      // Clear this officer from any previous ward mapping
      await WardOfficer.updateMany(
        { officer: officerId, ward: { $ne: ward } },
        { officer: null }
      )
      // Update officer's assignedWard to match
      await User.findByIdAndUpdate(officerId, { assignedWard: ward })
    }

    // Upsert: create or update the ward-officer mapping for this ward
    const mapping = await WardOfficer.findOneAndUpdate(
      { ward },
      { officer: officerId || null },
      { upsert: true, new: true }
    ).populate('officer', 'name email assignedWard')

    res.status(200).json({ success: true, mapping })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: get all ward-officer mappings
export const getWardOfficers = async (req, res) => {
  try {
    const mappings = await WardOfficer.find().populate('officer', 'name email assignedWard')
    res.status(200).json({ success: true, mappings })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Officer: get only their ward's reports using WardOfficer mapping
export const getOfficerReports = async (req, res) => {
  try {
    const officer = req.user || (await User.findById(req.userId))

    if (!officer || (officer.role !== 'officer' && officer.role !== 'admin')) {
      return res.status(403).json({ message: 'Officer or Admin access required' })
    }

    // Find ward assigned to this officer via WardOfficer mapping
    const mapping = await WardOfficer.findOne({ officer: officer._id })

    // Fallback to officer's assignedWard field if no mapping found
    const wardFull = mapping?.ward || officer.assignedWard

    if (!wardFull) {
      return res.status(200).json({ success: true, reports: [], ward: '' })
    }

    // Extract suburb part for flexible matching
    const wardSuburb = wardFull.includes(' - ')
      ? wardFull.split(' - ').slice(1).join(' - ').trim()
      : wardFull.trim()

    const reports = await Report.find({
      $or: [
        { 'location.ward': wardFull },
        { 'location.ward': wardSuburb },
        { 'location.ward': { $regex: wardSuburb, $options: 'i' } },
        { 'location.ward': { $regex: wardFull, $options: 'i' } }
      ]
    })
      .populate('reportedBy', 'name email mobile')
      .populate('assignedTo', 'name email assignedWard')
      .sort({ createdAt: -1 })

    res.status(200).json({ success: true, reports, ward: wardFull })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: update report status
export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    const existingReport = await Report.findById(id)
    if (!existingReport) return res.status(404).json({ message: 'Report not found' })

    const isNewlyResolved = status === 'RESOLVED' && existingReport.status !== 'RESOLVED'

    const report = await Report.findByIdAndUpdate(id, { status }, { new: true })
      .populate('reportedBy', 'name email mobile')
      .populate('assignedTo', 'name email assignedWard')

    // Trigger Resolution Notification (Twilio + Nodemailer) if newly resolved
    if (isNewlyResolved && report?.reportedBy) {
      sendComplaintResolvedNotification({ user: report.reportedBy, report }).catch(err => {
        console.error('Non-blocking resolution notification error:', err)
      })
    }

    res.status(200).json({ success: true, report })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: get all officers list
export const getOfficers = async (req, res) => {
  try {
    const officers = await User.find({ role: 'officer' }).select('name email assignedWard')
    res.status(200).json({ success: true, officers })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: get all admin users
export const getAdminUsers = async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('name email')
    res.status(200).json({ success: true, admins })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Admin: delete all reports that have no ward (cleanup)
export const deleteWardlessReports = async (req, res) => {
  try {
    const result = await Report.deleteMany({
      $or: [
        { 'location.ward': { $exists: false } },
        { 'location.ward': null },
        { 'location.ward': '' },
        { 'location.ward': 'Unknown' }
      ]
    })
    res.status(200).json({ success: true, deleted: result.deletedCount })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
