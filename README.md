# Faultline AI

AI-powered citizen infrastructure reporting system for Vadodara City.

## Features
- Role-based authentication (User / Admin / Ward Officer)
- AI-powered damage detection using Google Gemini
- Ward-wise issue tracking and officer assignment
- Real-time map with ward boundary polygons
- Admin dashboard with ward summary and complaint management
- Officer dashboard with ward-filtered complaints and status updates

## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS, React-Leaflet, Framer Motion, Redux
- **Backend:** Node.js, Express, MongoDB, JWT, Cloudinary, Twilio

## Setup

### Backend
```bash
cd backend
npm install
# create .env with required keys (see .env.example)
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables
Create a `.env` file in the `backend/` folder with:
```
PORT=8000
MONGODB_URI=
JWT_SECRET=
EMAIL=
PASS=
MY_CLOUD_NAME=
MY_API_KEY=
MY_CLOUD_SECRET=
GEMINI_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```
