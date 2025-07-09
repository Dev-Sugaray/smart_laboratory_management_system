// suppliers.js - Handles CRUD for suppliers
document.addEventListener('DOMContentLoaded', function () {
  let suppliers = [];
  const tableBody = document.querySelector('tbody');
  const addBtn = document.getElementById('add-supplier-btn');
  const modal = new bootstrap.Modal(document.getElementById('supplierModal'));
  const form = document.getElementById('supplier-form');
  let editId = null; // To store the ID of the supplier being edited
  const user = JSON.parse(localStorage.getItem('user'));
  const token = user && user.token;

  function renderTable() {
    tableBody.innerHTML = ''; // Clear existing rows
    suppliers.forEach((supplier, idx) => {
      tableBody.innerHTML += `
        <tr>
          <th scope="row">${idx + 1}</th>
          <td>${supplier.name}</td>
          <td>${supplier.contact_name || '-'}</td>
          <td>${supplier.email || '-'}</td>
          <td>${supplier.phone || '-'}</td>
          <td>${supplier.address || '-'}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="editSupplier(${supplier.id})">Edit</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteSupplier(${supplier.id})">Delete</button>
          </td>
        </tr>
      `;
    });
  }

  async function fetchSuppliers() {
    if (!token) {
      console.warn('User token not found. Suppliers data will not be loaded.');
      tableBody.innerHTML = '<tr><td colspan="7">Please log in to view suppliers.</td></tr>';
      return;
    }
    try {
      const res = await fetch('/api/suppliers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error(`Error fetching suppliers: ${res.statusText} (${res.status})`);
      }
      suppliers = await res.json();
      renderTable();
    } catch (error) {
      console.error(error);
      tableBody.innerHTML = `<tr><td colspan="7">Error loading suppliers: ${error.message}</td></tr>`;
    }
  }

  window.editSupplier = function(id) {
    const supplier = suppliers.find(s => s.id === id);
    if (!supplier) return;
    editId = id;
    form['name'].value = supplier.name;
    form['contact_name'].value = supplier.contact_name || '';
    form['email'].value = supplier.email || '';
    form['phone'].value = supplier.phone || '';
    form['address'].value = supplier.address || '';
    document.getElementById('supplierModalLabel').textContent = 'Edit Supplier';
    modal.show();
  };

  window.deleteSupplier = async function(id) {
    if (confirm('Are you sure you want to delete this supplier?')) {
      if (!token) {
        alert('Authentication token not found. Please log in again.');
        return;
      }
      try {
        const res = await fetch(`/api/suppliers/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          throw new Error(`Error deleting supplier: ${res.statusText}`);
        }
        fetchSuppliers(); // Refresh table
      } catch (error) {
        console.error(error);
        alert(`Failed to delete supplier: ${error.message}`);
      }
    }
  };

  addBtn.addEventListener('click', function() {
    editId = null; // Reset editId for add operation
    form.reset(); // Clear form fields
    document.getElementById('supplierModalLabel').textContent = 'Add Supplier';
    modal.show();
  });

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const payload = {
      name: form['name'].value.trim(),
      contact_name: form['contact_name'].value.trim(),
      email: form['email'].value.trim(),
      phone: form['phone'].value.trim(),
      address: form['address'].value.trim()
    };

    if (!payload.name) {
        alert('Supplier Name is required.');
        return;
    }
    // Basic email validation (optional, but good practice)
    if (payload.email && !/.+@.+\..+/.test(payload.email)) {
        alert('Please enter a valid email address.');
        return;
    }

    const url = editId ? `/api/suppliers/${editId}` : '/api/suppliers';
    const method = editId ? 'PUT' : 'POST';

    if (!token) {
      alert('Authentication token not found. Please log in again.');
      return;
    }

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
        const errorData = await res.json().catch(() => ({ error: `Error saving supplier: ${res.statusText}` }));
        throw new Error(errorData.error || `Error saving supplier: ${res.statusText}`);
      }
      modal.hide();
      fetchSuppliers(); // Refresh table
    } catch (error) {
      console.error(error);
      alert(`Failed to save supplier: ${error.message}`);
    }
  });

  // Initial fetch of suppliers
  fetchSuppliers();
});
