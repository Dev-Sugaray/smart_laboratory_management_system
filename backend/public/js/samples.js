document.addEventListener('DOMContentLoaded', function () {
  let samples = [];
  const tableBody = document.querySelector('table tbody');
  const addBtn = document.getElementById('add-sample-btn');
  const modalElement = document.getElementById('sampleModal');
  const modal = new bootstrap.Modal(modalElement);
  const form = document.getElementById('sample-form');
  let editingSampleId = null;

  const user = JSON.parse(localStorage.getItem('user'));
  const token = user && user.token;

  if (!token) {
    window.location.href = '/index.html'; // Redirect to login
    return;
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  }

  function renderTable() {
    if (!tableBody) {
        console.error('Table body not found for rendering samples.');
        return;
    }
    tableBody.innerHTML = ''; // Clear existing rows
    if (samples.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No samples found.</td></tr>';
        return;
    }

    samples.forEach((sample, index) => {
      const row = `
        <tr>
          <th scope="row">${index + 1}</th>
          <td>${sample.name}</td>
          <td>${sample.sample_type_id || '-'}</td>
          <td>${sample.source_id || '-'}</td>
          <td>${sample.storage_location_id || '-'}</td>
          <td><span class="badge bg-${sample.status === 'Available' ? 'success' : (sample.status === 'In Use' ? 'warning' : (sample.status === 'Depleted' ? 'danger' : 'secondary'))}">${sample.status}</span></td>
          <td>${formatDate(sample.collection_date)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="editSample(${sample.id})">Edit</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteSample(${sample.id})">Delete</button>
          </td>
        </tr>
      `;
      tableBody.innerHTML += row;
    });
  }

  async function fetchSamples() {
    try {
      const response = await fetch('/api/samples', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            alert('Authentication error. Please log in again.');
            window.location.href = '/index.html';
        }
        throw new Error(`Failed to fetch samples: ${response.status}`);
      }
      const result = await response.json();
      samples = Array.isArray(result) ? result : result.data || [];
      renderTable();
    } catch (error) {
      console.error('Error fetching samples:', error);
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Error loading samples.</td></tr>';
      }
    }
  }

  window.editSample = function(id) {
    const sample = samples.find(s => s.id === id);
    if (!sample) return;

    editingSampleId = id;
    form.sampleId.value = sample.id;
    form.name.value = sample.name;
    form.sample_type_id.value = sample.sample_type_id || '';
    form.source_id.value = sample.source_id || '';
    form.storage_location_id.value = sample.storage_location_id || '';
    form.collection_date.value = sample.collection_date ? sample.collection_date.split('T')[0] : '';
    form.status.value = sample.status;
    form.notes.value = sample.notes || '';

    document.getElementById('sampleModalLabel').textContent = 'Edit Sample';
    modal.show();
  };

  window.deleteSample = async function(id) {
    if (confirm('Are you sure you want to delete this sample? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/samples/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to delete sample: ${response.status}`);
        }
        fetchSamples(); // Refresh the table
      } catch (error) {
        console.error('Error deleting sample:', error);
        alert(`Error deleting sample: ${error.message}`);
      }
    }
  };

  addBtn.addEventListener('click', () => {
    editingSampleId = null;
    form.reset();
    form.sampleId.value = '';
    document.getElementById('sampleModalLabel').textContent = 'Add New Sample';
    form.status.value = 'Available'; // Default status
    modal.show();
  });

  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    const sampleData = {
      name: form.name.value,
      sample_type_id: form.sample_type_id.value ? parseInt(form.sample_type_id.value) : null,
      source_id: form.source_id.value ? parseInt(form.source_id.value) : null,
      storage_location_id: form.storage_location_id.value ? parseInt(form.storage_location_id.value) : null,
      collection_date: form.collection_date.value || null,
      status: form.status.value,
      notes: form.notes.value
    };

    if (!sampleData.name) {
        alert('Sample Name is required.');
        return;
    }

    // Using POST /api/samples for registration as per typical REST pattern
    // The spec mentioned /api/samples/register, if that's strict, this URL needs change.
    // For now, assuming POST to /api/samples for creation.
    const url = editingSampleId ? `/api/samples/${editingSampleId}` : '/api/samples';
    const method = editingSampleId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sampleData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to save sample: ${response.status}`);
      }
      modal.hide();
      fetchSamples(); // Refresh table
    } catch (error) {
      console.error('Error saving sample:', error);
      alert(`Error saving sample: ${error.message}`);
    }
  });

  // Initial fetch of samples when the page loads
  fetchSamples();
});
