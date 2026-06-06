# Linq - The Next-Gen Intelligent Campus Ecosystem

Linq is a powerful, role-based campus event management platform designed to unify the entire collegiate ecosystem. From students seeking to build their portfolios, to club admins organizing hackathons, and college administrators requiring comprehensive analytics, Linq handles everything seamlessly in a single, intelligent platform.

## 🚀 Key Features

*   **Role-Based Access Control (RBAC):** Distinct dashboard experiences for Students, Club Members, Club Admins, and College Admins.
*   **Intelligent Event Management:** Create, schedule, and manage global or local campus events with customizable capacities, ticketing, and deadlines.
*   **Smart QR Check-In System:** Frictionless attendance tracking. Students receive unique QR code tickets which organizers scan at the door using built-in web-based scanners.
*   **Team Formation & Management:** Sophisticated system for hackathons and group projects. Form teams, invite members via email, manage roles (Leader/Member), and submit final projects.
*   **Automated Certificate Generation:** Instant creation of cryptographically verifiable certificates for attendees upon event completion, utilizing `jsPDF` and `html2canvas`.
*   **Student Portfolios:** Publicly shareable student profiles that automatically track verified event participation, earned certificates, and accumulated skills.
*   **Linq AI Copilot:** A context-aware campus AI assistant built with the Vercel AI SDK and Groq (LLaMA 3.3), helping students discover personalized events, club recommendations, and navigate campus life.
*   **Real-time Analytics Dashboard:** Visualized data insights for administrators using `recharts`, tracking registrations, turnout rates, and community growth.
*   **Fully Responsive & Stunning UI:** A custom, premium glassmorphism design system powered by CSS and `framer-motion`, perfectly optimized for desktop and mobile devices.

---

## 🛠 Tech Stack

Linq is built entirely on a modern, high-performance web stack:

### **Frontend Framework & UI**
*   **Framework:** [Next.js](https://nextjs.org/) (React 19)
*   **Styling:** Pure CSS with a highly customized responsive "glassmorphism" design system
*   **Animations:** [Framer Motion](https://www.framer.com/motion/) for fluid page transitions and micro-interactions
*   **Icons:** [Lucide React](https://lucide.dev/)
*   **Data Visualization:** [Recharts](https://recharts.org/) for analytics dashboards

### **Backend & Database**
*   **Backend-as-a-Service (BaaS):** [Firebase](https://firebase.google.com/)
*   **Database:** Firebase Firestore (NoSQL Document Database)
*   **Authentication:** Firebase Auth (Email/Password & Google OAuth)
*   **Server Logic:** Firebase Admin SDK & Next.js App Router API Routes

### **AI & Machine Learning**
*   **AI Framework:** [Vercel AI SDK](https://sdk.vercel.ai/)
*   **LLM Providers:** [Groq SDK](https://groq.com/) utilizing `llama-3.3-70b-versatile`
*   **Capabilities:** AI-driven event discovery, chat interface, and natural language recommendations.

### **Core Utilities & Libraries**
*   **QR Codes:** `qrcode` (generation) & `@yudiel/react-qr-scanner` (scanning)
*   **Document Generation:** `jspdf` & `html2canvas` for downloadable certificates
*   **Validation:** `zod`
*   **Markdown:** `react-markdown` for rich AI responses

---

## 💻 Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   A Firebase Project with Authentication and Firestore enabled

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd linq
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root directory and add your Firebase configuration and AI API Keys:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open the App:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```text
linq/
├── src/
│   ├── app/                 # Next.js App Router (Pages & API Routes)
│   │   ├── api/             # Backend API endpoints (e.g., chat, webhooks)
│   │   ├── dashboard/       # Role-based admin & student dashboards
│   │   ├── events/          # Public event pages & check-in scanners
│   │   ├── login/           # Authentication routes
│   │   ├── signup/          # Registration & role selection
│   │   ├── globals.css      # Custom global glassmorphism styling
│   │   └── page.tsx         # Responsive landing page
│   ├── components/          # Reusable React UI Components (AICopilot, Navbar, etc.)
│   ├── lib/                 # Core Utilities & Configurations
│   │   ├── firebase.ts      # Firebase Client SDK Config
│   │   ├── firebase-admin.ts# Firebase Admin Server Config
│   │   └── auth-context.tsx # Global authentication state management
│   └── types/               # TypeScript Interfaces (Event, User, Team, etc.)
├── package.json             # Project dependencies and scripts
└── next.config.mjs          # Next.js configuration
```

---

## 🎨 Design Philosophy
Linq rejects the concept of "boring B2B software." It utilizes vibrant colors, deep blurs, subtle glowing gradients, and fluid physics-based animations to create an experience that feels alive, modern, and engaging for students. It scales seamlessly from ultra-wide desktop monitors down to mobile phones without sacrificing aesthetics.
