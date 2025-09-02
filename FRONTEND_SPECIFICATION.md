# Frontend Specification for Computer Laboratory Management System

This document defines the frontend specification for a web application (HTML, CSS, JavaScript, Bootstrap) that operates entirely on the client-side, using IndexedDB for data storage.

---

## 1. General Architecture
- The application is a Single Page Application (SPA) or acts like one, with different views loaded dynamically.
- All data is stored locally in the browser using IndexedDB.
- A JavaScript module (`/js/db.js`) provides a simple asynchronous API to interact with the IndexedDB object stores.
- The backend is only used to serve the static HTML, CSS, and JavaScript files.

---

## 2. Authentication
- A simple, client-side-only login mechanism is implemented in `/js/app.js`.
- It uses a hardcoded user/password for demonstration purposes.
- Upon successful login, user information (username, role) is stored in `localStorage`.
- The application has roles like "Administrator" and "Technician", but enforcement is limited to UI-level visibility changes as there is no secure backend.

---

## 3. Core Modules & Views

### 3.1. Dashboard (`/views/dashboard.html`)
- **Purpose:** Main landing page after login. Provides navigation to other modules.
- **UI Elements:**
  - Welcome message.
  - Navigation bar with links to Computers, Software, and Suppliers.
  - Logout button.
- **Data:** Fetches user information from `localStorage`.

### 3.2. Computers (`/views/computers.html`)
- **Purpose:** CRUD (Create, Read, Update, Delete) for managing computers/workstations.
- **UI Elements:**
  - A table listing all computers with details like Name, Make, Model, Serial Number, Status, and Purchase Date.
  - "Add Computer" button which opens a modal.
  - Edit and Delete buttons for each computer in the table.
- **Data Store:** Interacts with the `computers` object store in IndexedDB via functions in `/js/computers.js`.

### 3.3. Software (`/views/software.html`)
- **Purpose:** CRUD for managing software licenses.
- **UI Elements:**
  - A table listing all software with details like Name, Version, License Key, Expiry Date, and Number of Licenses.
  - "Add Software" button which opens a modal.
  - Edit and Delete buttons for each software entry.
- **Data Store:** Interacts with the `software` object store in IndexedDB via functions in `/js/software.js`.

### 3.4. Suppliers (`/views/suppliers.html`)
- **Purpose:** CRUD for managing suppliers of hardware and software.
- **UI Elements:**
  - A table listing all suppliers with their contact details.
  - "Add Supplier" button which opens a modal.
  - Edit and Delete buttons for each supplier.
- **Data Store:** Interacts with the `suppliers` object store in IndexedDB via functions in `/js/suppliers.js`.

---

## 4. General UI/UX Requirements
- Use Bootstrap for all layouts and components.
- Responsive design for desktop and mobile.
- Use modals for add/edit forms.
- Use `confirm()` for delete operations.
- A consistent navigation bar is present on all pages.

---

## 5. Route Map
| Route | View Purpose |
|-------|--------------|
| /index.html | Login Page |
| /views/register.html | Registration Page |
| /views/dashboard.html | Dashboard |
| /views/computers.html | Manage Computers |
| /views/software.html | Manage Software |
| /views/suppliers.html | Manage Suppliers |

---

## 6. Notes for AI Agent
- The application is frontend-only. There is no data API.
- All data persistence is handled by the IndexedDB wrapper in `/js/db.js`.
- Use the functions `addData`, `getAllData`, `updateData`, and `deleteData` from `db.js` for all data operations.
- Follow the existing structure of using one JavaScript file per view (e.g., `computers.js` for `computers.html`).
- All user authentication is simulated on the client side and is not secure.
