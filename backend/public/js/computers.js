import { addData, getAllData, updateData, deleteData } from './db.js';

document.addEventListener('DOMContentLoaded', function () {
  let computers = [];
  const addBtn = document.getElementById('add-computer-btn');
  const modalElement = document.getElementById('computerModal');
  const modal = new bootstrap.Modal(modalElement);
  const form = document.getElementById('computer-form');
  let editingComputerId = null; // To store the ID of the computer being edited

  const user = JSON.parse(localStorage.getItem('user'));

  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  }

  function renderTable() {
    const currentTableBody = document.querySelector('table tbody');
    if (!currentTableBody) {
        console.error('Table body not found for rendering computers.');
        return;
    }
    currentTableBody.innerHTML = ''; // Clear existing rows
    if (computers.length === 0) {
        currentTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No computers found.</td></tr>';
        return;
    }

    computers.forEach((computer, index) => {
      const row = `
        <tr>
          <th scope="row">${index + 1}</th>
          <td>${computer.name}</td>
          <td>${computer.make || '-'}</td>
          <td>${computer.model || '-'}</td>
          <td>${computer.serial_number}</td>
          <td><span class="badge bg-${computer.status === 'Available' ? 'success' : (computer.status === 'In Use' ? 'warning' : (computer.status === 'Under Maintenance' ? 'danger' : 'secondary'))}">${computer.status}</span></td>
          <td>${formatDate(computer.purchase_date)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="editComputer(${computer.id})">Edit</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteComputer(${computer.id})">Delete</button>
          </td>
        </tr>
      `;
      currentTableBody.innerHTML += row;
    });
  }

  async function fetchComputers() {
    try {
      computers = await getAllData('computers');
      renderTable();
    } catch (error) {
      console.error('Error fetching computers:', error);
      const currentTableBody = document.querySelector('table tbody');
      if (currentTableBody) {
        currentTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Error loading computers.</td></tr>';
      }
    }
  }

  window.editComputer = function(id) {
    const computer = computers.find(comp => comp.id === id);
    if (!computer) return;

    editingComputerId = id;
    form.computerId.value = computer.id; // Hidden field for ID
    form.name.value = computer.name;
    form.make.value = computer.make || '';
    form.model.value = computer.model || '';
    form.serial_number.value = computer.serial_number;
    form.purchase_date.value = computer.purchase_date ? computer.purchase_date.split('T')[0] : ''; // Format for date input
    form.maintenance_schedule.value = computer.maintenance_schedule || '';
    form.status.value = computer.status;

    document.getElementById('computerModalLabel').textContent = 'Edit Computer';
    modal.show();
  };

  window.deleteComputer = async function(id) {
    if (confirm('Are you sure you want to delete this computer? This action cannot be undone.')) {
      try {
        await deleteData('computers', id);
        fetchComputers(); // Refresh the table
      } catch (error) {
        console.error('Error deleting computer:', error);
        alert(`Error deleting computer: ${error.message}`);
      }
    }
  };

  addBtn.addEventListener('click', () => {
    editingComputerId = null;
    form.reset(); // Clear form fields
    form.computerId.value = ''; // Clear hidden ID field
    document.getElementById('computerModalLabel').textContent = 'Add New Computer';
    form.status.value = 'Available'; // Default status
    modal.show();
  });

  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    const computerData = {
      name: form.name.value,
      make: form.make.value,
      model: form.model.value,
      serial_number: form.serial_number.value,
      purchase_date: form.purchase_date.value || null, // Send null if empty
      maintenance_schedule: form.maintenance_schedule.value,
      status: form.status.value
    };

    if (!computerData.name || !computerData.serial_number) {
        alert('Computer Name and Serial Number are required.');
        return;
    }

    try {
      if (editingComputerId) {
        await updateData('computers', { id: editingComputerId, ...computerData });
      } else {
        await addData('computers', computerData);
      }

      modal.hide();
      fetchComputers(); // Refresh table
    } catch (error) {
      console.error('Error saving computer:', error);
      alert(`Error saving computer: ${error.message}`);
    }
  });

  fetchComputers();
});
