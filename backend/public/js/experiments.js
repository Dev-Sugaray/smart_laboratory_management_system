import { addData, getAllData, updateData, deleteData } from './db.js';

// experiments.js - Handles CRUD for experiments (dummy data for now)
document.addEventListener('DOMContentLoaded', function () {
  let experiments = [];
  const tableBody = document.querySelector('tbody');
  const addBtn = document.getElementById('add-experiment-btn');
  const modal = new bootstrap.Modal(document.getElementById('experimentModal'));
  const form = document.getElementById('experiment-form');
  let editId = null;
  const user = JSON.parse(localStorage.getItem('user')); // Re-add user parsing

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
    experiments = await getAllData('experiments');
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
      await deleteData('experiments', id);
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
      description: form['description'].value,
      status: form['status'].value, // Add status field
      start_date: form['start_date'].value, // Add start_date field
      end_date: form['end_date'].value // Add end_date field
    };

    if (editId) {
      // For update, include the id in the payload
      await updateData('experiments', { id: editId, ...payload });
    } else {
      // For add, IndexedDB will auto-increment id
      await addData('experiments', payload);
    }
    modal.hide();
    fetchExperiments();
  });

  fetchExperiments();
});
