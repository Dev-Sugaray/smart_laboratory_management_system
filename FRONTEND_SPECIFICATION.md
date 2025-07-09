# Frontend Specification for Smart Laboratory Management System

This document defines the frontend specification for building a web application (HTML, CSS, JavaScript, Bootstrap) that interfaces with the backend API. It includes all necessary endpoints, views, routes, and UI/UX requirements for an AI agent or developer to implement the frontend.

---

## 1. Authentication & User Management

### 1.1. Login Page (`/login`)
- **Purpose:** User authentication.
- **UI Elements:**
  - Username and password fields
  - Login button
  - Link to registration page
- **API:**
  - `POST /api/login` (returns JWT token)
- **On Success:** Store JWT in localStorage/sessionStorage, redirect to dashboard.
- **On Failure:** Show error message.

### 1.2. Registration Page (`/register`)
- **Purpose:** New user registration.
- **UI Elements:**
  - Username, password, email, full name fields
  - Register button
  - Link to login page
- **API:**
  - `POST /api/register`
- **On Success:** Redirect to login page with success message.
- **On Failure:** Show error message.

### 1.3. Profile Page (`/profile`)
- **Purpose:** View and edit user profile.
- **UI Elements:**
  - Display username, email, full name, role
  - Edit email/full name
  - Save changes button
- **API:**
  - `GET /api/profile`
  - `PUT /api/profile`
- **On Success:** Show updated info.
- **On Failure:** Show error message.

---

## 2. Dashboard (`/dashboard`)
- **Purpose:** Main landing page after login. Shows quick stats, navigation to modules.
- **UI Elements:**
  - Summary cards (samples, experiments, tests, etc.)
  - Navigation links to all modules
  - Logout button
- **API:**
  - Use relevant endpoints to fetch summary counts (e.g., `/api/samples?limit=1`, `/api/experiments`, etc.)

---

## 3. User Management (Admin Only)
### 3.1. Users List (`/admin/users`)
- **Purpose:** View all users (admin only).
- **UI Elements:**
  - Table of users (username, email, full name, role)
- **API:**
  - `GET /api/admin/users`

---

## 4. Sample Management
### 4.1. Sample Types (`/sample-types`)
- **Purpose:** CRUD for sample types.
- **UI Elements:**
  - List, add, edit, delete sample types
- **API:**
  - `GET /api/sample-types`
  - `POST /api/sample-types`
  - `GET /api/sample-types/:id`
  - `PUT /api/sample-types/:id`
  - `DELETE /api/sample-types/:id`

### 4.2. Sources (`/sources`)
- **Purpose:** CRUD for sample sources.
- **UI Elements:**
  - List, add, edit, delete sources
- **API:**
  - `GET /api/sources`
  - `POST /api/sources`
  - `GET /api/sources/:id`
  - `PUT /api/sources/:id`
  - `DELETE /api/sources/:id`

### 4.3. Storage Locations (`/storage-locations`)
- **Purpose:** CRUD for storage locations.
- **UI Elements:**
  - List, add, edit, delete storage locations
- **API:**
  - `GET /api/storage-locations`
  - `POST /api/storage-locations`
  - `GET /api/storage-locations/:id`
  - `PUT /api/storage-locations/:id`
  - `DELETE /api/storage-locations/:id`

### 4.4. Samples (`/samples`)
- **Purpose:** Register, view, update, and manage samples.
- **UI Elements:**
  - List of samples (with pagination)
  - Register new sample form
  - View sample details
  - Update status/location
  - View barcode, lifecycle, chain of custody
- **API:**
  - `POST /api/samples/register`
  - `GET /api/samples`
  - `GET /api/samples/:id`
  - `PUT /api/samples/:id/status`
  - `GET /api/samples/:id/barcode`
  - `GET /api/samples/:id/lifecycle`
  - `GET /api/samples/:id/chainofcustody`
  - `POST /api/samples/:id/chainofcustody`

---

## 5. Experiment Management
### 5.1. Experiments (`/experiments`)
- **Purpose:** CRUD for experiments, manage associated tests.
- **UI Elements:**
  - List, add, edit, delete experiments
  - View experiment details
  - Add/remove tests to/from experiment
