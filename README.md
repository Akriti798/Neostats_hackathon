# CollabWorkers — Collaborative Project Management Platform

A multi-user collaborative project management platform built for the **NeoStats Full Stack Engineering Hackathon**.

CollabWorkers enables teams with different roles (Admin, Project Manager, Team Member, Viewer) to securely manage projects, tasks, team memberships, and discussion comments with server-enforced authorization and optimistic concurrency control for task edits.

---

## Tech Stack

- **Frontend:** React 19, JavaScript, Vite, React Router v7, Native `fetch` API, Custom Modern CSS Design System
- **Backend:** Node.js (v22+), Express.js
- **Database:** MongoDB Community Server (Local on `mongodb://127.0.0.1:27017/neostats_db`)
- **ODM:** Mongoose v8
- **Authentication & Security:** JSON Web Tokens (JWT), `bcryptjs` password hashing, CORS, input validation
- **Concurrency Control:** Optimistic Concurrency Control (OCC) using document versioning with HTTP 409 Conflict detection

---

## Project Structure

```text
hackathon-neostats/
├── README.md                 # Complete documentation and evaluation guide
├── .gitignore                # Excludes node_modules, .env, build output
│
├── backend/
│   ├── package.json          # Express, Mongoose, JWT, bcryptjs, nodemon
│   ├── .env.example          # Template for environment variables
│   ├── .env                  # Local environment configuration (PORT, MONGODB_URI, JWT_SECRET)
│   └── src/
│       ├── config/
│       │   └── db.js         # Mongoose MongoDB connection handler
│       ├── models/
│       │   ├── User.js       # User model with bcrypt pre-save hashing & role enum
│       │   ├── Project.js    # Project model with manager & membership subdocuments
│       │   ├── Task.js       # Task model with version number for OCC
│       │   └── Comment.js    # Task discussion comments model
│       ├── middleware/
│       │   ├── auth.js       # JWT protect and authorize(roles) middleware
│       │   ├── projectAuth.js# Project-level role and membership verification
│       │   └── errorHandler.js# Centralized error handler (400, 401, 403, 404, 409, 500)
│       ├── controllers/
│       │   ├── authController.js    # Login and session validation (/api/auth/me)
│       │   ├── userController.js    # Admin user management (CRUD + deactivate)
│       │   ├── projectController.js # Project CRUD, archive, and membership
│       │   ├── taskController.js    # Task CRUD + atomic HTTP 409 conflict detection
│       │   └── commentController.js # Task comments CRUD
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── userRoutes.js
│       │   ├── projectRoutes.js
│       │   └── taskRoutes.js
│       ├── app.js            # Express app configuration & middleware pipeline
│       ├── server.js         # Server bootstrap and port listener
│       └── seed.js           # Database seeder for demo accounts, projects, and tasks
│
└── frontend/
    ├── package.json          # React, React Router, Vite
    ├── vite.config.js        # Vite config with /api proxy to backend (port 5000)
    ├── index.html
    └── src/
        ├── components/
        │   ├── Navbar.jsx    # Top navigation, role badges, user profile, sign out
        │   ├── ProtectedRoute.jsx # Client-side route guards (auth & role checks)
        │   ├── Modal.jsx     # Accessible dialogs for project/task creation
        │   └── Alert.jsx     # Notifications & status banners
        ├── pages/
        │   ├── Login.jsx     # Real JWT authentication with quick credential filler
        │   ├── Dashboard.jsx # Overview, metrics, and accessible project listings
        │   ├── Projects.jsx  # Project directory, status filters, create/archive/delete
        │   ├── ProjectDetails.jsx # Tabbed workspace (Tasks, Team Members, Overview)
        │   ├── TaskDetails.jsx    # Task editor, HTTP 409 conflict banner, comments
        │   ├── AdminUsers.jsx     # Admin panel for user management & deactivation
        │   └── Profile.jsx   # Current user profile & role permission breakdown
        ├── services/
        │   └── api.js        # Native fetch API client with Bearer token & 409 handling
        ├── context/
        │   └── AuthContext.jsx # Global auth provider (user, token, login, logout)
        ├── App.jsx           # Client-side router configuration
        └── index.css         # Clean enterprise design system (no emoji clutter)
```

---

## Local Setup & Installation

### Prerequisites
- **Node.js**: v22.x or later (`node -v`)
- **npm**: v10.x or later (`npm -v`)
- **MongoDB Community Server**: Installed locally on Windows and running as a service on port `27017`

### Step 1: Clone the Repository
```bash
git clone https://github.com/Akriti798/Neostats_hackathon.git
cd Neostats_hackathon
```

### Step 2: Configure Backend Environment
Navigate to `backend/` and verify `.env` (a `.env.example` is also provided):
```bash
cd backend
```
File `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/neostats_db
JWT_SECRET=neostats_hackathon_super_secret_jwt_key_2026
NODE_ENV=development
```

Install backend dependencies:
```bash
npm install
```

### Step 3: Seed the Database
Populate the database with all 4 roles, sample projects, tasks with versioning, and comments:
```bash
npm run seed
```
*(You will see a success message displaying the demo credentials).*

### Step 4: Configure & Install Frontend
In a new terminal window:
```bash
cd frontend
npm install
```

---

## Running the Application

### 1. Start the Backend API Server
```bash
cd backend
npm run dev
```
The API server starts on **http://localhost:5000**.
- Health Check: `http://localhost:5000/api/health`

### 2. Start the Frontend Application
```bash
cd frontend
npm run dev
```
Open **http://localhost:5173** in your web browser.

---

## Demo Accounts & Evaluator Credentials

