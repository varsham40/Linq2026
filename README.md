
  <h1>linq</h1>
  <p><strong>The College-First Operating System</strong></p>
  <p>A unified digital infrastructure for colleges, clubs, and student events. Powered by Next.js, Firebase, and AI.</p>
</div>

<hr />

## 🌟 Overview
**linq** is a next-generation platform designed to solve the chaos of college event management. Rather than juggling WhatsApp groups, Google Forms, and disjointed spreadsheets, `linq` brings College Administrators, Club Leaders, and Students onto a single, beautifully designed platform.

With features ranging from real-time global notifications to AI-powered social media generation, `linq` is more than a dashboard—it is an operating system for campus life.

---

## 🎭 User Roles

The platform uses a sophisticated Role-Based Access Control (RBAC) system:

1. **🎓 Student**: The core user. Can discover events, register, check-in, and leave feedback.
2. **🤝 Club Member**: Part of a club's organizing team. Can view analytics and broadcast notifications.
3. **⭐ Club Admin**: The leader of a club. Can create events, manage members, view deep analytics, generate AI wrap-ups, and manage the "Wall of Love".
4. **🏛️ College Admin**: Oversees the entire college. Can monitor all clubs, view campus-wide analytics, and broadcast global urgent announcements.
5. **⚙️ Platform Admin**: The superuser managing the infrastructure and onboarding colleges.

---

## ✨ Core Features
- **Centralized Event Discovery**: Students can browse all upcoming events across their college in a sleek, Netflix-style UI.
- **Smart Registration & Check-in**: Seamless one-click event registrations with real-time attendee tracking.
- **Role-Based Dashboards**: Customized interfaces depending on the user's role (College Admin overview vs. Student feed).
- **Dark/Light Mode**: First-class support for dynamic themes with premium glassmorphism aesthetics.
- **Real-Time Database**: Powered by Firebase Firestore for instant updates without refreshing.

---

## 🚀 Special / Killer Features

### 1. 📢 Global Notifications & Broadcaster
- A centralized "Bell" notification hub in the Navbar.
- **Floating Broadcaster:** Admins and Club Members have access to a Floating Action Button (FAB) to instantly broadcast `GENERAL`, `URGENT`, or `EVENT` announcements to all students.
- **Smart Unread System:** Calculates unread badges locally. Users can clear individual notifications or sweep them all, keeping their feed clean while retaining global data.

### 2. 💖 The "Wall of Love" (Attendee Feedback)
- A dedicated, public-facing showcase for an event's success.
- Displays a beautifully animated "Hall of Fame", scrolling feedback boxes, and event highlights.
- Allows event organizers to showcase exactly how much impact their event had.

### 3. ✨ AI Magic Wrap-up Builder
- Event analytics are boring. `linq` makes them viral.
- By clicking "Generate AI Wrap-up", the platform sends the event's attendance data, title, and feedback to a powerful LLM (Llama-3 via Groq).
- Instantly generates highly engaging, platform-optimized **Instagram** and **LinkedIn** recap posts, complete with emojis, hashtags, and a "Copy" button.

### 4. 🤖 Global AI Copilot
- A floating chat assistant available on every page.
- Context-aware: It knows what page you are on and helps you navigate the platform, answer questions, or draft event descriptions.

---

## 📖 User Manual (How to Use)

### For Students
1. **Sign Up/Login**: Create an account using Google Auth or Email. 
2. **Discover**: Browse the home page for upcoming events. 
3. **Register**: Click on an event to view details and hit "Register".
4. **Notifications**: Keep an eye on the Bell icon in the top right for important campus announcements.

### For Club Admins
1. **Dashboard**: Navigate to the `Dashboard`. You will automatically be routed to the Club Admin view.
2. **Create Event**: Click "Create Event" to set up a new hackathon, workshop, or seminar.
3. **Broadcast**: Click the purple Megaphone icon in the bottom right to send a campus-wide push notification.
4. **Analytics & AI**: After an event ends, visit the event's `Analytics` page. View your stats, and click **"Generate AI Wrap-up ✨"** to get your social media posts written for you!
5. **Wall of Love**: Share the link to the event's Wall of Love to show off your success to sponsors and the college.

---

## 💻 Technical Stack
- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Pure Vanilla CSS, CSS Variables, Glassmorphism
- **Backend/Database**: Firebase (Authentication, Firestore Database)
- **AI Integration**: Groq API (Llama-3-8b-8192)
- **Icons**: Lucide React

---

## 🛠️ How to Run Locally

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- A Firebase Project (with Auth and Firestore enabled)
- A Groq API Key (for the AI features)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/linq.git
cd linq
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env.local` file in the root directory and add your Firebase and Groq keys:
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
To ensure the app can read/write data properly, deploy the local `firestore.rules`:
```bash
npx firebase-tools deploy --only firestore
```

### 5. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the app running!
