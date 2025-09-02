# Project Report: Computer Laboratory Management System

## 1. Introduction

This report details the refactoring of a web application from a chemical Laboratory Information Management System (LIMS) to a Computer Laboratory Management System. The primary objective was to pivot the application's purpose, logic, and user interface to manage the assets of a computer lab, such as workstations, software licenses, and suppliers.

The original application was a full-stack system with a Node.js backend API and a database. The refactoring effort transformed it into a purely client-side application where all data is stored and managed locally in the user's browser via IndexedDB. The backend's role is now limited to serving the static HTML, CSS, and JavaScript files.

This document covers the methodology of the refactoring, the final design and implementation, and the results of the project.

## 2. Methodology

The refactoring methodology involved a complete overhaul of the existing codebase. The key phases were:

1.  **Requirement Analysis:** The first step was to redefine the core requirements. This involved mapping the old concepts (e.g., "Instruments", "Reagents") to new ones ("Computers", "Software") and identifying which features to keep, rename, or remove entirely.
2.  **Architecture Pivot:** The decision was made to move from a full-stack architecture to a client-side-only architecture. This dramatically simplified the system by removing the need for a backend database, API routes, and complex authentication logic.
3.  **Frontend Refactoring:** This was the main part of the work. It involved:
    *   **Updating the Data Layer:** Modifying the IndexedDB schema to support the new data models (`computers`, `software`, `suppliers`).
    *   **Updating the UI:** Rewriting HTML views to reflect the new purpose, including changes to navigation, titles, forms, and tables.
    *   **Updating the Logic:** Rewriting the client-side JavaScript to perform CRUD operations on the new IndexedDB object stores.
4.  **Cleanup and Documentation:** The final phase involved deleting all obsolete backend files (routes, tests, database scripts) and updating the documentation to describe the new system.

## 3. Design and Implementation

### 3.1 Design

The final system is designed as a client-side, single-page application (SPA).

-   **Technology Stack**: The application uses plain HTML, JavaScript (ES6 Modules), and the Bootstrap 5 CSS framework. There is no frontend framework like Vue or React. A simple Express.js server is used to serve the static files, as configured in `vercel.json` for deployment.
-   **Data Storage**: All application data is stored in the browser's IndexedDB. A wrapper module in `/js/db.js` provides a simple promise-based API for database operations (`addData`, `getAllData`, etc.), abstracting away the complexities of IndexedDB.
-   **Application Structure**: The code is organized by feature. Each primary feature (Computers, Software, Suppliers) has its own HTML view in `/views` and a corresponding JavaScript file in `/js` that contains the logic for that view.

### 3.2 Implementation

The implementation focused on creating a user-friendly interface for managing lab assets.

-   **Core Features:**
    *   **Computer Management:** Users can add, view, edit, and delete computer workstations. The data includes name, make, model, serial number, purchase date, and status.
    *   **Software Management:** Users can track software licenses, including software name, version, license key, expiry date, and the number of available licenses.
    *   **Supplier Management:** Users can maintain a list of suppliers for hardware and software, including contact information.
-   **Authentication:** The application features a simulated, client-side-only login system for demonstration purposes. It does not provide real security as there is no backend to enforce it.

### 3.3 Results

The refactoring project successfully achieved its main goal: transforming the application into a functional Computer Laboratory Management System.

-   All traces of the old chemical lab theme have been removed from the user interface and the client-side code.
-   The application now correctly performs CRUD operations for computers, software, and suppliers using IndexedDB for persistence.
-   The codebase has been significantly simplified by the removal of the entire backend API and database, leaving only a clean, static frontend application.
-   All supporting documentation has been updated to reflect the new purpose and architecture of the system.

## 4. Conclusion

This project demonstrates a successful pivot of a web application's core purpose. By moving to a client-side architecture, the system was simplified while still providing the necessary functionality for managing a small computer lab. The final application is easy to understand, deploy, and maintain.

Potential areas for future work could include:
-   **User and Role Management:** Implementing a proper backend service to handle secure user authentication and role-based access control.
-   **Network Integration:** Adding features to ping computers to check their network status.
-   **Data Import/Export:** Allowing users to import or export their inventory data as CSV files.
-   **Scheduling:** Re-introducing a scheduling feature to allow users to book time on specific computers.