The seed script creates 4 real user accounts in MongoDB, representing each required role:

| Role | Email Address | Password | Permissions Summary |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@neostats.com` | `Admin@123` | Full system control: create/delete projects, manage all users, deactivate accounts, view all projects. |
| **Project Manager** | `pm@neostats.com` | `Pm@123` | Manage assigned projects: add/remove team members, assign tasks, change status, create/edit/delete tasks. |
| **Team Member** | `dev@neostats.com` | `Dev@123` | View assigned projects & tasks; update assigned tasks; add comments; change task status. |
| **Viewer** | `viewer@neostats.com` | `Viewer@123` | Strictly read-only access to projects and tasks. Modifying actions return HTTP 403 Forbidden. |

---

## Architecture & Technical Highlights

### 1. Data Models & Relationships (Mongoose)
- **`User`**: Stores `name`, `email` (unique, lowercase), `password` (hashed with `bcryptjs` via pre-save hook), `role`, and `isActive` boolean. Includes `matchPassword()` method.
- **`Project`**: Stores `title`, `description`, `status` (`Active` or `Archived`), `manager` (`ObjectId` ref `User`), and `members` array containing `{ user: ObjectId, role: 'Manager' | 'Member' | 'Viewer' }`.
- **`Task`**: Stores `project` (`ObjectId`), `title`, `description`, `status` (`TODO`, `IN_PROGRESS`, `BLOCKED`, `DONE`), `priority` (`LOW`, `MEDIUM`, `HIGH`), `assignee` (`ObjectId` ref `User`), and numeric **`version`** (default `1`).
- **`Comment`**: Stores `task` (`ObjectId`), `author` (`ObjectId` ref `User`), and `content`.

### 2. Server-Enforced Authorization
Permissions are enforced at the Express API layer via middleware, not merely by hiding UI buttons:
- **`protect`**: Validates the incoming JWT Bearer token in the `Authorization` header, retrieves the user from MongoDB, and confirms their account is active.
- **`authorize(...roles)`**: Restricts global actions (e.g., only `Admin` can create users or delete projects).
- **Project-Level Authorization**: Non-admin users can only view and interact with projects where they are the primary manager or an active team member.
- **Task-Level Authorization**: Team Members can only update tasks assigned to them; Viewers attempting any write operation are rejected with **HTTP 403 Forbidden**.

### 3. Handling Concurrent Task Updates (HTTP 409 Conflict)
To prevent a user from accidentally overwriting newer changes made by another team member:
1. Every task document includes an integer `version` field (starts at `1`).
2. Every `PUT /api/tasks/:id` request requires the expected `version` in the payload.
3. The server executes an atomic conditional update:
   ```javascript
   const updated = await Task.findOneAndUpdate(
     { _id: req.params.id, version: Number(version) },
     { ...updates, $inc: { version: 1 } },
     { new: true }
   );
   ```
4. If another transaction has committed first, the version in MongoDB no longer matches `version`. The update returns `null`, and the server returns:
   - **HTTP 409 Conflict**:
     ```json
     {
       "success": false,
       "isConflict": true,
       "message": "Version conflict: Task was modified by another user. Reload latest version.",
       "currentVersion": 2
     }
     ```
5. The frontend detects the 409 response and renders a warning banner guiding the user to reload the latest state before reapplying their modifications.
6. A **"Simulate Stale Version Update (Test HTTP 409)"** button is included on the task detail page so evaluators can test conflict detection with one click.

---

## API Endpoints Reference

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Server health status |
| `POST` | `/api/auth/login` | Public | Authenticate user & return JWT token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile |
| `GET` | `/api/users` | Admin | List all registered users |
| `POST` | `/api/users` | Admin | Provision a new user account |
| `PUT` | `/api/users/:id` | Admin | Update user name or role |
| `PATCH` | `/api/users/:id/deactivate` | Admin | Deactivate or reactivate an account |
| `GET` | `/api/projects` | Authenticated | Get accessible projects (filtered by membership/role) |
| `POST` | `/api/projects` | Admin, PM | Create a new project workspace |
| `GET` | `/api/projects/:id` | Project Members, Admin | Get project details, manager, and team |
| `PUT` | `/api/projects/:id` | Assigned PM, Admin | Update project title and description |
| `PATCH` | `/api/projects/:id/archive` | Assigned PM, Admin | Archive project (read-only for members) |
| `DELETE` | `/api/projects/:id` | Admin | Delete project and cascade-delete tasks/comments |
| `POST` | `/api/projects/:id/members` | Assigned PM, Admin | Add team member with project-level role |
| `PATCH` | `/api/projects/:id/members/:userId`| Assigned PM, Admin | Update member's project-level role |
| `DELETE` | `/api/projects/:id/members/:userId`| Assigned PM, Admin | Remove member from project |
| `GET` | `/api/projects/:id/tasks` | Project Members, Admin | List tasks for a project |
| `POST` | `/api/projects/:id/tasks` | Assigned PM, Admin | Create task in project |
| `GET` | `/api/tasks/:id` | Project Members, Admin | Get single task details |
| `PUT` | `/api/tasks/:id` | Assignee, PM, Admin | Update task with OCC version check (**HTTP 409**) |
| `DELETE` | `/api/tasks/:id` | Assigned PM, Admin | Delete task |
| `GET` | `/api/tasks/:id/comments` | Project Members, Admin | Get comments on a task |
| `POST` | `/api/tasks/:id/comments` | Project Members, Admin | Post comment on task (Viewers blocked) |
| `DELETE` | `/api/tasks/:id/comments/:commentId` | Author, Admin | Delete comment |
