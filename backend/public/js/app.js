// app.js - Handles login functionality
document.addEventListener('DOMContentLoaded', function () {
  const mainContent = document.getElementById('main-content');

  // Render login form
  function renderLoginForm() {
    mainContent.innerHTML = `
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h3 class="card-title mb-4 text-center">Login</h3>
              <form id="login-form">
                <div class="mb-3">
                  <label for="username" class="form-label">Username</label>
                  <input type="text" class="form-control" id="username" required>
                </div>
                <div class="mb-3">
                  <label for="password" class="form-label">Password</label>
                  <input type="password" class="form-control" id="password" required>
                </div>
                <div id="login-error" class="text-danger mb-2" style="display:none;"></div>
                <button type="submit" class="btn btn-primary w-100">Login</button>
              </form>
              <div class="text-center mt-3">
                <a href="/views/register.html" class="link-success">Don't have an account? Register</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.getElementById('login-form').addEventListener('submit', handleLogin);
  }

  // Handle login form submission
  async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (response.ok) {
        // Store user info in localStorage for dashboard use
        if (data.token) {
          const payload = parseJwt(data.token);
          localStorage.setItem('user', JSON.stringify({
            username: payload.username,
            role: payload.role,
            token: data.token
          }));
        } else {
          localStorage.removeItem('user');
        }
        mainContent.innerHTML = `<div class='alert alert-success'>Login successful! Redirecting to dashboard...</div>`;
        setTimeout(() => {
          window.location.href = '/views/dashboard.html';
        }, 1200);
      } else {
        errorDiv.textContent = data.message || 'Invalid credentials';
        errorDiv.style.display = 'block';
      }
    } catch (err) {
      errorDiv.textContent = 'Server error. Please try again later.';
      errorDiv.style.display = 'block';
    }
  }

  // Helper to decode JWT
  function parseJwt(token) {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return {};
    }
  }

  // Initial render
  renderLoginForm();
});
