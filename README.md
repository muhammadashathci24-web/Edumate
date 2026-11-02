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
- **Interests & Personalized Recommendations**: Complete an editable interest profile questionnaire (sports, coding, arts, academic competitions, social impact) and receive explainable upcoming event, hackathon, workshop, and scholarship recommendations with transparent "Why this matches" criteria.
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
- **Opportunity & Events Catalog**: Curate, add, edit, and activate/deactivate campus events, hackathons, sports meets, workshops, and scholarships with department/year eligibility controls.
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

---

## Personalized Opportunities & Event Recommendations

EduMate includes a transparent, explainable recommendation engine connecting students with upcoming extracurricular and academic opportunities.

### 1. Guided Student Interest Questionnaire
Students can customize their interest profile directly from their **Student Dashboard**:
- **Main Interest Areas**: Sports, Coding & Technology, Cultural & Arts, Academic Competitions & Workshops, Entrepreneurship & Social Impact, and Other.
- **Dynamic Subcategories**:
  - *Sports*: Cricket, football, volleyball, basketball, badminton, athletics, kabaddi, table tennis, other.
  - *Coding & Technology*: Web development, AI & machine learning, app development, cybersecurity, robotics, competitive programming, hackathons, other.
  - *Cultural & Arts Activities*: Dance, music, drama, photography, drawing & painting, debate & public speaking, literature, quiz, other.
  - *Academic Competitions & Workshops*: Project exhibitions, paper presentations, technical workshops, quizzes, other.
  - *Entrepreneurship & Social Impact*: Entrepreneurship, volunteering, social-impact events, other.
  - *Custom Interests*: Free-text tags for specialized passions (e.g. drone racing, autonomous robotics, edtech).
- **Location Preference**: Option to select a preferred city (Bengaluru, Mysuru, Mangaluru, etc.) or optionally detect nearest city via browser geolocation permissions without storing exact GPS coordinates.
- **Flexibility**: The questionnaire can be skipped or updated at any time without blocking other app features.

### 2. Transparent Content-Based Recommendation Matching
Recommendations are computed using an explainable matching algorithm:
1. **Filtering**:
   - Excludes inactive opportunities.
   - Excludes events with past registration deadlines or event dates.
   - Enforces department and class year eligibility (e.g. opportunities scoped to AIML Year 3).
   - Validates scholarship prerequisites (e.g. 75%+ assessment marks percentage requirement).
2. **Scoring & Ranking**:
   - **Primary (+10 to +15 pts)**: Matching categories, subcategories, and custom interest tags.
   - **Location Relevance (+6 to +12 pts)**: In-person events matching student's preferred city or on-campus/online events.
   - **Urgency Tie-Breaker (+3 to +5 pts)**: Boosts opportunities with registration deadlines closing within 7–21 days.
3. **Explainable "Why this matches" Criteria**:
   Every card displays human-readable reasons (e.g. *"Matches your topics: AI & Machine Learning, Hackathons"*, *"Happening in your preferred city: Bengaluru"*, *"Eligible for AIML Year 3"*).

### 3. Administrator Opportunity Catalog
Administrators have access to a dedicated **Opportunities & Events Catalog** tab:
- Add new opportunities with category, description, tags, venue, city, event date, registration deadline, and external link.
- Configure target eligibility (all departments vs specific branches; target academic years).
- For scholarships: specify award amounts and minimum academic performance thresholds.
- Toggle active/inactive status to instantly control visibility.

---

## 30 Fictional Sample Student Records & Stable Seed Interests

For development and evaluation, the database includes **exactly 30 student records** across third-year AIML sections A, B, and C:
- **10 students in Section A** (`1EM22AI001` – `1EM22AI010`)
- **10 students in Section B** (`1EM22AI011` – `1EM22AI020`)
- **10 students in Section C** (`1EM22AI021` – `1EM22AI030`)

**Stable Local Interests**:
In local/mock mode, each sample student is initialized with a stable, varied combination of interests across sports, coding, cultural, academic workshops, entrepreneurship, and scholarships. Real student accounts created in production Cloud Firestore start with empty interests until chosen by the student.

---

## Automated Verification & Testing

Run the test suite verifying Firestore rules, security boundaries, and recommendation matching:
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
│   ├── seedData.js         # 30 sample students with stable interests, sample opportunities
│   └── seed.js             # Standalone seed runner
├── src/
│   ├── components/
│   │   ├── Navbar.tsx                          # Persistent user identity, role badge, sign out
│   │   ├── Alert.tsx                           # Accessible feedback notifications
│   │   ├── Modal.tsx                           # Keyboard-accessible modal dialogs
│   │   └── InterestsQuestionnaireModal.tsx     # Multi-step guided interest & location questionnaire
│   ├── contexts/
│   │   └── AuthContext.tsx                     # Authentication, role resolution, status checks
│   ├── pages/
│   │   ├── SignInPage.tsx                      # Sign-in interface (no self-registration)
│   │   ├── admin/
│   │   │   ├── AdminDashboard.tsx              # Student/faculty directory & opportunity catalog
│   │   │   ├── OpportunityFormModal.tsx        # Add / Edit opportunity modal dialog
│   │   │   ├── AddStudentModal.tsx             # Enrollment with USN normalization
│   │   │   ├── EditStudentModal.tsx            # Student updates (USN immutable)
│   │   │   ├── AddFacultyModal.tsx             # Faculty creation & class assignment
│   │   │   ├── EditFacultyModal.tsx            # Faculty updates
│   │   │   └── ManageSectionsModal.tsx         # Section configuration
│   │   ├── faculty/
│   │   │   └── FacultyDashboard.tsx            # Attendance, marks, class assignments
│   │   └── student/
│   │       ├── StudentDashboard.tsx            # Profile, interests, marks, assignments
│   │       ├── RecommendationsTab.tsx          # Personalized opportunity & event recommendation cards
│   │       └── EmptyState.tsx                  # Empty state illustrations
│   ├── lib/
│   │   ├── firebase.ts                         # Client Firebase SDK configuration
│   │   ├── interestConstants.ts                # Canonical categories, subcategories, popular cities
│   │   ├── recommendations.ts                  # Content-based recommendation & eligibility engine
│   │   └── types.ts                            # TypeScript data definitions
│   ├── App.tsx                                 # Role-based route guard
│   ├── main.tsx                                # React entry
│   └── index.css                               # Vanilla CSS design system with reduced-motion support
├── test/
│   ├── rules.test.ts                           # Security rules permissions tests
│   └── recommendations.test.ts                 # Recommendation engine & eligibility tests
├── firestore.rules                             # Production Firestore Security Rules
├── firebase.json                               # Firebase CLI and emulator configuration
├── .env.example                                # Environment variables template
└── package.json                                # Project manifest
```

---

## Important Deployment & GitHub Notes

- **GitHub Collaborators**: If this repository is configured as private on GitHub, team members or collaborators will need to be granted access via **Repository Settings > Collaborators** to clone, view, or pull changes.
- **Zero Secrets Committed**: Firebase service-account private keys, passwords, and sensitive production keys must never be committed to Git. All configuration is read via environment variables (`.env.local`).
- **Live Database Safety**: In live Firebase production, the `seedInMemoryStore()` seeds local/mock memory only and will not overwrite live Firestore student records.
- **Cloud Firestore Indexes**: In production Firestore, simple equality and range queries on `opportunities` (such as `isActive == true`) use automatic single-field indexes. No complex custom composite index is required.
