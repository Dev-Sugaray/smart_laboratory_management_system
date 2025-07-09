// Main JS for Smart Laboratory Management System
// Handles routing, authentication, and dynamic content loading

document.addEventListener('DOMContentLoaded', function() {
  // Placeholder: Load login page by default
  loadView('login');
});

function loadView(view) {
  // Simple router placeholder
  const main = document.getElementById('main-content');
  if (view === 'login') {
    fetch('/js/views/login.html')
      .then(res => res.text())
      .then(html => { main.innerHTML = html; });
  } else if (view === 'register') {
    fetch('/js/views/register.html')
      .then(res => res.text())
      .then(html => { main.innerHTML = html; });
  }
  // ...existing code...
}
// ...existing code...
window.addEventListener('hashchange', function() {
  const hash = window.location.hash.replace('#/', '');
  if (hash === 'register') loadView('register');
  else if (hash === 'login' || !hash) loadView('login');
  // Add more routes as needed
});
// ...existing code...
