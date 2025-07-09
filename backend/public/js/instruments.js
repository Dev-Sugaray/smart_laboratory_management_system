document.addEventListener('DOMContentLoaded', function () {
  let instruments = [];
  const tableBody = document.querySelector('#instruments-table-body'); // Ensure this ID exists in your HTML table body
  const addBtn = document.getElementById('add-instrument-btn');
  const modalElement = document.getElementById('instrumentModal');
  const modal = new bootstrap.Modal(modalElement);
  const form = document.getElementById('instrument-form');
  let editingInstrumentId = null; // To store the ID of the instrument being edited

  const user = JSON.parse(localStorage.getItem('user'));
  const token = user && user.token;

  if (!token) {
    // Redirect to login if no token (or handle as per app's auth flow)
    window.location.href = '/index.html';
    return;
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  }

  function renderTable() {
    // If tableBody doesn't exist in the HTML, this will fail.
    // It should be: <tbody id="instruments-table-body">
    const currentTableBody = document.querySelector('table tbody'); // More robust selector
    if (!currentTableBody) {
        console.error('Table body not found for rendering instruments.');
        return;
    }
    currentTableBody.innerHTML = ''; // Clear existing rows
    if (instruments.length === 0) {
        currentTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No instruments found.</td></tr>';
        return;
    }

    instruments.forEach((instrument, index) => {
      const row = `
        <tr>
          <th scope="row">${index + 1}</th>
          <td>${instrument.name}</td>
          <td>${instrument.make || '-'}</td>
          <td>${instrument.model || '-'}</td>
          <td>${instrument.serial_number}</td>
          <td><span class="badge bg-${instrument.status === 'Available' ? 'success' : (instrument.status === 'In Use' ? 'warning' : (instrument.status === 'Under Maintenance' ? 'danger' : 'secondary'))}">${instrument.status}</span></td>
          <td>${formatDate(instrument.calibration_date)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="editInstrument(${instrument.id})">Edit</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteInstrument(${instrument.id})">Delete</button>
          </td>
        </tr>
      `;
      currentTableBody.innerHTML += row;
    });
  }

  async function fetchInstruments() {
    try {
      const response = await fetch('/api/instruments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            alert('Authentication error. Please log in again.');
            window.location.href = '/index.html';
        }
        throw new Error(`Failed to fetch instruments: ${response.status}`);
      }
      instruments = await response.json();
      renderTable();
    } catch (error) {
      console.error('Error fetching instruments:', error);
      const currentTableBody = document.querySelector('table tbody');
      if (currentTableBody) {
        currentTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Error loading instruments.</td></tr>';
      }
    }
  }

  window.editInstrument = function(id) {
    const instrument = instruments.find(instr => instr.id === id);
    if (!instrument) return;

    editingInstrumentId = id;
    form.instrumentId.value = instrument.id; // Hidden field for ID
    form.name.value = instrument.name;
    form.make.value = instrument.make || '';
    form.model.value = instrument.model || '';
    form.serial_number.value = instrument.serial_number;
    form.calibration_date.value = instrument.calibration_date ? instrument.calibration_date.split('T')[0] : ''; // Format for date input
    form.maintenance_schedule.value = instrument.maintenance_schedule || '';
    form.status.value = instrument.status;

    document.getElementById('instrumentModalLabel').textContent = 'Edit Instrument';
    modal.show();
  };

  window.deleteInstrument = async function(id) {
    if (confirm('Are you sure you want to delete this instrument? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/instruments/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to delete instrument: ${response.status}`);
        }
        // alert('Instrument deleted successfully!');
        fetchInstruments(); // Refresh the table
      } catch (error) {
        console.error('Error deleting instrument:', error);
        alert(`Error deleting instrument: ${error.message}`);
      }
    }
  };

  addBtn.addEventListener('click', () => {
    editingInstrumentId = null;
    form.reset(); // Clear form fields
    form.instrumentId.value = ''; // Clear hidden ID field
    document.getElementById('instrumentModalLabel').textContent = 'Add New Instrument';
    form.status.value = 'Available'; // Default status
    modal.show();
  });

  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    const instrumentData = {
      name: form.name.value,
      make: form.make.value,
      model: form.model.value,
      serial_number: form.serial_number.value,
      calibration_date: form.calibration_date.value || null, // Send null if empty
      maintenance_schedule: form.maintenance_schedule.value,
      status: form.status.value
    };

    // Basic validation
    if (!instrumentData.name || !instrumentData.serial_number) {
        alert('Instrument Name and Serial Number are required.');
        return;
    }

    const url = editingInstrumentId ? `/api/instruments/${editingInstrumentId}` : '/api/instruments';
    const method = editingInstrumentId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(instrumentData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to save instrument: ${response.status}`);
      }

      // const result = await response.json();
      // alert(`Instrument ${editingInstrumentId ? 'updated' : 'added'} successfully!`);
      modal.hide();
      fetchInstruments(); // Refresh table
    } catch (error) {
      console.error('Error saving instrument:', error);
      alert(`Error saving instrument: ${error.message}`);
    }
  });

  // Initial fetch of instruments when the page loads
  fetchInstruments();
});
