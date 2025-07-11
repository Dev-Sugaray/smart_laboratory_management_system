// reagents.js - Handles CRUD for reagents
document.addEventListener('DOMContentLoaded', function () {
  let reagents = [];
  const tableBody = document.querySelector('tbody');
  const addBtn = document.getElementById('add-reagent-btn');
  const modal = new bootstrap.Modal(document.getElementById('reagentModal'));
  const form = document.getElementById('reagent-form');
  let editId = null;
  const user = JSON.parse(localStorage.getItem('user'));
  const token = user && user.token;

  function renderTable() {
    tableBody.innerHTML = '';
    reagents.forEach((reagent, idx) => {
      tableBody.innerHTML += `
        <tr>
          <th scope="row">${idx + 1}</th>
          <td>${reagent.name}</td>
          <td>${reagent.lot_number}</td>
          <td>${reagent.expiry_date ? reagent.expiry_date.split('T')[0] : ''}</td>
          <td>${reagent.manufacturer || '-'}</td>
          <td>${reagent.current_stock}</td>
          <td>${reagent.min_stock_level}</td>
          <td>${reagent.sds_link ? `<a href="${reagent.sds_link}" target="_blank">View SDS</a>` : '-'}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="editReagent(${reagent.id})">Edit</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteReagent(${reagent.id})">Delete</button>
          </td>
        </tr>
      `;
    });
  }

  async function fetchReagents() {
    try {
      const res = await fetch('/api/reagents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error(`Error fetching reagents: ${res.statusText}`);
      }
      reagents = await res.json();
      renderTable();
    } catch (error) {
      console.error(error);
      // Optionally, display an error message to the user
    }
  }

  window.editReagent = function(id) {
    const reagent = reagents.find(r => r.id === id);
    if (!reagent) return;
    editId = id;
    form['name'].value = reagent.name;
    form['lot_number'].value = reagent.lot_number;
    form['expiry_date'].value = reagent.expiry_date ? reagent.expiry_date.split('T')[0] : '';
    form['manufacturer'].value = reagent.manufacturer || '';
    form['sds_link'].value = reagent.sds_link || '';
    form['current_stock'].value = reagent.current_stock;
    form['min_stock_level'].value = reagent.min_stock_level;
    modal.show();
  };

  window.deleteReagent = async function(id) {
    if (confirm('Are you sure you want to delete this reagent?')) {
      try {
        const res = await fetch(`/api/reagents/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          throw new Error(`Error deleting reagent: ${res.statusText}`);
        }
        fetchReagents();
      } catch (error) {
        console.error(error);
        // Optionally, display an error message to the user
      }
    }
  };

  addBtn.addEventListener('click', function() {
    editId = null;
    form.reset();
    document.getElementById('reagentModalLabel').textContent = 'Add Reagent';
    modal.show();
  });

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const payload = {
      name: form['name'].value,
      lot_number: form['lot_number'].value,
      expiry_date: form['expiry_date'].value,
      manufacturer: form['manufacturer'].value,
      sds_link: form['sds_link'].value,
      current_stock: parseInt(form['current_stock'].value, 10),
      min_stock_level: parseInt(form['min_stock_level'].value, 10)
    };

    if (!payload.name || !payload.lot_number || !payload.expiry_date) {
        alert('Name, Lot Number, and Expiry Date are required.');
        return;
    }
    if (isNaN(payload.current_stock) || payload.current_stock < 0) {
        alert('Current stock must be a non-negative number.');
        return;
    }
    if (isNaN(payload.min_stock_level) || payload.min_stock_level < 0) {
        alert('Minimum stock level must be a non-negative number.');
        return;
    }


    const url = editId ? `/api/reagents/${editId}` : '/api/reagents';
    const method = editId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Error saving reagent: ${res.statusText}`);
      }
      modal.hide();
      fetchReagents();
    } catch (error) {
      console.error(error);
      alert(`Failed to save reagent: ${error.message}`);
    }
  });

  if (token) {
    fetchReagents();
  } else {
    // Handle case where user is not logged in or token is missing
    // For example, redirect to login page or display a message
    console.warn('User token not found. Reagents data will not be loaded.');
    // You might want to redirect to login: window.location.href = '/index.html';
    // Or display a message in the tableBody:
    // tableBody.innerHTML = '<tr><td colspan="9">Please log in to view reagents.</td></tr>';
  }
});
