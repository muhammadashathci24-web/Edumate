# EduMate - Student Support & Academic Portal

EduMate is a clean, accessible, role-based student support web application built with **React**, **TypeScript**, **Vite**, **Firebase Authentication**, **Cloud Firestore**, and **Firebase Admin SDK**.

---

## Key Features & Roles

The application provides three distinct role-based interfaces with strict security boundaries:

### 1. Student Portal
- **Profile Overview**: View registered name, University Seat Number (USN), college email, phone number, department, year, and section.
- **Class Assignments**: View active assignments published by faculty for the student's assigned class section, including due dates and guidelines.
- **Attendance Records**: View session-by-session attendance history and cumulative attendance percentage.
- **Marks & Evaluations**: View internal assessment scores, maximum marks, and distinction/performance badges.
- **Strict Read-Only Enforcement**: Students cannot modify their USN, role, attendance, marks, or assignment records.

### 2. Faculty Portal
- **Class Allocation Isolation**: Faculty can only view and manage the specific class sections assigned to them by administration.
- **Class Section Switcher**: High-visibility selector indicating which class section is currently active.
- **Student Roll Call**: View enrolled students in the active section.
- **Record Attendance**: Log attendance for sessions with "Mark All Present" / "Mark All Absent" toggles and persistence.
- **Record Marks**: Enter assessment titles, maximum marks, and scores for each student with input range validation.
- **Create Assignments**: Publish assignments with title, due date, and guidelines scoped directly to the selected class.

### 3. Administrative Dashboard
- **Directory Management**: Directory of all enrolled students and faculty members with search and multi-attribute filters (Department, Year, Section, Status).
- **Secure Account Provisioning**: Server-side user creation via Firebase Admin SDK. Browser code never creates Auth users directly or assigns roles.
- **USN Uniqueness Enforcement**: Normalized USN (uppercase, trimmed) enforced in database transactions to prevent duplicates.
- **Class Section Settings**: Dynamic configuration of available section letters per department and year (years 1–4, departments: AIML, CSE, IS, MECH, EC, Robotics).
- **Account Control**: Instantly enable or disable student and faculty login access.

---

## Security Architecture

- **No Public Registration**: Self-registration is completely disabled. Accounts must be provisioned by the college administration.
- **Zero Plaintext Passwords**: Passwords are never stored in Firestore documents. Account creation generates secure first-time password reset links or temporary credentials.
- **Role Tampering Protection**: User roles are verified server-side and enforced via Firestore Security Rules. Role values submitted by the browser are never trusted.
- **Firestore Security Rules**: Rules enforce that students only read their own data and class assignments; faculty can only read/write records for their assigned sections; admins manage records; unauthenticated access is rejected.
- **Secrets Management**: Service account keys and Firebase Admin credentials are kept exclusively on the server and are excluded via `.gitignore`.

---

## 30 Fictional Sample Student Records (Demo)

For development and evaluation, the database includes **exactly 30 fictional student records** for third-year AIML students:
- **10 students in Section A** (`1EM22AI001` – `1EM22AI010`)
- **10 students in Section B** (`1EM22AI011` – `1EM22AI020`)
- **10 students in Section C** (`1EM22AI021` – `1EM22AI030`)

All names, USNs, and credentials are completely fictional and clearly marked with demo tags.

### Demo Credentials for Local Testing

| Role | Email | Password | Scope / Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@college.edu` | `Demo@12345` | System Administrator (Full Directory & Settings) |
| **Faculty 1** | `faculty.aiml1@college.edu` | `Demo@12345` | Dr. Alan Turing (Assigned: AIML 3-A & 3-B) |
| **Faculty 2** | `faculty.aiml2@college.edu` | `Demo@12345` | Prof. Ada Lovelace (Assigned: AIML 3-C) |
| **Student** | `aarav.demo@college.edu` | `Demo@12345` | Aarav Sharma (USN: `1EM22AI001`, AIML 3-A) |
| **Student** | `kabir.demo@college.edu` | `Demo@12345` | Kabir Deshmukh (USN: `1EM22AI011`, AIML 3-B) |
| **Student** | `varun.demo@college.edu` | `Demo@12345` | Varun Saxena (USN: `1EM22AI021`, AIML 3-C) |

*A "Demo Quick Fill" panel is also available on the sign-in screen for one-click testing.*

---

## Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ (tested on Node v24)
- npm v9+

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/muhammadashathci24-web/Edumate.git
cd Edumate
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
*(On Windows PowerShell: `Copy-Item .env.example .env.local`)*

The application works out of the box in offline/mock demo mode. When you are ready to connect to a live Firebase project or the Firebase Emulator Suite, populate the placeholders in `.env.local`:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Run the Development Server
Start both the backend Admin SDK server (port 5000) and the Vite frontend (port 3000) concurrently:
```bash
npm run dev
```

Open your browser at **`http://localhost:3000`**.

