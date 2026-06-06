<div align="center">

# ⚡ linq

### **The College-First Event Operating System**

*A unified digital infrastructure for colleges, clubs, and student events.*
*Powered by Next.js 15, Firebase, and AI.*

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Groq AI](https://img.shields.io/badge/AI-Groq%20Llama3-purple?style=for-the-badge)](https://groq.com)

</div>

---

## 🌟 What is linq?

**linq** replaces the chaos of WhatsApp groups, Google Forms, and disconnected spreadsheets with a single, beautifully designed platform. From event discovery to project submissions, ticket scanning to AI-generated social media recaps — linq is the complete operating system for campus life.

---

## 🎭 Role-Based Access Control

linq uses a 5-tier RBAC system. Every user gets a fully tailored experience.

| Role | Who They Are | What They Can Do |
|---|---|---|
| 🎓 **Student** | Registered college student | Discover events, register, check-in via QR, submit feedback, get certificates |
| 🤝 **Club Member** | Part of a club's organizing team | Everything above + analytics, announcements, submission forms, notifications |
| ⭐ **Club Admin** | Club leader | Everything above + create events, manage club members, AI wrap-ups, Wall of Love |
| 🏛️ **College Admin** | Oversees the entire college | Monitor all clubs, campus-wide analytics, global urgent broadcasts |

---

## ✨ Feature Breakdown by Role

### 🎓 Student Features

- **Event Discovery** — Browse all upcoming events in a Netflix-style UI with live search and filters
- **One-Click Registration** — Instantly register for events; registration closes at the set deadline automatically
- **Digital Ticket** — Get a personalized QR code ticket after registering, viewable any time from your profile
- **Attendance Check-in** — Show your QR ticket to be scanned; only scanned attendees can submit projects
- **Live Announcements** — See real-time updates posted by organizers directly on the event page
- **Event Feedback** — Submit star ratings and written feedback after attending; contributes to the Wall of Love
- **Digital Certificates** — Auto-generated personalized certificates for events you attended, downloadable from your profile
- **Team Participation** — For team events: create a team, send email invites to teammates, accept/decline invites
- **Project Submission** — Solo or team-based project submission with deadline enforcement (only for check-in attendees)
- **View Submission** — Review your submitted project links and data at any time after submitting
- **Notification Bell** — Real-time campus-wide and event-specific notifications with unread badge count

---

### 🤝 Club Member Features

Everything a Student has, plus:

- **Submission Form Config** — Design the project submission form for each event (add/remove fields, set deadlines, toggle open/closed)
- **View All Submissions** — See every project submission for an event in a searchable, card-based UI
- **Event Analytics Dashboard** — View attendance stats, registration trends, and feedback scores
- **Post Announcements** — Broadcast live updates to all event attendees via the announcements drawer
- **Notification Broadcaster** — Send `GENERAL`, `URGENT`, or `EVENT` notifications to all students via FAB
- **Attendee List** — Full list of registered and checked-in attendees with CSV export
- **Scan Tickets** — Use the QR scanner to mark attendees as checked-in at the event gate

---

### ⭐ Club Admin Features

Everything a Club Member has, plus:

- **Create Events** — Full event creation wizard: title, description, venue, dates, registration deadline, team settings (min/max size), scope (College/Open)
- **Edit Events** — Modify event details before or during the event
- **End Event** — Officially mark an event as ENDED to unlock feedback collection
- **Generate Certificates** — Bulk-generate personalized attendance certificates for all checked-in attendees
- **AI Magic Wrap-up** ✨ — One click generates platform-optimized **Instagram** and **LinkedIn** recap posts using Llama-3 AI (via Groq), complete with emojis and hashtags
- **Wall of Love** 💖 — A public-facing, animated showcase page with curated feedback quotes and event photos for sponsors and social media
- **Manage Club Members** — Add or remove organizing team members from the club
- **Club Profile** — Dedicated club management page to update club details and manage the team

---

### 🏛️ College Admin Features

- **Institution Dashboard** — Panoramic view of all clubs and their event activity across the college
- **Campus-Wide Analytics** — Total events, total attendees, total certificates issued, and more at a glance
- **Urgent Broadcast** — Send high-priority alerts visible to every student on the platform

---

## 🚀 Killer Features

### 📋 Project Submission System (Fully Custom)
- Club Admins/Members design the submission form — add any field (text or URL), set a deadline, toggle it open/closed
- **Attendance-gated** — Only students who were physically scanned into the event can submit
- **Team submissions** — One submission per team; when one member submits, all other team members instantly see "Project submitted" — no duplicates
- **Solo submissions** — Individual form, tied directly to the student's account
- **Deadline enforcement** — Submission button automatically disables after the deadline passes
- **View Submission** — Both students and organizers can review submitted data at any time in a clean read-only modal

### 👥 Smart Team Management
- **Create Teams** — Form a team directly within the event page
- **Invite by Email** — Send team join requests to other registered students
- **Accept/Decline** — Invited students see pending invites and can accept or decline
- **Registration Deadline Lock** — After the registration deadline, teams are confirmed and locked (no leaving, removing, or new invites)
- **Leader Transfer** — If the team leader wants to leave, they must transfer leadership to another member or disband the team entirely
- **Leave Team** — Members can leave before the registration deadline is confirmed
- **Team Status** — Teams track their completeness status (FORMING → COMPLETE based on min size)

### 🎟️ QR Ticket Scanning
- Real-time QR scanner with visual overlay for fast gate check-ins
- Color-coded status banners — green for success, red for errors, no browser popups
- Manual fallback — enter email directly if the QR doesn't scan
- Duplicate scan detection — shows "Already Scanned" without marking twice
- Auto-syncs attendance to both the event registration and the student's personal profile

### 🤖 Global AI Copilot
- Floating AI chat assistant available on every page
- Context-aware — knows what page you're on and helps you navigate, draft content, or answer questions

### 📢 Real-Time Notification System
- Centralized Bell icon in Navbar with unread count badge
- Three notification tiers: `GENERAL`, `URGENT` (red), `EVENT`
- Floating Broadcaster FAB for admins/members to push instant campus-wide messages
- Per-user read/clear system — users can dismiss individual or all notifications

### 💖 Wall of Love
- Public-facing event recap page with animated scrolling feedback
- Curated quotes from attendees, event memory photos, and impact stats
- Built for sharing with sponsors, college management, and social media

### 🏆 Digital Certificates
- Auto-generated, personalized, beautifully designed certificates
- Tied to physical check-in — only actual attendees get certificates
- Accessible from student profile anytime

### 📱 Mobile-First Premium Design
- **Native App Feel** — Carefully designed mobile layout with sticky bottom navigation bars for all dashboards
- **Fluid Layouts** — Sidebars and horizontal layouts gracefully collapse into stacked mobile grids
- **Premium Aesthetics** — Dark mode out of the box, glassmorphism panels, floating action buttons, and buttery smooth micro-animations
- **Zero Compromises** — Every single administrative tool, analytics dashboard, and project submission flow works perfectly on mobile devices

---

## 💻 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Styling** | Vanilla CSS, CSS Variables, Glassmorphism |
| **Database** | Firebase Firestore (Real-time) |
| **Auth** | Firebase Authentication (Google + Email/Password) |
| **AI** | Groq API — Llama-3-8b-8192 |
| **Icons** | Lucide React |
| **QR Scanner** | @yudiel/react-qr-scanner |

---

## 🛠️ Running Locally

### Prerequisites
- Node.js v18+
- A Firebase project (Auth + Firestore enabled)
- A Groq API key

### 1. Clone the repo
```bash
git clone https://github.com/varsham40/Linq2026.git
cd Linq2026/linq
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment variables
Create a `.env.local` file in the root:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
GROQ_API_KEY=your_groq_api_key
```

### 4. Deploy Firestore Rules
```bash
npx firebase-tools deploy --only firestore
```

### 5. Run the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 📁 Project Structure

```
src/
├── app/
│   ├── dashboard/
│   │   ├── club-admin/        # Club Admin dashboard
│   │   ├── club-member/       # Club Member dashboard
│   │   ├── college-admin/     # College Admin dashboard
│   │   └── student/           # Student dashboard
│   ├── events/
│   │   ├── [eventId]/
│   │   │   ├── page.tsx       # Event detail + announcements
│   │   │   ├── analytics/     # Event analytics page
│   │   │   ├── attendees/     # Attendee list + CSV export
│   │   │   ├── edit/          # Edit event
│   │   │   ├── feedback/      # Submit & view feedback
│   │   │   ├── scan/          # QR attendance scanner
│   │   │   ├── submissions/
│   │   │   │   ├── config/    # Configure submission form
│   │   │   │   └── view/      # View all submissions
│   │   │   └── wall-of-love/  # Public event showcase
│   │   └── create/            # Create new event
│   ├── tickets/               # Student's digital tickets
│   └── profile/               # Student profile + certificates
├── components/
│   ├── TeamManagement.tsx     # Team creation, invites, submission
│   ├── SoloSubmission.tsx     # Solo project submission
│   ├── Navbar.tsx             # Global navigation
│   └── Toast.tsx              # Toast notifications
└── lib/
    ├── firebase.ts            # Firebase config
    ├── auth-context.tsx       # Auth state provider
    └── club-utils.ts          # Utility functions
```

---

<div align="center">

**Built with ❤️ for GDG Hackathon 2026**

*linq — Link your campus.*

</div>
