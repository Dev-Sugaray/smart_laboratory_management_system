import { addData, getAllData, updateData, deleteData } from './db.js';

// software.js - Handles CRUD for software licenses
document.addEventListener('DOMContentLoaded', async function () {
  let softwareList = [];
  let suppliers = [];
  const tableBody = document.querySelector('tbody');
  const addBtn = document.getElementById('add-software-btn');
  const modalElement = document.getElementById('softwareModal');
  const modal = new bootstrap.Modal(modalElement);
  const form = document.getElementById('software-form');
  const supplierSelect = document.getElementById('supplierId');
  let editId = null;

  async function initialize() {
    await fetchSuppliers();
    await fetchSoftware();
  }

  async function fetchSuppliers() {
    try {
      suppliers = await getAllData('suppliers');
      populateSupplierDropdown();
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  }

  function populateSupplierDropdown() {
    supplierSelect.innerHTML = '<option value="">Select a Supplier</option>'; // Default option
    suppliers.forEach(supplier => {
      supplierSelect.innerHTML += `<option value="${supplier.id}">${supplier.name}</option>`;
    });
  }

  function getSupplierName(supplierId) {
    if (!supplierId) return '-';
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'Unknown';
  }

  function renderTable() {
    tableBody.innerHTML = '';
    if (softwareList.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No software found.</td></tr>';
      return;
    }
    softwareList.forEach((software, idx) => {
      tableBody.innerHTML += `
        <tr>
          <th scope="row">${idx + 1}</th>
          <td>${software.name}</td>
          <td>${software.version || '-'}</td>
          <td>${software.license_key || '-'}</td>
          <td>${software.expiry_date ? new Date(software.expiry_date).toLocaleDateString() : '-'}</td>
          <td>${software.num_licenses}</td>
          <td>${getSupplierName(software.supplierId)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="editSoftware(${software.id})">Edit</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteSoftware(${software.id})">Delete</button>
          </td>
        </tr>
      `;
    });
  }

  async function fetchSoftware() {
    try {
      softwareList = await getAllData('software');
      renderTable();
    } catch (error) {
      console.error('Failed to fetch software:', error);
      tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Error loading software.</td></tr>';
    }
  }

  window.editSoftware = function(id) {
    const software = softwareList.find(s => s.id === id);
    if (!software) return;
    editId = id;
    form.softwareId.value = software.id;
    form.name.value = software.name;
    form.version.value = software.version || '';
    form.license_key.value = software.license_key || '';
    form.expiry_date.value = software.expiry_date ? software.expiry_date.split('T')[0] : '';
    form.num_licenses.value = software.num_licenses;
    form.supplierId.value = software.supplierId || '';

    document.getElementById('softwareModalLabel').textContent = 'Edit Software';
    modal.show();
  };

  window.deleteSoftware = async function(id) {
    if (confirm('Are you sure you want to delete this software entry?')) {
      try {
        await deleteData('software', id);
        fetchSoftware();
      } catch (error) {
        console.error('Failed to delete software:', error);
        alert(`Failed to delete software: ${error.message}`);
      }
    }
  };

  addBtn.addEventListener('click', function() {
    editId = null;
    form.reset();
    document.getElementById('softwareModalLabel').textContent = 'Add Software';
    modal.show();
  });

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const payload = {
      name: form.name.value.trim(),
      version: form.version.value.trim(),
      license_key: form.license_key.value.trim(),
      expiry_date: form.expiry_date.value,
      num_licenses: parseInt(form.num_licenses.value, 10),
      supplierId: form.supplierId.value ? parseInt(form.supplierId.value, 10) : null,
    };

    if (!payload.name || !payload.num_licenses) {
      alert('Software Name and Number of Licenses are required.');
      return;
    }
    if (isNaN(payload.num_licenses) || payload.num_licenses < 0) {
      alert('Number of Licenses must be a non-negative number.');
      return;
    }

    try {
      if (editId) {
        await updateData('software', { id: editId, ...payload });
      } else {
        await addData('software', payload);
      }
      modal.hide();
      fetchSoftware();
    } catch (error) {
      console.error('Failed to save software:', error);
      alert(`Failed to save software: ${error.message}`);
    }
  });

  initialize();
});
