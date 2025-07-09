// dashboard.js - Display user role and info from localStorage/sessionStorage

document.addEventListener('DOMContentLoaded', function () {
  // Try to get user info from localStorage
  const user = JSON.parse(localStorage.getItem('user'));
  const userRoleDisplay = document.getElementById('user-role-display');
  const userInfoDiv = document.getElementById('user-info');

  if (!user) {
    userRoleDisplay.textContent = 'No user information found. Please log in.';
    userInfoDiv.innerHTML = '';
    return;
  }

  // Display user role and info
  userRoleDisplay.textContent = `You are logged in as: ${user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Unknown Role'}`;
  userInfoDiv.innerHTML = `
    <div class="card mt-3">
      <div class="card-body">
        <p><strong>Username:</strong> ${user.username || ''}</p>
        <p><strong>Email:</strong> ${user.email || ''}</p>
        <p><strong>Full Name:</strong> ${user.full_name || ''}</p>
        <p><strong>Role:</strong> ${user.role || ''}</p>
      </div>
    </div>
  `;
});
