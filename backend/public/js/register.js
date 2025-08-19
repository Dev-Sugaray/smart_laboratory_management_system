// register.js - Handles registration functionality
document.addEventListener('DOMContentLoaded', function () {
  const registerForm = document.getElementById('register-form');
  if (!registerForm) return;

  registerForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const full_name = document.getElementById('full_name').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    // Remove any previous error/success
    let feedback = document.getElementById('register-feedback');
    if (feedback) feedback.remove();

    const feedbackDiv = document.createElement('div');
    feedbackDiv.id = 'register-feedback';
    feedbackDiv.className = 'mt-3';

    // Retrieve existing users from localStorage or initialize an empty array
    let users = JSON.parse(localStorage.getItem('registeredUsers')) || [];

    // Check if username or email already exists
    const userExists = users.some(user => user.username === username || user.email === email);

    if (userExists) {
      feedbackDiv.classList.add('alert', 'alert-danger');
      feedbackDiv.textContent = 'Username or email already exists.';
    } else {
      // Add new user to the array
      users.push({ username, email, full_name, password, role });
      localStorage.setItem('registeredUsers', JSON.stringify(users));

      // Store current user info in localStorage for dashboard use (auto-login after registration)
      localStorage.setItem('user', JSON.stringify({
        username: username,
        email: email,
        full_name: full_name,
        role: role
      }));

      feedbackDiv.classList.add('alert', 'alert-success');
      feedbackDiv.textContent = 'Registration successful! Redirecting to dashboard...';
      registerForm.reset();
      setTimeout(() => {
        window.location.href = '/views/dashboard.html';
      }, 1200);
    }
    registerForm.parentNode.appendChild(feedbackDiv);
  });
});
