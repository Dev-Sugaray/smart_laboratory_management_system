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
*   **Error Responses:**
    *   `400 Bad Request`: If any required fields are missing or input is malformed.
        ```json
        { "error": "All fields are required (username, password, email, full_name)." }
        ```
    *   `409 Conflict`: If the username or email already exists.
        ```json
        { "error": "Username already exists." }
        ```
    *   `500 Internal Server Error`: If there's a server-side issue.
        ```json
        { "error": "Error registering user." }
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
      "token": "jwt_token_string"
    }
    ```
    *(The JWT token itself contains: `{ userId, username, role }`)*
*   **Error Responses:**
    *   `400 Bad Request`: If username or password are not provided.
    *   `401 Unauthorized`: Invalid username or password.
    *   `500 Internal Server Error`: Server-side issues.

## Profile Management Endpoints

### `GET /api/profile`
Retrieves the profile information for the authenticated user.

*   **Authentication:** Required (Bearer Token in `Authorization` header).
*   **Permissions Required:** `view_own_profile` (implicitly granted to any authenticated user by current setup).
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
    *   `401 Unauthorized`: Token missing or invalid.
    *   `403 Forbidden`: Insufficient permissions.
    *   `404 Not Found`: User not found.
    *   `500 Internal Server Error`.

### `PUT /api/profile`
Allows authenticated users to update their email and/or full name.

*   **Authentication:** Required (Bearer Token).
*   **Permissions Required:** `edit_own_profile` (implicitly granted to any authenticated user by current setup).
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
*   **Error Responses:**
    *   `400 Bad Request`: No data provided.
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `409 Conflict`: Email already in use.
    *   `500 Internal Server Error`.

## Admin Endpoints

### `GET /api/admin/users`
Retrieves a list of all users. (Example, not fully implemented in current codebase but good for structure)

*   **Authentication:** Required (Bearer Token).
*   **Permissions Required:** `view_all_users` (typically 'administrator' role).
*   **Success Response (200 OK):**
    ```json
    [
      {
        "id": 1,
        "username": "adminuser",
        "email": "admin@example.com",
        "full_name": "Admin User",
        "role_name": "administrator"
      }
      // ... more users
    ]
    ```
*   **Error Responses:**
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `500 Internal Server Error`.

---
## Sample Management APIs

Base path for these APIs: `/api`

### Sample Types API

Endpoints for managing sample types.

