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

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email, full_name, role })
      });
      const data = await response.json();
      const feedbackDiv = document.createElement('div');
      feedbackDiv.id = 'register-feedback';
      feedbackDiv.className = 'mt-3';
      if (response.ok) {
        // Store user info in localStorage for dashboard use
        localStorage.setItem('user', JSON.stringify({
          username: username,
          email: email,
          full_name: full_name,
          role: role // Store the selected role
        }));
        feedbackDiv.classList.add('alert', 'alert-success');
        feedbackDiv.textContent = 'Registration successful! Redirecting to dashboard...';
        registerForm.reset();
        setTimeout(() => {
          window.location.href = '/views/dashboard.html';
        }, 1200);
      } else {
        feedbackDiv.classList.add('alert', 'alert-danger');
        feedbackDiv.textContent = data.error || 'Registration failed.';
      }
      registerForm.parentNode.appendChild(feedbackDiv);
    } catch (err) {
      const feedbackDiv = document.createElement('div');
      feedbackDiv.id = 'register-feedback';
      feedbackDiv.className = 'alert alert-danger mt-3';
      feedbackDiv.textContent = 'Server error. Please try again later.';
      registerForm.parentNode.appendChild(feedbackDiv);
    }
  });
});
