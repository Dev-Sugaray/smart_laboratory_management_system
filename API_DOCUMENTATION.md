# API Documentation

This document provides details about the backend API endpoints.

## User Authentication Endpoints

### `POST /api/register`
Registers a new user.

*   **Request Body:**
    *   `username` (string, required): The desired username.
    *   `password` (string, required): The user's password.
    *   `email` (string, required): The user's email address.
    *   `full_name` (string, required): The user's full name.
*   **Success Response (201 Created):**
    ```json
    {
      "message": "User registered successfully.",
      "userId": 123
    }
    ```
    *(Note: `userId` is returned by the current backend implementation)*
*   **Error Responses:**
    *   `400 Bad Request`: If any required fields are missing or input is malformed.
        ```json
        { "error": "All fields are required (username, password, email, full_name)." }
        ```
    *   `409 Conflict`: If the username or email already exists.
        ```json
        { "error": "Username already exists." }
        ```
        ```json
        { "error": "Email already exists." }
        ```
    *   `500 Internal Server Error`: If there's a server-side issue.
        ```json
        { "error": "Error registering user." }
        ```
        ```json
        { "error": "Server error during registration." }
        ```

### `POST /api/login`
Logs in an existing user.

*   **Request Body:**
    *   `username` (string, required): The user's username.
    *   `password` (string, required): The user's password.
*   **Success Response (200 OK):**
    ```json
    {
      "message": "Login successful.",
      "token": "jwt_token_string",
      "user": {
        "id": 1,
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
        "role_name": "researcher"
      }
    }
    ```
    *(Note: The backend currently returns `message` and `token`. The `user` object in the response was added to the documentation based on common practice and what the frontend store now expects from the login action.)*
    *Correction: The backend `login` endpoint in `index.js` was updated to return `{ message: 'Login successful.', token: token }`. It does *not* currently return the user object directly on login. The user object is typically fetched via `/api/profile` after login.*
    *Let's adjust the documentation to reflect the actual backend implementation for the login response, and the frontend `authStore` would then call `fetchProfile`.*
    ```json
    {
      "message": "Login successful.",
      "token": "jwt_token_string"
    }
    ```
    *(Frontend's `authStore.login` action was modified to expect `response.data.user`. I will document what the backend *currently* provides, and a note can be made if they should be aligned.)*
    *Re-checking `backend/index.js` for login response. The `tokenPayload` includes `userId`, `username`, `role`. The actual response is `res.json({ message: 'Login successful.', token: token });`. The frontend `auth.js` *simulates* getting the user object right after login for its state, but relies on `fetchProfile` for the full object. The backend API documentation should reflect the API's actual output.*

*   **Actual Success Response (200 OK) from `backend/index.js`:**
    ```json
    {
      "message": "Login successful.",
      "token": "jwt_token_string"
    }
    ```
    *(The JWT token itself contains: `{ userId, username, role }`)*

*   **Error Responses:**
    *   `400 Bad Request`: If username or password are not provided.
        ```json
        { "error": "Username and password are required." }
        ```
    *   `401 Unauthorized`: Invalid username or password.
        ```json
        { "error": "Invalid username or password." }
        ```
    *   `500 Internal Server Error`: Server-side issues during login.
        ```json
        { "error": "Error fetching user." }
        ```
        ```json
        { "error": "Server error during login." }
        ```

## Profile Management Endpoints

### `GET /api/profile`
Retrieves the profile information for the authenticated user.

*   **Authentication:** Required (Bearer Token in `Authorization` header).
*   **Success Response (200 OK):**
    ```json
    {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "full_name": "Test User",
      "role_name": "researcher"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: If the token is missing or invalid. (Handled by `authenticateToken` middleware, typically sends a `401 Unauthorized` status code directly, may not have a JSON body).
    *   `403 Forbidden`: If the token is valid but does not grant access (e.g., missing `view_own_profile` permission, though this is usually granted to all authenticated users). (Handled by `authorize` middleware).
        ```json
        { "error": "Forbidden: Insufficient permissions." }
        ```
    *   `404 Not Found`: If the user associated with the valid token is not found in the database.
        ```json
        { "error": "User profile not found." }
        ```
    *   `500 Internal Server Error`: Server-side issues.
        ```json
        { "error": "Error fetching profile data." }
        ```

### `PUT /api/profile`
Allows authenticated users to update their email and/or full name.

*   **Authentication:** Required (Bearer Token).
*   **Request Body:**
    ```json
    {
      "email": "new_email@example.com", // optional
      "full_name": "New Full Name"    // optional
    }
    ```
*   **Success Response (200 OK):**
    ```json
    { "message": "Profile updated successfully." }
    ```
    *(Note: The backend currently returns this message. The frontend store optimistically updates its user state or can re-fetch. For consistency, backend could return the updated user object.)*
*   **Error Responses:**
    *   `400 Bad Request`: If no data is provided or input is malformed.
        ```json
        { "error": "Nothing to update. Provide email or full_name." }
        ```
    *   `401 Unauthorized`: Token missing or invalid.
    *   `403 Forbidden`: Insufficient permissions (e.g., missing `edit_own_profile`).
        ```json
        { "error": "Forbidden: Insufficient permissions." }
        ```
    *   `409 Conflict`: If the new email is already in use.
        ```json
        { "error": "Email already in use by another account." }
        ```
    *   `500 Internal Server Error`: Server-side issues.
        ```json
        { "error": "Error updating profile." }
        ```

## Admin Endpoints

### `GET /api/admin/users`
Retrieves a list of all users.

*   **Authentication:** Required (Bearer Token).
*   **Permissions Required:** `view_all_users` (typically associated with the 'administrator' role).
*   **Success Response (200 OK):**
    ```json
    [
      {
        "id": 1,
        "username": "adminuser",
        "email": "admin@example.com",
        "full_name": "Admin User",
        "role_name": "administrator"
      },
      {
        "id": 2,
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
        "role_name": "researcher"
      }
      // ... more users
    ]
    ```
*   **Error Responses:**
    *   `401 Unauthorized`: Token missing or invalid.
    *   `403 Forbidden`: User does not have the `view_all_users` permission.
        ```json
        { "error": "Forbidden: Insufficient permissions." }
        ```
    *   `500 Internal Server Error`: Server-side issues.
        ```json
        { "error": "Error fetching user list." }
        ```
---

*Note: For 401/403 errors from `authenticateToken` or `authorize` middleware, the response might be a direct status code without a JSON body, or a generic JSON body if the middleware is configured to send one.*
