# Role-Based Access Control (RBAC) Documentation

This document outlines the roles, permissions, and their relationships within the system.

## Roles

The following roles are defined in the system:

*   **`administrator`**:
    *   **Description:** Highest level of access. Intended for system administration.
    *   **Typical Responsibilities:** Managing user accounts (creating, deleting, modifying roles), managing system-wide settings, viewing all data, and potentially managing permissions themselves.

*   **`lab_manager`**:
    *   **Description:** Manages lab-specific operations and data.
    *   **Typical Responsibilities:** Overseeing inventory, managing lab-specific configurations or protocols, potentially managing researcher accounts within their lab or group, and viewing reports relevant to their lab.

*   **`researcher`**:
    *   **Description:** Standard user role for conducting research.
    *   **Typical Responsibilities:** Accessing research tools, inputting and managing their own experimental data, viewing their own profile and relevant reports, and managing their assigned inventory items.

## Permissions

Permissions define specific actions a user can perform. The following permissions are defined:

*   **`view_own_profile`**: Allows a user to view their own profile details.
*   **`edit_own_profile`**: Allows a user to edit their own profile information (e.g., email, full name).
*   **`manage_inventory`**: Allows a user to manage (add, edit, delete) inventory items.
*   **`view_reports`**: Allows a user to view reports. The scope of these reports might differ based on the role.
*   **`create_user`**: Allows a user to create new user accounts.
*   **`delete_user`**: Allows a user to delete existing user accounts. (Typically admin)
*   **`view_all_users`**: Allows a user to retrieve a list of all users in the system. (Typically admin)
*   **`manage_roles`**: Allows a user to define roles and assign permissions to them. (Typically admin)
*   **`edit_settings`**: Allows a user to modify system-wide settings. (Typically admin)

*(Note: The list of permissions is based on the seeding logic in `backend/index.js` which includes: `view_own_profile`, `edit_own_profile`, `manage_inventory`, `view_reports`, `create_user`, `delete_user`, `view_all_users`, `manage_roles`, `edit_settings`.)*

## Role-Permission Mapping

Permissions are assigned to roles to grant capabilities. The current assignments are as follows (based on the seeding logic in `backend/index.js`):

*   **`administrator`**:
    *   `view_own_profile`
    *   `edit_own_profile`
    *   `view_reports`
    *   `manage_inventory`
    *   `create_user`
    *   `delete_user`
    *   `view_all_users`
    *   `manage_roles`
    *   `edit_settings`

*   **`lab_manager`**:
    *   `view_own_profile`
    *   `edit_own_profile`
    *   `view_reports`
    *   `manage_inventory`
    *   `create_user`

*   **`researcher`**:
    *   `view_own_profile`
    *   `edit_own_profile`
    *   `view_reports`
    *   `manage_inventory`

This mapping is established in the `role_permissions` table in the database, typically populated during application setup or through an administration interface. The specific permissions grant fine-grained control over what actions each role can perform, forming the basis of the system's access control policy.