#### `POST /api/sample-types`
Creates a new sample type.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_sample_types`.
*   **Request Body:**
    ```json
    {
      "name": "Blood",           // string, required
      "description": "Whole blood sample" // string, optional
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "id": 1,
      "name": "Blood",
      "description": "Whole blood sample"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: `name` is missing.
    *   `401 Unauthorized`.
    *   `403 Forbidden`: Insufficient permissions.
    *   `409 Conflict`: Sample type name already exists.
    *   `500 Internal Server Error`.

#### `GET /api/sample-types`
Retrieves a list of all sample types.

*   **Authentication:** Required.
*   **Permissions Required:** `view_sample_details` AND `manage_sample_types` (due to current middleware logic for arrays of permissions).
*   **Success Response (200 OK):**
    ```json
    [
      {
        "id": 1,
        "name": "Blood",
        "description": "Whole blood sample"
      },
      {
        "id": 2,
        "name": "Plasma",
        "description": "Centrifuged plasma"
      }
    ]
    ```
*   **Error Responses:**
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `500 Internal Server Error`.

#### `GET /api/sample-types/:id`
Retrieves a specific sample type by its ID.

*   **Authentication:** Required.
*   **Permissions Required:** `view_sample_details` AND `manage_sample_types`.
*   **Success Response (200 OK):**
    ```json
    {
      "id": 1,
      "name": "Blood",
      "description": "Whole blood sample"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`: Sample type with the given ID not found.
    *   `500 Internal Server Error`.

#### `PUT /api/sample-types/:id`
Updates an existing sample type.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_sample_types`.
*   **Request Body:**
    ```json
    {
      "name": "Updated Type Name", // string, optional
      "description": "Updated description" // string, optional
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "id": 1,
      "name": "Updated Type Name",
      "description": "Updated description"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: No fields to update or invalid data.
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`.
    *   `409 Conflict`: If updated name conflicts with an existing one.
    *   `500 Internal Server Error`.

#### `DELETE /api/sample-types/:id`
Deletes a sample type.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_sample_types`.
*   **Success Response (200 OK):**
    ```json
    {
      "message": "Sample type deleted successfully."
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`.
    *   `409 Conflict`: If the sample type is in use (e.g., by samples).
    *   `500 Internal Server Error`.

---
### Sources API

Endpoints for managing sample sources. (Structure is similar to Sample Types API)

#### `POST /api/sources`
Creates a new source.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_sources`.
*   **Request Body:** `{ "name": "Clinical Trial A", "description": "Samples from Trial A" }` (`description` optional)
*   **Success Response (201 Created):** Created source object.
*   **Errors:** 400, 401, 403, 409, 500.

#### `GET /api/sources`
Retrieves a list of all sources.

*   **Authentication:** Required.
*   **Permissions Required:** `view_sample_details` AND `manage_sources`.
*   **Success Response (200 OK):** Array of source objects.
*   **Errors:** 401, 403, 500.

#### `GET /api/sources/:id`
Retrieves a specific source by ID.

*   **Authentication:** Required.
*   **Permissions Required:** `view_sample_details` AND `manage_sources`.
*   **Success Response (200 OK):** Source object.
*   **Errors:** 401, 403, 404, 500.

#### `PUT /api/sources/:id`
Updates an existing source.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_sources`.
*   **Request Body:** `{ "name": "Updated Name", "description": "Updated Desc" }` (fields optional)
*   **Success Response (200 OK):** Updated source object.
*   **Errors:** 400, 401, 403, 404, 409, 500.

#### `DELETE /api/sources/:id`
Deletes a source.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_sources`.
*   **Success Response (200 OK):** Success message.
*   **Errors:** 401, 403, 404, 409, 500.

---
### Storage Locations API

Endpoints for managing storage locations.

#### `POST /api/storage-locations`
Creates a new storage location.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_storage_locations`.
*   **Request Body:**
    ```json
    {
      "name": "Freezer A1",        // string, required
      "temperature": -20,         // number, optional
      "capacity": 100             // integer, optional
    }
    ```
*   **Success Response (201 Created):** Created storage location object (includes `current_load: 0`).
*   **Errors:** 400, 401, 403, 409, 500.

#### `GET /api/storage-locations`
Retrieves a list of all storage locations.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_storage_locations` AND `view_sample_details`.
*   **Success Response (200 OK):** Array of storage location objects.
*   **Errors:** 401, 403, 500.

#### `GET /api/storage-locations/:id`
Retrieves a specific storage location by ID.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_storage_locations` AND `view_sample_details`.
*   **Success Response (200 OK):** Storage location object.
*   **Errors:** 401, 403, 404, 500.

#### `PUT /api/storage-locations/:id`
Updates an existing storage location.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_storage_locations`.
*   **Request Body:**
    ```json
    {
      "name": "Freezer A1 (Updated)", // string, optional
      "temperature": -22,            // number, optional
      "capacity": 120,               // integer, optional
      "current_load": 10             // integer, optional (Note: backend may restrict direct update if samples are managed)
    }
    ```
*   **Success Response (200 OK):** Updated storage location object.
*   **Errors:** 400, 401, 403, 404, 409, 500.

#### `DELETE /api/storage-locations/:id`
Deletes a storage location.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_storage_locations`.
*   **Success Response (200 OK):** Success message.
*   **Errors:** 401, 403, 404, 409, 500.

---
### Samples API

Endpoints for managing individual samples.

#### `POST /api/samples/register`
Registers a new sample and creates its initial chain of custody entry.

*   **Authentication:** Required.
*   **Permissions Required:** `register_sample`.
*   **Request Body:**
    ```json
    {
      "sample_type_id": 1,                 // integer, required
      "source_id": 1,                      // integer, required
      "collection_date": "2023-10-01T00:00:00.000Z", // string, required, ISO8601
      "current_status": "Registered",      // string, required (e.g., 'Registered', 'In Storage')
      "storage_location_id": null,         // integer, optional (required if current_status is 'In Storage')
      "notes": "Initial sample registration" // string, optional
    }
    ```
*   **Success Response (201 Created):** The created sample object, including server-generated fields like `id`, `unique_sample_id`, `barcode_qr_code`, `registration_date`, `created_at`, `updated_at`.
    ```json
    {
      "id": 101,
      "unique_sample_id": "SAMP-1696150000000-XYZ12",
      "sample_type_id": 1,
      "source_id": 1,
      "collection_date": "2023-10-01T00:00:00.000Z",
      "registration_date": "2023-10-01T10:00:00.000Z",
      "storage_location_id": null,
      "current_status": "Registered",
      "barcode_qr_code": "QR-SAMP-1696150000000-XYZ12",
      "notes": "Initial sample registration",
      "created_at": "2023-10-01T10:00:00.000Z",
      "updated_at": "2023-10-01T10:00:00.000Z"
    }
    ```
*   **Errors:** 400 (missing fields, invalid FKs, invalid status, conditional `storage_location_id` missing), 401, 403, 500.

#### `GET /api/samples`
Retrieves a list of samples with pagination.

*   **Authentication:** Required.
*   **Permissions Required:** `view_all_samples` AND `view_sample_details` (due to current middleware logic).
*   **Query Parameters:**
    *   `limit` (integer, optional, default: 10): Number of samples per page.
    *   `offset` (integer, optional, default: 0): Number of samples to skip.
*   **Success Response (200 OK):**
    ```json
    {
      "data": [
        {
          "id": 101,
          "unique_sample_id": "SAMP-...",
          "sample_type_name": "Blood", // Joined data
          "source_name": "Clinical Trial A", // Joined data
          "collection_date": "2023-10-01T00:00:00.000Z",
          "current_status": "Registered",
          "storage_location_name": null // Joined data
          // ... other core sample fields
        }
      ],
      "pagination": {
        "limit": 10,
        "offset": 0,
        "total_count": 1 // Total number of samples matching query
      }
    }
    ```
*   **Errors:** 401, 403, 500.

#### `GET /api/samples/:id`
Retrieves detailed information for a specific sample.

*   **Authentication:** Required.
*   **Permissions Required:** `view_sample_details` AND `view_all_samples`.
*   **Success Response (200 OK):** Detailed sample object with joined names (e.g., `sample_type_name`, `source_name`, `storage_location_name`).
    ```json
    {
      "id": 101,
      "unique_sample_id": "SAMP-...",
      "sample_type_id": 1,
      "source_id": 1,
      "collection_date": "...",
      "registration_date": "...",
      "storage_location_id": null,
      "current_status": "Registered",
      "barcode_qr_code": "QR-SAMP-...",
      "notes": "...",
      "created_at": "...",
      "updated_at": "...",
      "sample_type_name": "Blood",
      "source_name": "Clinical Trial A",
      "storage_location_name": null
    }
    ```
*   **Errors:** 401, 403, 404, 500.

#### `PUT /api/samples/:id/status`
Updates the status and/or location of a sample. Creates a new chain of custody entry.

*   **Authentication:** Required.
*   **Permissions Required:** `update_sample_status`.
*   **Request Body:**
    ```json
    {
      "current_status": "In Storage",     // string, required
      "storage_location_id": 2,         // integer, optional (required if new status is 'In Storage')
      "notes": "Moved to primary freezer" // string, optional
    }
    ```
*   **Success Response (200 OK):** The updated sample object (with joined names).
*   **Errors:** 400 (invalid status, missing/invalid `storage_location_id` if required), 401, 403, 404 (sample or storage location not found), 500.

#### `GET /api/samples/:id/barcode`
Retrieves barcode data for a sample.

*   **Authentication:** Required.
*   **Permissions Required:** `generate_barcode` AND `view_sample_details`.
*   **Success Response (200 OK):**
    ```json
    {
      "sample_id": 101,
      "unique_sample_id": "SAMP-...",
      "barcode_qr_code": "QR-SAMP-..."
    }
    ```
*   **Errors:** 401, 403, 404, 500.

#### `GET /api/samples/:id/lifecycle`
Retrieves the lifecycle history (chain of custody) for a sample. *Currently an alias for `/chainofcustody`.*

*   **Authentication:** Required.
*   **Permissions Required:** `view_sample_lifecycle`.
*   **Success Response (200 OK):** Array of chain of custody event objects, ordered by timestamp. Each object includes joined user details (`user_username`, `user_full_name`) and location names (`previous_location_name`, `new_location_name`).
    ```json
    [
      {
        "id": 1,
        "sample_id": 101,
        "user_id": 1,
        "action": "Registered",
        "timestamp": "2023-10-01T10:00:00.000Z",
        "previous_location_id": null,
        "new_location_id": null,
        "notes": "Sample registered into the system.",
        "user_username": "testadmin",
        "user_full_name": "Test Admin",
        "previous_location_name": null,
        "new_location_name": null
      }
      // ... more events
    ]
    ```
*   **Errors:** 401, 403, 404 (if sample not found before querying CoC), 500.

#### `GET /api/samples/:id/chainofcustody`
Retrieves the full chain of custody for a sample.

*   **Authentication:** Required.
*   **Permissions Required:** `view_sample_lifecycle` AND `manage_chain_of_custody`.
*   **Success Response (200 OK):** Same as `/lifecycle`. Array of CoC event objects.
*   **Errors:** 401, 403, 404, 500.

#### `POST /api/samples/:id/chainofcustody`
Adds a generic (manual) entry to the sample's chain of custody.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_chain_of_custody`.
*   **Request Body:**
    ```json
    {
      "action": "Manual Inspection",       // string, required
      "notes": "Checked sample integrity.", // string, optional
      "previous_location_id": 2,        // integer, optional
      "new_location_id": 2                // integer, optional
    }
    ```
*   **Success Response (201 Created):** The created chain of custody entry object.
*   **Errors:** 400 (missing `action`, invalid location IDs), 401, 403, 404 (sample not found), 500.

---
## Experiment Management APIs

Base path: `/api`

Endpoints for managing experiments and their associated tests.

### `POST /api/experiments`
Creates a new experiment.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_experiments`.
*   **Request Body:**
    ```json
    {
      "name": "Cell Growth Study",  // string, required
      "description": "Investigating factors affecting cell growth." // string, optional
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "id": 1,
      "name": "Cell Growth Study",
      "description": "Investigating factors affecting cell growth.",
      "created_at": "YYYY-MM-DDTHH:mm:ss.SSSZ",
      "updated_at": "YYYY-MM-DDTHH:mm:ss.SSSZ"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: `name` is missing. (`{ "error": "Experiment name is required." }`)
    *   `401 Unauthorized`.
    *   `403 Forbidden`: Insufficient permissions.
    *   `409 Conflict`: Experiment name already exists. (`{ "error": "Experiment name already exists." }`)
    *   `500 Internal Server Error`: (`{ "error": "Failed to create experiment." }`)

### `GET /api/experiments`
Retrieves a list of all experiments.

*   **Authentication:** Required.
*   **Permissions Required:** `view_experiments`.
*   **Success Response (200 OK):**
    ```json
    [
      {
        "id": 1,
        "name": "Cell Growth Study",
        "description": "Investigating factors affecting cell growth.",
        "created_at": "YYYY-MM-DDTHH:mm:ss.SSSZ",
        "updated_at": "YYYY-MM-DDTHH:mm:ss.SSSZ"
      }
      // ... more experiments
    ]
    ```
*   **Error Responses:**
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `500 Internal Server Error`: (`{ "error": "Failed to retrieve experiments." }`)

### `GET /api/experiments/:id`
Retrieves a specific experiment by its ID.

*   **Authentication:** Required.
*   **Permissions Required:** `view_experiments`.
*   **Success Response (200 OK):**
    ```json
    {
      "id": 1,
      "name": "Cell Growth Study",
      "description": "Investigating factors affecting cell growth.",
      "created_at": "YYYY-MM-DDTHH:mm:ss.SSSZ",
      "updated_at": "YYYY-MM-DDTHH:mm:ss.SSSZ"
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`: (`{ "error": "Experiment not found." }`)
    *   `500 Internal Server Error`: (`{ "error": "Failed to retrieve experiment." }`)

### `PUT /api/experiments/:id`
Updates an existing experiment.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_experiments`.
*   **Request Body:**
    ```json
    {
      "name": "Updated Cell Study", // string, optional
      "description": "Updated investigation details." // string, optional
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "message": "Experiment updated successfully.",
      "id": 1,
      "changes": 1
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: No fields to update.
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`.
    *   `409 Conflict`: Name conflict.
    *   `500 Internal Server Error`.

### `DELETE /api/experiments/:id`
Deletes an experiment. Associated `experiment_tests` entries are cascade deleted.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_experiments`.
*   **Success Response (200 OK):**
    ```json
    {
      "message": "Experiment deleted successfully.",
      "id": 1
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`.
    *   `500 Internal Server Error`.

### `POST /api/experiments/:id/tests`
Adds a test (test definition) to an experiment. Creates an entry in the `experiment_tests` join table.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_experiments`.
*   **Request Body:**
    ```json
    {
      "test_id": 101 // integer, required, ID of the test definition
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "message": "Test added to experiment successfully.",
      "experiment_id": 1,
      "test_id": 101
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: `test_id` missing or invalid.
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`: Experiment or Test Definition not found.
    *   `409 Conflict`: Test already associated. (`{ "error": "This test is already associated with this experiment." }`)
    *   `500 Internal Server Error`.

### `DELETE /api/experiments/:id/tests/:test_id`
Removes a test definition from an experiment. Deletes an entry from `experiment_tests`.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_experiments`.
*   **Success Response (200 OK):**
    ```json
    { "message": "Test removed from experiment successfully." }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`: Association not found.
    *   `500 Internal Server Error`.

### `GET /api/experiments/:id/tests`
Retrieves all test definitions associated with an experiment.

*   **Authentication:** Required.
*   **Permissions Required:** `view_experiments`.
*   **Success Response (200 OK):** Array of test definition objects.
    ```json
    [
      { "id": 101, "name": "Blood Glucose Test", /* ...other test_definition fields */ }
    ]
    ```
*   **Error Responses:**
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`: Experiment not found.
    *   `500 Internal Server Error`.

---
## Test Definition APIs

Base path: `/api`

Endpoints for managing test definitions (templates).

### `POST /api/tests`
Creates a new test definition.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_tests`.
*   **Request Body:**
    ```json
    {
      "name": "CBC Panel",            // string, required
      "description": "Complete Blood Count panel.", // string, optional
      "protocol": "Standard hematology protocol..." // string, optional
    }
    ```
*   **Success Response (201 Created):** The created test definition object.
    ```json
    {
      "id": 1,
      "name": "CBC Panel",
      "description": "Complete Blood Count panel.",
      "protocol": "Standard hematology protocol...",
      "created_at": "YYYY-MM-DDTHH:mm:ss.SSSZ",
      "updated_at": "YYYY-MM-DDTHH:mm:ss.SSSZ"
    }
    ```
*   **Error Responses:** `400`, `401`, `403`, `409` (name conflict), `500`.

### `GET /api/tests`
Retrieves a list of all test definitions.

*   **Authentication:** Required.
*   **Permissions Required:** `view_tests`.
*   **Success Response (200 OK):** Array of test definition objects.
*   **Error Responses:** `401`, `403`, `500`.

### `GET /api/tests/:id`
Retrieves a specific test definition.

*   **Authentication:** Required.
*   **Permissions Required:** `view_tests`.
*   **Success Response (200 OK):** Test definition object.
*   **Error Responses:** `401`, `403`, `404`, `500`.

### `PUT /api/tests/:id`
Updates a test definition.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_tests`.
*   **Request Body:** Optional fields: `name`, `description`, `protocol`.
*   **Success Response (200 OK):** `{ "message": "Test updated successfully.", "id": 1, "changes": 1 }`
*   **Error Responses:** `400`, `401`, `403`, `404`, `409` (name conflict), `500`.

### `DELETE /api/tests/:id`
Deletes a test definition.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_tests`.
*   **Success Response (200 OK):** `{ "message": "Test deleted successfully.", "id": 1 }`
*   **Error Responses:** `401`, `403`, `404`, `409` (if referenced and cascade fails), `500`.

---
## Sample Testing APIs

Base path: `/api`

Endpoints for managing test runs on samples.

### `POST /api/samples/:sample_id/tests`
Requests tests for a sample. Creates `sample_tests` entries.

*   **Authentication:** Required.
*   **Permissions Required:** `request_sample_tests`.
*   **Request Body:**
    ```json
    {
      "test_ids": [101, 102],   // array of integers, required
      "experiment_id": 1        // integer, optional
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "message": "Test(s) requested successfully for the sample.",
      "created_entries": [
        { "id": 201, "sample_id": 1, "test_id": 101, "experiment_id": 1, "requested_by_user_id": 5, "status": "Pending" }
        // ... other created entries
      ]
    }
    ```
*   **Error Responses:** `400`, `401`, `403`, `404` (sample/test/experiment not found), `500`.

### `GET /api/samples/:sample_id/tests`
Retrieves test runs for a specific sample.

*   **Authentication:** Required.
*   **Permissions Required:** `view_sample_details`.
*   **Success Response (200 OK):** Array of `sample_tests` objects with joined details (test name, user names, etc.).
    ```json
    [
      {
        "sample_test_id": 201, // This is sample_tests.id
        "test_id": 101,
        "test_name": "Blood Glucose",
        "status": "Pending",
        // ... other fields from sample_tests table and joined user/experiment names
      }
    ]
    ```
*   **Error Responses:** `401`, `403`, `404` (sample not found), `500`.

### `POST /api/samples/batch-request-tests`
Batch requests tests for multiple samples.

*   **Authentication:** Required.
*   **Permissions Required:** `request_sample_tests`.
*   **Request Body:**
    ```json
    {
      "sample_ids": [1, 2],   // array of integers, required
      "test_ids": [101, 102],       // array of integers, required
      "experiment_id": 1            // integer, optional
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "message": "Batch test request processed. X test(s) requested successfully.",
      "created_entries_count": X
    }
    ```
*   **Error Responses:** `400` (invalid input/IDs), `401`, `403`, `500`. (Rolls back on any partial failure).

### `GET /api/tests/:test_id/samples`
Retrieves all samples that have had a specific test definition requested, including details of those test runs.

*   **Authentication:** Required.
*   **Permissions Required:** `view_tests`.
*   **Success Response (200 OK):** Array of objects, each combining sample information with `sample_tests` entry details for that specific test.
    ```json
    [
      {
        "sample_id": 1,
        "unique_sample_id": "SAMP-001",
        "sample_status": "Registered", // Status of the sample itself
        "sample_test_id": 201,         // ID of the entry in sample_tests
        "test_status_for_sample": "Pending", // Status of this test for this sample
        // ... other relevant fields from sample and sample_tests, and joined names
      }
    ]
    ```
*   **Error Responses:** `401`, `403`, `404` (test definition not found), `500`.

### `GET /api/sample-tests`
Retrieves a list of all sample test run entries, potentially with filters.

*   **Authentication:** Required.
*   **Permissions Required:** `view_tests` (or a more specific permission like `view_all_sample_tests_data`).
*   **Query Parameters (Optional):** `status`, `test_id`, `sample_id`, `user_id` (specific user field depends on backend logic, e.g. `requested_by_user_id`).
*   **Success Response (200 OK):** Array of `sample_tests` objects with joined details (sample unique ID, test name, user names, etc.).
*   **Error Responses:** `401`, `403`, `500`.

### `GET /api/sample-tests/:id`
Retrieves details for a specific `sample_tests` entry by its own ID.

*   **Authentication:** Required.
*   **Permissions Required:** `view_tests`.
*   **Success Response (200 OK):** Single `sample_tests` object with comprehensive joined details.
    ```json
    {
      "id": 201, // sample_tests.id
      "sample_id": 1,
      "unique_sample_id": "SAMP-001",
      "test_id": 101,
      "test_name": "Blood Glucose",
      "experiment_id": 1,
      "experiment_name": "Diabetes Study",
      "status": "Pending",
      "results": null,
      "requested_by_user_id": 5,
      "requested_by_username": "researcher_x",
      // ... all other fields from sample_tests table and joined user names for assign, validate, approve actions
      "notes": null
    }
    ```
*   **Error Responses:** `401`, `403`, `404`, `500`.

### `PUT /api/sample-tests/:id`
Updates a specific sample test entry (status, results, assignment, notes).

*   **Authentication:** Required.
*   **Permissions Required:** Varies based on action (e.g., `enter_test_results`, `validate_test_results`, `approve_test_results`, `manage_tests` for general assignment/notes). The backend performs checks for specific fields/status transitions.
*   **Request Body:** Fields `status`, `results`, `assigned_to_user_id`, `notes` are optional.
    ```json
    {
      "status": "Completed",
      "results": "Glucose: 5.5 mmol/L",
      "assigned_to_user_id": 10,
      "notes": "Sample slightly hemolyzed."
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "message": "Sample test entry updated successfully.",
      "id": 201 // ID of the updated sample_tests entry
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid status transition, user ID not found, or other validation errors.
    *   `401 Unauthorized`.
    *   `403 Forbidden`: Insufficient permission for the specific update attempted.
    *   `404 Not Found`: `sample_tests` entry not found.
    *   `500 Internal Server Error`.

### `DELETE /api/sample-tests/:id`
Deletes a specific sample test entry. Use with caution.

*   **Authentication:** Required.
*   **Permissions Required:** `manage_tests` (or a more specific `delete_sample_test_request`).
*   **Success Response (200 OK):**
    ```json
    {
      "message": "Sample test entry deleted successfully.",
      "id": 201 // ID of the deleted sample_tests entry
    }
    ```
*   **Error Responses:**
    *   `401 Unauthorized`.
    *   `403 Forbidden`.
    *   `404 Not Found`.
    *   `500 Internal Server Error`.

---
*Note: For 401/403 errors from `authenticateToken` or `authorize` middleware, the response might be a direct status code without a JSON body, or a generic JSON body if the middleware is configured to send one. For routes where multiple permissions are listed (e.g., `authorize(['permA', 'permB'])`), the current backend middleware requires the user to possess ALL listed permissions.*
