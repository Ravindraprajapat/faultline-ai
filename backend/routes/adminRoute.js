import express from 'express'
import { isAuth } from '../middleware/isAuth.js'
import { isAdmin, isAdminOrOfficer } from '../middleware/isAdmin.js'
import {
  getAllReports,
  getWardSummary,
  assignOfficerToWard,
  getWardOfficers,
  getOfficerReports,
  updateReportStatus,
  getOfficers,
  getAdminUsers,
  deleteWardlessReports
} from '../controllers/adminController.js'

const adminRouter = express.Router()

// Admin only
adminRouter.get('/reports', isAuth, isAdmin, getAllReports)
adminRouter.patch('/reports/:id/status', isAuth, isAdmin, updateReportStatus)
adminRouter.get('/ward-summary', isAuth, isAdmin, getWardSummary)
adminRouter.post('/ward-officer', isAuth, isAdmin, assignOfficerToWard)
adminRouter.get('/ward-officers', isAuth, isAdmin, getWardOfficers)
adminRouter.get('/officers', isAuth, isAdmin, getOfficers)
adminRouter.get('/users', isAuth, isAdmin, getAdminUsers)
adminRouter.delete('/reports/wardless', isAuth, isAdmin, deleteWardlessReports)

// Officer only (ward-filtered)
adminRouter.get('/officer/reports', isAuth, isAdminOrOfficer, getOfficerReports)
adminRouter.patch('/officer/reports/:id/status', isAuth, isAdminOrOfficer, updateReportStatus)

export default adminRouter