---

## Running with Firebase Emulator Suite (Optional)

If you prefer using the local Firebase Emulator Suite:
1. Ensure Java (JRE 11+) is installed.
2. In a separate terminal, start the emulators:
   ```bash
   npx firebase emulators:start
   ```
   This will start:
   - **Auth Emulator**: `localhost:9099`
   - **Firestore Emulator**: `localhost:8080`
   - **Emulator UI**: `localhost:4000`
3. In `.env.local`, set:
   ```env
   VITE_USE_FIREBASE_EMULATOR=true
   USE_EMULATOR=true
   ```
4. Start EduMate:
   ```bash
   npm run dev
   ```

---

## Creating the First Admin Securely

To bootstrap an administrator account in a production Firebase environment:

1. In the [Firebase Console](https://console.firebase.google.com/):
   - Go to **Authentication** > **Users** > **Add User**.
   - Create an admin user with their official college email and a strong password. Note the generated `UID`.
2. Go to **Firestore Database**:
   - Create a document in the `users` collection with the document ID set to the user's `UID`:
     ```json
     {
       "uid": "<USER_UID>",
       "name": "College Administrator",
       "email": "admin@college.edu",
       "role": "admin",
       "status": "active",
       "createdAt": "2026-10-23T00:00:00.000Z"
     }
     ```
3. Once created, the administrator can sign in and begin provisioning faculty and student accounts through the Admin interface.

---

## Automated Verification & Testing

Run the security rules and access boundary test suite:
```bash
npm run test
```

Build the production bundle:
```bash
npm run build
```

---

## Project Structure

```
Edumate/
├── server/
│   ├── index.js            # Express server & Firebase Admin SDK endpoints
│   ├── firebaseAdmin.js    # Firebase Admin SDK initialization & fallback engine
│   ├── seedData.js         # 30 fictional student records, demo faculty & admin
│   └── seed.js             # Standalone seed runner
├── src/
│   ├── components/
│   │   ├── Navbar.tsx      # Persistent user identity, role badge, sign out
│   │   ├── Alert.tsx       # Accessible feedback notifications
│   │   └── Modal.tsx       # Keyboard-accessible modal dialogs
│   ├── contexts/
│   │   └── AuthContext.tsx # Authentication, role resolution, status checks
│   ├── pages/
│   │   ├── SignInPage.tsx  # Sign-in interface (no self-registration)
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx       # Student & faculty directory, filters
│   │   │   ├── AddStudentModal.tsx      # Enrollment with USN normalization
│   │   │   ├── EditStudentModal.tsx     # Student updates (USN immutable)
│   │   │   ├── AddFacultyModal.tsx      # Faculty creation & class assignment
│   │   │   ├── EditFacultyModal.tsx     # Faculty updates
│   │   │   └── ManageSectionsModal.tsx  # Section configuration
│   │   ├── faculty/
│   │   │   └── FacultyDashboard.tsx     # Attendance, marks, class assignments
│   │   └── student/
│   │       ├── StudentDashboard.tsx     # Profile, attendance, marks, assignments
│   │       └── EmptyState.tsx           # Empty state illustrations
│   ├── lib/
│   │   ├── firebase.ts     # Client Firebase SDK configuration
│   │   └── types.ts        # TypeScript data definitions
│   ├── App.tsx             # Role-based route guard
│   ├── main.tsx            # React entry
│   └── index.css           # Vanilla CSS design system with reduced-motion support
├── test/
│   └── rules.test.ts       # 18 security rules permissions tests
├── firestore.rules         # Production Firestore Security Rules
├── firebase.json           # Firebase CLI and emulator configuration
├── .env.example            # Environment variables template
└── package.json            # Project manifest
```

---

## Demo-Only Limitations & Production Notes

- **Offline / Mock Fallback Engine**: If Firebase credentials are not yet set in `.env.local`, EduMate runs using an in-memory database initialized with the 30 fictional sample records. When connected to a live Firebase project, it automatically uses Cloud Firestore and Firebase Auth.
- **Demo Passwords**: All sample passwords (`Demo@12345`) are documented strictly for local development and must never be deployed to production.
- **Email Service**: In production, connect an SMTP service or Firebase Extensions (e.g. *Trigger Email with SendGrid*) to deliver the generated password-reset links to newly enrolled students and faculty.
