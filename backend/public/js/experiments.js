// experiments.js - Handles CRUD for experiments (dummy data for now)
document.addEventListener('DOMContentLoaded', function () {
  let experiments = [];
  const tableBody = document.querySelector('tbody');
  const addBtn = document.getElementById('add-experiment-btn');
  const modal = new bootstrap.Modal(document.getElementById('experimentModal'));
  const form = document.getElementById('experiment-form');
  let editId = null;
  const user = JSON.parse(localStorage.getItem('user'));
  const token = user && user.token;

  function badge(status) {
    if (status === 'Completed') return '<span class="badge bg-success">Completed</span>';
    if (status === 'Ongoing') return '<span class="badge bg-warning text-dark">Ongoing</span>';
    if (status === 'Delayed') return '<span class="badge bg-danger">Delayed</span>';
    return `<span class="badge bg-secondary">${status}</span>`;
  }

  function renderTable() {
    tableBody.innerHTML = '';
    experiments.forEach((exp, idx) => {
      tableBody.innerHTML += `
        <tr>
          <th scope="row">${idx + 1}</th>
          <td>${exp.name}</td>
          <td>${badge(exp.status || 'Ongoing')}</td>
          <td>${exp.created_at ? exp.created_at.split('T')[0] : ''}</td>
          <td>${exp.updated_at ? exp.updated_at.split('T')[0] : '-'}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="editExperiment(${exp.id})">Edit</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteExperiment(${exp.id})">Delete</button>
          </td>
        </tr>
      `;
    });
  }

  async function fetchExperiments() {
    const res = await fetch('/api/experiments', {
      headers: { Authorization: `Bearer ${token}` }
    });
    experiments = await res.json();
    renderTable();
  }

  window.editExperiment = function(id) {
    const exp = experiments.find(e => e.id === id);
    if (!exp) return;
    editId = id;
    form['name'].value = exp.name;
    form['description'].value = exp.description || '';
    modal.show();
  };

  window.deleteExperiment = async function(id) {
    if (confirm('Are you sure you want to delete this experiment?')) {
      await fetch(`/api/experiments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchExperiments();
    }
  };

  addBtn.addEventListener('click', function() {
    editId = null;
    form.reset();
    modal.show();
  });

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const payload = {
      name: form['name'].value,
      description: form['description'].value
    };
    if (editId) {
      await fetch(`/api/experiments/${editId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch('/api/experiments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
    }
    modal.hide();
    fetchExperiments();
  });

  fetchExperiments();
});
