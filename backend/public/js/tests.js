import { addData, getAllData, updateData, deleteData } from './db.js';

// tests.js - Handles CRUD for test definitions
document.addEventListener('DOMContentLoaded', function () {
  let tests = [];
  const tableBody = document.querySelector('tbody');
  const addBtn = document.getElementById('add-test-btn');
  const modal = new bootstrap.Modal(document.getElementById('testModal'));
  const form = document.getElementById('test-form');
  let editingTestId = null; // To store the ID of the test being edited

  const user = JSON.parse(localStorage.getItem('user'));

  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  }

  function renderTable() {
    if (!tableBody) {
        console.error('Table body not found for rendering tests.');
        return;
    }
    tableBody.innerHTML = ''; // Clear existing rows
    if (tests.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No tests found.</td></tr>';
        return;
    }

    tests.forEach((test, index) => {
      const row = `
        <tr>
          <th scope="row">${index + 1}</th>
          <td>${test.name}</td>
          <td>${test.description || '-'}</td>
          <td>${formatDate(test.created_at)}</td>
          <td>${formatDate(test.updated_at)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="editTest(${test.id})">Edit</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteTest(${test.id})">Delete</button>
          </td>
        </tr>
      `;
      tableBody.innerHTML += row;
    });
  }

  async function fetchTests() {
    try {
      tests = await getAllData('tests');
      renderTable();
    } catch (error) {
      console.error('Error fetching tests:', error);
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Error loading tests.</td></tr>';
      }
    }
  }

  window.editTest = function(id) {
    const test = tests.find(t => t.id === id);
    if (!test) return;

    editingTestId = id;
    form.testId.value = test.id; // Hidden field for ID
    form.name.value = test.name;
    form.description.value = test.description || '';

    document.getElementById('testModalLabel').textContent = 'Edit Test';
    modal.show();
  };

  window.deleteTest = async function(id) {
    if (confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
      try {
        await deleteData('tests', id);
        fetchTests(); // Refresh the table
      } catch (error) {
        console.error('Error deleting test:', error);
        alert(`Error deleting test: ${error.message}`);
      }
    }
  };

  addBtn.addEventListener('click', () => {
    editingTestId = null;
    form.reset(); // Clear form fields
    form.testId.value = ''; // Clear hidden ID field
    document.getElementById('testModalLabel').textContent = 'Add New Test';
    modal.show();
  });

  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    const testData = {
      name: form.name.value,
      description: form.description.value,
    };

    if (!testData.name) {
        alert('Test Name is required.');
        return;
    }

    try {
      if (editingTestId) {
        await updateData('tests', { id: editingTestId, ...testData });
      } else {
        await addData('tests', testData);
      }
      modal.hide();
      fetchTests(); // Refresh table
    } catch (error) {
      console.error('Error saving test:', error);
      alert(`Error saving test: ${error.message}`);
    }
  });

  // Initial fetch of tests when the page loads
  fetchTests();
});
