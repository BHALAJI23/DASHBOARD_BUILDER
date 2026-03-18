import { supabase } from './supabase-config.js';
import { showNotification, formatCurrency, formatDate, validateForm } from './utils.js';

let ordersData = [];
let currentPage = 1;
const itemsPerPage = 10;
let sortField = 'created_at';
let sortOrder = 'desc';
let editingOrderId = null;

// 🚀 INITIALIZE
export async function initializeOrders() {
    const ordersSection = document.getElementById('orders-section');

    ordersSection.innerHTML = `
        <div class="orders-header">
            <h2>Customer Orders</h2>
            <button class="btn-primary" onclick="window.openCreateOrderModal()">+ New Order</button>
        </div>
        
        <div class="orders-table-container">
            <table class="orders-table">
                <thead>
                    <tr>
                        <th onclick="window.sortOrders('customer_name')">Customer Name</th>
                        <th onclick="window.sortOrders('product_name')">Product</th>
                        <th onclick="window.sortOrders('quantity')">Quantity</th>
                        <th onclick="window.sortOrders('unit_price')">Unit Price</th>
                        <th onclick="window.sortOrders('total_amount')">Total Amount</th>
                        <th onclick="window.sortOrders('order_date')">Order Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="orders-tbody">
                    <tr><td colspan="7" style="text-align:center;padding:2rem;">Loading...</td></tr>
                </tbody>
            </table>
        </div>

        <div class="pagination" id="pagination"></div>

        <div id="order-modal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modal-title">Create Order</h3>
                    <button class="modal-close" onclick="window.closeCreateOrderModal()">×</button>
                </div>

                <div class="modal-body">
                    <div id="form-errors" class="error-message"></div>

                    <form id="order-form">
                        <div class="form-group">
                            <label>Customer Name *</label>
                            <input type="text" id="customer_name" required>
                        </div>

                        <div class="form-group">
                            <label>Product Name *</label>
                            <input type="text" id="product_name" required>
                        </div>

                        <div class="form-group">
                            <label>Quantity *</label>
                            <input type="number" id="quantity" min="1" required>
                        </div>

                        <div class="form-group">
                            <label>Unit Price *</label>
                            <input type="number" id="unit_price" min="0" step="0.01" required>
                        </div>

                        <div class="form-group">
                            <label>Total Amount</label>
                            <input type="number" id="total_amount" disabled>
                        </div>
                    </form>
                </div>

                <div class="modal-footer">
                    <button class="btn-cancel" onclick="window.closeCreateOrderModal()">Cancel</button>
                    <button class="btn-primary" onclick="window.submitOrderForm()">Save</button>
                </div>
            </div>
        </div>
    `;

    // ✅ Auto Calculate Total
    document.addEventListener('input', (e) => {
        if (e.target.id === 'quantity' || e.target.id === 'unit_price') {
            const q = parseFloat(document.getElementById('quantity').value) || 0;
            const p = parseFloat(document.getElementById('unit_price').value) || 0;

            const totalField = document.getElementById('total_amount');
            if (totalField) {
                totalField.value = (q * p).toFixed(2);
            }
        }
    });

    // expose functions
    window.openCreateOrderModal = openCreateOrderModal;
    window.closeCreateOrderModal = closeCreateOrderModal;
    window.submitOrderForm = submitOrderForm;
    window.sortOrders = sortOrders;
    window.goToPage = goToPage;
    window.editOrder = editOrder;
    window.deleteOrder = deleteOrder;

    await loadOrders();
}

// 📥 LOAD ORDERS
async function loadOrders() {
    try {
        const { data, error } = await supabase
            .from('customer_orders')
            .select('*')
            .order(sortField, { ascending: sortOrder === 'asc' });

        if (error) throw error;

        ordersData = data || [];
        renderOrdersTable();
        renderPagination();
    } catch (err) {
        console.error(err);
        showNotification('Error loading orders', 'error');
    }
}