- **API:**
  - `POST /api/experiments`
  - `GET /api/experiments`
  - `GET /api/experiments/:id`
  - `PUT /api/experiments/:id`
  - `DELETE /api/experiments/:id`
  - `POST /api/experiments/:id/tests`
  - `DELETE /api/experiments/:id/tests/:test_id`
  - `GET /api/experiments/:id/tests`

---

## 6. Test Definitions
### 6.1. Tests (`/tests`)
- **Purpose:** CRUD for test definitions.
- **UI Elements:**
  - List, add, edit, delete test definitions
  - View test details
- **API:**
  - `POST /api/tests`
  - `GET /api/tests`
  - `GET /api/tests/:id`
  - `PUT /api/tests/:id`
  - `DELETE /api/tests/:id`

---

## 7. Sample Testing
### 7.1. Request Tests for Sample (`/samples/:id/request-tests`)
- **Purpose:** Request tests for a sample.
- **UI Elements:**
  - Select tests, assign to sample
- **API:**
  - `POST /api/samples/:sample_id/tests`

### 7.2. Batch Request Tests (`/samples/batch-request-tests`)
- **Purpose:** Request tests for multiple samples.
- **UI Elements:**
  - Select samples and tests
- **API:**
  - `POST /api/samples/batch-request-tests`

### 7.3. View Sample Test Runs (`/samples/:id/tests`)
- **Purpose:** View all test runs for a sample.
- **UI Elements:**
  - List of test runs, status, results
- **API:**
  - `GET /api/samples/:sample_id/tests`

### 7.4. View/Edit Sample Test Entry (`/sample-tests/:id`)
- **Purpose:** View and update a specific sample test entry.
- **UI Elements:**
  - Test details, status, results, assignment, notes
  - Edit form for authorized users
- **API:**
  - `GET /api/sample-tests/:id`
  - `PUT /api/sample-tests/:id`
  - `DELETE /api/sample-tests/:id`

### 7.5. All Sample Test Runs (`/sample-tests`)
- **Purpose:** View all sample test runs (with filters).
- **UI Elements:**
  - List with filters (status, test, sample, user)
- **API:**
  - `GET /api/sample-tests`

---

## 8. General UI/UX Requirements
- Use Bootstrap for all layouts and components.
- Responsive design for desktop and mobile.
- Use modals for add/edit/delete confirmations.
- Use toasts/alerts for success/error messages.
- Navigation bar with links to all main modules.
- Protect routes based on authentication and role (hide admin/user-only pages).
- Store JWT securely and attach as Bearer token in all API requests.
- Handle 401/403 errors by redirecting to login or showing permission denied.

---

## 9. Example Route Map
| Route | View Purpose |
|-------|--------------|
| /login | Login |
| /register | Register |
| /dashboard | Dashboard |
| /profile | Profile |
| /admin/users | User Management (Admin) |
| /sample-types | Sample Types CRUD |
| /sources | Sources CRUD |
| /storage-locations | Storage Locations CRUD |
| /samples | Samples List/Register |
| /samples/:id | Sample Details |
| /samples/:id/request-tests | Request Tests for Sample |
| /samples/batch-request-tests | Batch Request Tests |
| /samples/:id/tests | Sample Test Runs |
| /experiments | Experiments CRUD |
| /experiments/:id | Experiment Details |
| /tests | Test Definitions CRUD |
| /tests/:id | Test Definition Details |
| /sample-tests | All Sample Test Runs |
| /sample-tests/:id | Sample Test Entry Details/Edit |

---

## 10. Notes for AI Agent
- All endpoints require JWT authentication except `/api/login` and `/api/register`.
- Use fetch/AJAX for all API calls.
- Use Bootstrap components for tables, forms, modals, navbars, alerts, etc.
- Use localStorage/sessionStorage for JWT.
- Implement role-based UI (admin, researcher, etc.).
- Follow RESTful navigation and error handling best practices.

---

*This document is sufficient for an AI agent or developer to generate a complete frontend for the backend API described. For any new backend endpoints, update this document accordingly.*
