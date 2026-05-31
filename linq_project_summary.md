# Linq - Project Overview & Feature Summary

This document provides a comprehensive breakdown of all features, roles, and functionalities currently developed in the **Linq** application. It serves as a baseline to analyze the current state and strategize for the next level.

## 1. Tech Stack
* **Frontend:** Next.js (App Router), React 19
* **Backend & Database:** Firebase Authentication, Firestore (Firebase Admin SDK utilized where needed)
* **Styling:** CSS Modules / Global CSS
* **Utilities:** `recharts` (Analytics), `jspdf` & `html2canvas` (Certificate/Ticket generation), `@yudiel/react-qr-scanner` & `react-qr-code` (QR capabilities)

---

## 2. Authentication & Onboarding Flow
The platform has a robust authentication system built on top of Firebase:
* **Multiple Sign-in Methods:** Supports both Email/Password authentication and Google OAuth (Single Sign-On).
* **Onboarding Enforcement:** Newly registered users are automatically detected. If their profile is incomplete in Firestore, they are redirected to an `/onboarding` route to fill out essential information (College, Branch, Interests, etc.) before accessing the platform.
* **Global Auth Context:** A React Context (`AuthContext`) wraps the application, providing real-time user state, profile data, and loading indicators to all protected routes.

---

## 3. User Roles and Hierarchy
The platform uses a strict role-based architecture designed for college and club ecosystems. The roles defined are:
1. **`platform_admin`**: The highest level of access; manages the entire platform, onboard colleges, etc.
2. **`college_admin`**: Manages a specific college, overseas its clubs, and tracks college-wide events.
3. **`club_admin`**: Students who manage a specific club. They can create events, manage members, and track event registrations/check-ins.
4. **`club_member`**: A recognized member or lead of a specific club.
5. **`student`**: A standard user who can browse colleges, view clubs, register for events, and earn certificates.

---

## 4. Core Modules & Functionalities

### A. College & Club Management
* **Colleges:** Dedicated data models for Colleges (with domains, logos, websites).
* **Clubs:** Clubs are tied to specific colleges. They have social media links, descriptions, and designated `adminIds` (Students managing the club).
* **Whitelisting:** A system exists for whitelisting members via email (e.g., adding Event Leads, Members) to specific clubs.

### B. Event Engine
* **Creation & Scoping:** Events can be created and scoped as either `COLLEGE` (internal) or `GLOBAL` (public). 
* **Custom Registration Fields:** Event creators can add custom questions (Text, Number, Email, Select) to the registration form.
* **Lifecycle:** Events have statuses (`UPCOMING`, `LIVE`, `ENDED`).

### C. Registration & Check-in (Ticketing)
* **Ticketing:** Users can register for events. Registrations are tracked distinctly.
* **QR & Check-in:** The platform includes QR code generation and scanning capabilities, allowing for physical/digital check-ins at event venues. 
* **Statuses:** A user's registration status updates from `REGISTERED` to `ATTENDED` (or `MISSED`).

### D. Certificates & Feedback
* **Automated Certificates:** Includes a `certificate-generator.ts` using Canvas/PDF libraries to auto-generate and distribute certificates to users who successfully attend events.
* **Post-Event Feedback:** Users can submit ratings (1-5) and comments for events they attended.

### E. Dashboard & Analytics
* **Dashboards:** Dedicated views for users (`/dashboard`) and club admins (`/manage-club`).
* **Visualizations:** The inclusion of charting libraries points to the ability to view attendee counts, registration conversions, and club growth metrics.

---

## 5. Potential "Next Level" Enhancements
To scale this platform, consider the following areas:
1. **Advanced Analytics:** Build out the `/manage-club` dashboard with detailed demographic charts (which branches attend the most, etc.).
2. **Push Notifications/Emails:** Integrate SendGrid or Firebase Cloud Messaging to remind users of upcoming events.
3. **Payment Gateway:** If clubs host paid events, integrate Stripe or Razorpay into the ticketing flow.
4. **Social & Gamification:** Add leaderboards for most active students, or allow students to showcase their earned certificates on a public profile.