// 📊 TABLE
function renderOrdersTable() {
    const tbody = document.getElementById('orders-tbody');

    const start = (currentPage - 1) * itemsPerPage;
    const pageData = ordersData.slice(start, start + itemsPerPage);

    if (!pageData.length) {
        tbody.innerHTML = `<tr><td colspan="7">No data</td></tr>`;
        return;
    }

    tbody.innerHTML = pageData.map(o => `
        <tr>
            <td>${o.customer_name}</td>
            <td>${o.product_name}</td>
            <td>${o.quantity}</td>
            <td>${formatCurrency(o.unit_price)}</td>
            <td><b>${formatCurrency(o.total_amount)}</b></td>
            <td>${formatDate(o.order_date || o.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-edit" onclick="editOrder('${o.id}')">Edit</button>
                    <button class="btn-delete" onclick="deleteOrder('${o.id}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// 📄 PAGINATION
function renderPagination() {
    const totalPages = Math.ceil(ordersData.length / itemsPerPage);
    const el = document.getElementById('pagination');

    el.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        el.innerHTML += `<button onclick="goToPage(${i})">${i}</button>`;
    }
}

function goToPage(p) {
    currentPage = p;
    renderOrdersTable();
    renderPagination();
}

// 🔽 SORT
function sortOrders(field) {
    if (sortField === field) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        sortField = field;
        sortOrder = 'asc';
    }
    loadOrders();
}

// 🧾 MODAL
function openCreateOrderModal() {
    document.getElementById('order-modal').classList.add('show');
    document.getElementById('order-form').reset();
    document.getElementById('form-errors').classList.remove('show');

    document.getElementById('modal-title').textContent =
        editingOrderId ? 'Edit Order' : 'Create Order';
}

function closeCreateOrderModal() {
    editingOrderId = null;
    document.getElementById('order-modal').classList.remove('show');
}

// 💾 SAVE / UPDATE
async function submitOrderForm() {
    const formData = {
        customer_name: document.getElementById('customer_name').value,
        product_name: document.getElementById('product_name').value,
        quantity: parseFloat(document.getElementById('quantity').value),
        unit_price: parseFloat(document.getElementById('unit_price').value),
    };

    formData.total_amount = formData.quantity * formData.unit_price;
    formData.order_date = new Date().toISOString();

    const errors = validateForm(formData, {
        customer_name: { required: true },
        product_name: { required: true },
        quantity: { required: true, min: 1 },
        unit_price: { required: true, min: 0 }
    });

    if (Object.keys(errors).length) {
        document.getElementById('form-errors').textContent = "Please fill the field";
        document.getElementById('form-errors').classList.add('show');
        return;
    }

    try {
        let query;
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
             throw new Error('You must be logged in to save an order.');
        }

        if (editingOrderId) {
            query = supabase
                .from('customer_orders')
                .update(formData)
                .eq('id', editingOrderId)
                .eq('user_id', session.user.id); // extra security
        } else {
            formData.user_id = session.user.id;
            query = supabase
                .from('customer_orders')
                .insert([formData]);
        }

        const { error } = await query;
        if (error) throw error;

        showNotification('Saved successfully');
        closeCreateOrderModal();
        await loadOrders();

    } catch (err) {
        console.error(err);
        showNotification('Error saving order', 'error');
    }
}

// ✏️ EDIT
function editOrder(id) {
    const o = ordersData.find(x => x.id === id);
    if (!o) return;

    editingOrderId = id;

    document.getElementById('customer_name').value = o.customer_name;
    document.getElementById('product_name').value = o.product_name;
    document.getElementById('quantity').value = o.quantity;
    document.getElementById('unit_price').value = o.unit_price;
    document.getElementById('total_amount').value = o.total_amount;

    openCreateOrderModal();
}

// ❌ DELETE
async function deleteOrder(id) {
    if (!confirm('Delete this order?')) return;

    try {
        const { error } = await supabase
            .from('customer_orders')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showNotification('Deleted successfully');
        await loadOrders();

    } catch (err) {
        console.error(err);
        showNotification('Error deleting', 'error');
    }
}