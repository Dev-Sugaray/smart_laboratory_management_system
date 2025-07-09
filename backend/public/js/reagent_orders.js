document.addEventListener('DOMContentLoaded', function () {
  let reagentOrders = [];
  let reagents = [];
  let suppliers = [];
  const tableBody = document.querySelector('table tbody');
  const addBtn = document.getElementById('add-reagent-order-btn');
  const modalElement = document.getElementById('reagentOrderModal');
  const modal = new bootstrap.Modal(modalElement);
  const form = document.getElementById('reagent-order-form');
  let editingOrderId = null;

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

  function getReagentName(reagentId) {
    const reagent = reagents.find(r => r.id === reagentId);
    return reagent ? reagent.name : 'Unknown Reagent';
  }

  function getSupplierName(supplierId) {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'Unknown Supplier';
  }

  function renderTable() {
    if (!tableBody) {
        console.error('Table body not found for rendering reagent orders.');
        return;
    }
    tableBody.innerHTML = ''; // Clear existing rows
    if (reagentOrders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No reagent orders found.</td></tr>';
        return;
    }

    reagentOrders.forEach((order, index) => {
      const row = `
        <tr>
          <th scope="row">${index + 1}</th>
          <td>${order.id}</td>
          <td>${getReagentName(order.reagent_id)}</td>
          <td>${getSupplierName(order.supplier_id)}</td>
          <td>${order.quantity} ${order.unit || ''}</td>
          <td><span class="badge bg-${getStatusColor(order.status)}">${order.status}</span></td>
          <td>${formatDate(order.order_date)}</td>
          <td>${formatDate(order.expected_delivery_date)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary me-1" onclick="editReagentOrder(${order.id})">Edit</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteReagentOrder(${order.id})">Delete</button>
          </td>
        </tr>
      `;
      tableBody.innerHTML += row;
    });
  }

  function getStatusColor(status) {
    switch (status) {
      case 'Delivered': return 'success';
      case 'Shipped': return 'info';
      case 'Ordered': return 'primary';
      case 'Pending': return 'warning text-dark';
      case 'Cancelled': return 'danger';
      default: return 'secondary';
    }
  }

  async function fetchReagents() {
    try {
      const response = await fetch('/api/reagents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch reagents');
      reagents = await response.json();
      populateReagentDropdown();
    } catch (error) {
      console.error('Error fetching reagents:', error);
    }
  }

  async function fetchSuppliers() {
    try {
      const response = await fetch('/api/suppliers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch suppliers');
      suppliers = await response.json();
      populateSupplierDropdown();
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  }

  function populateReagentDropdown() {
    const select = form.reagent_id;
    select.innerHTML = '<option value="">Select Reagent</option>'; // Default option
    reagents.forEach(reagent => {
      select.innerHTML += `<option value="${reagent.id}">${reagent.name}</option>`;
    });
  }

  function populateSupplierDropdown() {
    const select = form.supplier_id;
    select.innerHTML = '<option value="">Select Supplier</option>'; // Default option
    suppliers.forEach(supplier => {
      select.innerHTML += `<option value="${supplier.id}">${supplier.name}</option>`;
    });
  }

  async function fetchReagentOrders() {
    try {
      const response = await fetch('/api/reagent_orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            alert('Authentication error. Please log in again.');
            window.location.href = '/index.html';
        }
        throw new Error(`Failed to fetch reagent orders: ${response.status}`);
      }
      reagentOrders = await response.json();
      renderTable();
    } catch (error) {
      console.error('Error fetching reagent orders:', error);
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center">Error loading reagent orders.</td></tr>';
      }
    }
  }

  window.editReagentOrder = function(id) {
    const order = reagentOrders.find(o => o.id === id);
    if (!order) return;

    editingOrderId = id;
    form.orderId.value = order.id;
    form.reagent_id.value = order.reagent_id;
    form.supplier_id.value = order.supplier_id;
    form.quantity.value = order.quantity;
    form.status.value = order.status;
    form.order_date.value = order.order_date ? order.order_date.split('T')[0] : '';
    form.expected_delivery_date.value = order.expected_delivery_date ? order.expected_delivery_date.split('T')[0] : '';
    form.notes.value = order.notes || '';

    document.getElementById('reagentOrderModalLabel').textContent = 'Edit Reagent Order';
    modal.show();
  };

  window.deleteReagentOrder = async function(id) {
    if (confirm('Are you sure you want to delete this reagent order? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/reagent_orders/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to delete reagent order: ${response.status}`);
        }
        fetchReagentOrders(); // Refresh the table
      } catch (error) {
        console.error('Error deleting reagent order:', error);
        alert(`Error deleting reagent order: ${error.message}`);
      }
    }
  };

  addBtn.addEventListener('click', () => {
    editingOrderId = null;
    form.reset();
    form.orderId.value = '';
    document.getElementById('reagentOrderModalLabel').textContent = 'Add New Reagent Order';
    form.status.value = 'Pending'; // Default status
    form.order_date.valueAsDate = new Date(); // Default order date to today
    modal.show();
  });

  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    const orderData = {
      reagent_id: parseInt(form.reagent_id.value),
      supplier_id: parseInt(form.supplier_id.value),
      quantity: parseInt(form.quantity.value),
      status: form.status.value,
      order_date: form.order_date.value,
      expected_delivery_date: form.expected_delivery_date.value || null,
      notes: form.notes.value
    };

    if (!orderData.reagent_id || !orderData.supplier_id || !orderData.quantity || !orderData.order_date) {
        alert('Reagent, Supplier, Quantity, and Order Date are required.');
        return;
    }

    const url = editingOrderId ? `/api/reagent_orders/${editingOrderId}` : '/api/reagent_orders';
    const method = editingOrderId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to save reagent order: ${response.status}`);
      }
      modal.hide();
      fetchReagentOrders(); // Refresh table
    } catch (error) {
      console.error('Error saving reagent order:', error);
      alert(`Error saving reagent order: ${error.message}`);
    }
  });

  // Initial data fetch
  async function init() {
    await fetchReagents(); // Fetch reagents first for dropdown
    await fetchSuppliers(); // Fetch suppliers for dropdown
    await fetchReagentOrders(); // Then fetch orders which might depend on reagent/supplier names
  }

  init();
});
