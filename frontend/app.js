const API_URL = 'http://localhost:5000/api';
let currentUser = null;
let allProducts = [];
let allCategories = [];
let allUsers = [];
let billItems = [];
let editingProductId = null;

// Chart instances
let monthlySalesChart = null;
let profitChart = null;
let stockCategoryChart = null;
let bestSellersChart = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupEventListeners();
});

// ==================== AUTH MANAGEMENT ====================
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_URL}/auth/check`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.authenticated) {
            currentUser = data.user;
            showMainDashboard();
            loadDashboardData();
            
            // Show admin panel if user is admin
            if (currentUser.role === 'admin') {
                document.querySelectorAll('.admin-only').forEach(el => {
                    el.style.display = 'flex';
                });
            }
        } else {
            showLoginPage();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showLoginPage();
    }
}

function showLoginPage() {
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('mainDashboard').style.display = 'none';
}

function showMainDashboard() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('mainDashboard').style.display = 'flex';
    document.getElementById('currentUsername').textContent = currentUser.username;
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            navigateToPage(page);
        });
    });

    // Modals
    setupModalListeners();

    // Product management
    document.getElementById('addProductBtn')?.addEventListener('click', () => openProductModal());
    document.getElementById('productForm')?.addEventListener('submit', handleSaveProduct);

    // Category
    document.getElementById('addCategoryBtn')?.addEventListener('click', () => openCategoryModal());
    document.getElementById('categoryForm')?.addEventListener('submit', handleSaveCategory);

    // Billing
    document.getElementById('addBillItem')?.addEventListener('click', handleAddBillItem);
    document.getElementById('saveBillBtn')?.addEventListener('click', handleSaveBill);
    document.getElementById('clearBillBtn')?.addEventListener('click', handleClearBill);
    document.getElementById('printBillBtn')?.addEventListener('click', handlePrintBill);

    // Update totals when tax or discount changes
    document.getElementById('taxPercentage')?.addEventListener('change', updateBillTotals);
    document.getElementById('discountAmount')?.addEventListener('change', updateBillTotals);

    // Users
    document.getElementById('addUserBtn')?.addEventListener('click', () => openUserModal());
    document.getElementById('userForm')?.addEventListener('submit', handleSaveUser);

    // Search
    document.getElementById('searchInput')?.addEventListener('input', handleSearch);
}

function setupModalListeners() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        const closeButtons = modal.querySelectorAll('.close-modal');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => closeModal(modal));
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
    });
}

// ==================== AUTHENTICATION HANDLERS ====================
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            showMainDashboard();
            loadDashboardData();
            
            if (currentUser.role === 'admin') {
                document.querySelectorAll('.admin-only').forEach(el => {
                    el.style.display = 'flex';
                });
            }
        } else {
            showAlert('Error', data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Error', 'Login failed. Please try again.');
    }
}

async function handleLogout() {
    try {
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        currentUser = null;
        showLoginPage();
        document.getElementById('loginForm').reset();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ==================== PAGE NAVIGATION ====================
function navigateToPage(page) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
    
    // Remove active from nav items
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

    // Show selected page
    const pageElement = document.getElementById(page + '-page');
    if (pageElement) {
        pageElement.classList.add('active');
    }

    // Mark nav item as active
    document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

    // Update page title
    document.getElementById('pageTitle').textContent = page.charAt(0).toUpperCase() + page.slice(1);

    // Load page data
    switch (page) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'products':
            loadProducts();
            break;
        case 'billing':
            loadBillingData();
            break;
        case 'reports':
            loadReportsData();
            break;
        case 'users':
            loadUsers();
            break;
        case 'alerts':
            loadAlerts();
            break;
    }
}

// ==================== DASHBOARD ====================
async function loadDashboardData() {
    try {
        // Load stats
        const statsRes = await fetch(`${API_URL}/dashboard`, {
            credentials: 'include'
        });
        const stats = await statsRes.json();

        document.getElementById('totalProducts').textContent = stats.totalProducts;
        document.getElementById('lowStockItems').textContent = stats.lowStockItems;
        document.getElementById('totalSales').textContent = '₹' + stats.totalSales.toFixed(2);
        document.getElementById('totalProfit').textContent = '₹' + stats.totalProfit.toFixed(2);
        document.getElementById('todaysRevenue').textContent = '₹' + stats.todaysRevenue.toFixed(2);

        // Load charts
        loadCharts();
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

async function loadCharts() {
    try {
        // Monthly sales
        const salesRes = await fetch(`${API_URL}/reports/monthly-sales`, {
            credentials: 'include'
        });
        const salesData = await salesRes.json();

        // Profit
        const profitRes = await fetch(`${API_URL}/reports/profit`, {
            credentials: 'include'
        });
        const profitData = await profitRes.json();

        // Stock by category
        const stockRes = await fetch(`${API_URL}/reports/stock-category`, {
            credentials: 'include'
        });
        const stockData = await stockRes.json();

        // Best sellers
        const bestRes = await fetch(`${API_URL}/reports/best-sellers`, {
            credentials: 'include'
        });
        const bestData = await bestRes.json();

        // Prepare data
        const months = salesData.map(d => d.month || 'N/A');
        const salesValues = salesData.map(d => d.total || 0);
        const profitValues = profitData.map(d => d.profit || 0);

        // Monthly Sales Chart
        const ctx1 = document.getElementById('monthlySalesChart')?.getContext('2d');
        if (ctx1) {
            if (monthlySalesChart) monthlySalesChart.destroy();
            monthlySalesChart = new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Sales',
                        data: salesValues,
                        borderColor: '#00a8ff',
                        backgroundColor: 'rgba(0, 168, 255, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#00a8ff',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: true, labels: { color: '#b0b8c1' } }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#b0b8c1' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        },
                        x: {
                            ticks: { color: '#b0b8c1' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        }
                    }
                }
            });
        }

        // Profit Chart
        const ctx2 = document.getElementById('profitChart')?.getContext('2d');
        if (ctx2) {
            if (profitChart) profitChart.destroy();
            profitChart = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Profit',
                        data: profitValues,
                        backgroundColor: 'rgba(0, 208, 132, 0.7)',
                        borderColor: '#00d084',
                        borderWidth: 2,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: true, labels: { color: '#b0b8c1' } }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#b0b8c1' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        },
                        x: {
                            ticks: { color: '#b0b8c1' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        }
                    }
                }
            });
        }

        // Stock Category Chart
        const ctx3 = document.getElementById('stockCategoryChart')?.getContext('2d');
        if (ctx3 && stockData.length > 0) {
            if (stockCategoryChart) stockCategoryChart.destroy();
            stockCategoryChart = new Chart(ctx3, {
                type: 'doughnut',
                data: {
                    labels: stockData.map(d => d.category),
                    datasets: [{
                        data: stockData.map(d => d.total_quantity || 0),
                        backgroundColor: [
                            '#0066cc', '#00a8ff', '#00d4ff', '#667eea',
                            '#764ba2', '#ff6b6b', '#ffa500', '#00d084'
                        ],
                        borderColor: 'rgba(10, 20, 40, 0.95)',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: true, labels: { color: '#b0b8c1' } }
                    }
                }
            });
        }

        // Best Sellers Chart
        const ctx4 = document.getElementById('bestSellersChart')?.getContext('2d');
        if (ctx4 && bestData.length > 0) {
            if (bestSellersChart) bestSellersChart.destroy();
            bestSellersChart = new Chart(ctx4, {
                type: 'doughnut',
                data: {
                    labels: bestData.map(d => d.name),
                    datasets: [{
                        data: bestData.map(d => d.total_quantity || 0),
                        backgroundColor: [
                            '#00a8ff', '#667eea', '#764ba2', '#ff6b6b',
                            '#ffa500', '#00d084', '#0066cc', '#00d4ff'
                        ],
                        borderColor: 'rgba(10, 20, 40, 0.95)',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: { display: true, labels: { color: '#b0b8c1' } }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Charts load error:', error);
    }
}

// ==================== PRODUCTS MANAGEMENT ====================
async function loadProducts() {
    try {
        const [productsRes, categoriesRes] = await Promise.all([
            fetch(`${API_URL}/products`, { credentials: 'include' }),
            fetch(`${API_URL}/categories`, { credentials: 'include' })
        ]);

        allProducts = await productsRes.json();
        allCategories = await categoriesRes.json();

        displayProducts(allProducts);
        updateProductCategories();
    } catch (error) {
        console.error('Load products error:', error);
    }
}

function displayProducts(products) {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = products.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.category_name || 'N/A'}</td>
            <td>
                <span style="color: ${p.quantity <= p.reorder_level ? '#ff6b6b' : '#00d084'}">
                    ${p.quantity}
                </span>
            </td>
            <td>₹${p.unit_price.toFixed(2)}</td>
            <td>${p.reorder_level}</td>
            <td>
                <span style="color: ${p.quantity <= p.reorder_level ? '#ffa500' : '#00d084'}">
                    ${p.quantity <= p.reorder_level ? 'Low Stock' : 'OK'}
                </span>
            </td>
            <td>
                <button onclick="editProduct(${p.id})" class="btn-small" style="background: #667eea; margin-right: 5px;">Edit</button>
                <button onclick="deleteProduct(${p.id})" class="btn-small" style="background: #ff6b6b;">Delete</button>
            </td>
        </tr>
    `).join('');
}

function openProductModal(productId = null) {
    editingProductId = productId;
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');

    if (productId) {
        const product = allProducts.find(p => p.id === productId);
        title.textContent = 'Edit Product';
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category_id;
        document.getElementById('productQuantity').value = product.quantity;
        document.getElementById('productPrice').value = product.unit_price;
        document.getElementById('productReorderLevel').value = product.reorder_level;
    } else {
        title.textContent = 'Add Product';
        form.reset();
    }

    modal.classList.add('active');
}

async function handleSaveProduct(e) {
    e.preventDefault();
    const name = document.getElementById('productName').value;
    const category_id = document.getElementById('productCategory').value;
    const quantity = document.getElementById('productQuantity').value;
    const unit_price = document.getElementById('productPrice').value;
    const reorder_level = document.getElementById('productReorderLevel').value;

    try {
        const method = editingProductId ? 'PUT' : 'POST';
        const url = editingProductId 
            ? `${API_URL}/products/${editingProductId}` 
            : `${API_URL}/products`;

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, category_id, quantity, unit_price, reorder_level })
        });

        if (response.ok) {
            showAlert('Success', 'Product saved successfully');
            closeModal(document.getElementById('productModal'));
            loadProducts();
            editingProductId = null;
        } else {
            showAlert('Error', 'Failed to save product');
        }
    } catch (error) {
        console.error('Save product error:', error);
    }
}

async function editProduct(id) {
    openProductModal(id);
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        const response = await fetch(`${API_URL}/products/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            showAlert('Success', 'Product deleted successfully');
            loadProducts();
        } else {
            showAlert('Error', 'Failed to delete product');
        }
    } catch (error) {
        console.error('Delete product error:', error);
    }
}

// Categories
function openCategoryModal() {
    const modal = document.getElementById('categoryModal');
    document.getElementById('categoryForm').reset();
    modal.classList.add('active');
}

async function handleSaveCategory(e) {
    e.preventDefault();
    const name = document.getElementById('categoryName').value;
    const description = document.getElementById('categoryDescription').value;

    try {
        const response = await fetch(`${API_URL}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, description })
        });

        if (response.ok) {
            showAlert('Success', 'Category added successfully');
            closeModal(document.getElementById('categoryModal'));
            loadProducts();
        } else {
            showAlert('Error', 'Failed to add category');
        }
    } catch (error) {
        console.error('Save category error:', error);
    }
}

function updateProductCategories() {
    const select = document.getElementById('productCategory');
    const billSelect = document.getElementById('billProductSelect');

    const options = allCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    select.innerHTML = '<option value="">-- Select Category --</option>' + options;
}

// ==================== BILLING ====================
async function loadBillingData() {
    try {
        const response = await fetch(`${API_URL}/products`, {
            credentials: 'include'
        });
        allProducts = await response.json();
        
        const select = document.getElementById('billProductSelect');
        select.innerHTML = '<option value="">-- Select Product --</option>' +
            allProducts.map(p => `<option value="${p.id}" data-price="${p.unit_price}">${p.name} - ₹${p.unit_price.toFixed(2)}</option>`).join('');
        
        loadSalesHistory();
    } catch (error) {
        console.error('Load billing data error:', error);
    }
}

async function handleAddBillItem() {
    const productSelect = document.getElementById('billProductSelect');
    const quantityInput = document.getElementById('billQuantity');

    const productId = parseInt(productSelect.value);
    const quantity = parseInt(quantityInput.value);

    if (!productId || !quantity || quantity < 1) {
        showAlert('Error', 'Please select a product and enter quantity');
        return;
    }

    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    if (quantity > product.quantity) {
        showAlert('Error', `Insufficient stock. Available: ${product.quantity}`);
        return;
    }

    const existingItem = billItems.find(item => item.product_id === productId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        billItems.push({
            product_id: productId,
            product_name: product.name,
            unit_price: product.unit_price,
            quantity: quantity
        });
    }

    displayBillItems();
    updateBillTotals();
    productSelect.value = '';
    quantityInput.value = '';
}

function displayBillItems() {
    const tbody = document.getElementById('billItemsBody');
    tbody.innerHTML = billItems.map((item, index) => `
        <tr>
            <td>${item.product_name}</td>
            <td>${item.quantity}</td>
            <td>₹${item.unit_price.toFixed(2)}</td>
            <td>₹${(item.quantity * item.unit_price).toFixed(2)}</td>
            <td>
                <button onclick="removeBillItem(${index})" class="btn-small" style="background: #ff6b6b;">Remove</button>
            </td>
        </tr>
    `).join('');
}

function removeBillItem(index) {
    billItems.splice(index, 1);
    displayBillItems();
    updateBillTotals();
}

function updateBillTotals() {
    let subtotal = billItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxPercentage = parseFloat(document.getElementById('taxPercentage').value) || 0;
    const discount = parseFloat(document.getElementById('discountAmount').value) || 0;
    const tax = (subtotal * taxPercentage) / 100;
    const grandTotal = subtotal + tax - discount;

    document.getElementById('subtotal').textContent = '₹' + subtotal.toFixed(2);
    document.getElementById('taxAmount').textContent = '₹' + tax.toFixed(2);
    document.getElementById('discountDisplay').textContent = '₹' + discount.toFixed(2);
    document.getElementById('grandTotal').textContent = '₹' + grandTotal.toFixed(2);
}

async function handleSaveBill() {
    if (billItems.length === 0) {
        showAlert('Error', 'Please add items to the bill');
        return;
    }

    const taxPercentage = parseFloat(document.getElementById('taxPercentage').value) || 0;
    const discountAmount = parseFloat(document.getElementById('discountAmount').value) || 0;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const notes = document.getElementById('billNotes').value;

    try {
        const response = await fetch(`${API_URL}/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                items: billItems,
                taxPercentage,
                discountAmount,
                paymentMethod,
                notes
            })
        });

        if (response.ok) {
            const data = await response.json();
            showAlert('Success', `Sale created successfully!\nSale #: ${data.saleNumber}\nTotal: $${data.grandTotal.toFixed(2)}`);
            handleClearBill();
            loadSalesHistory();
            loadDashboardData();
        } else {
            showAlert('Error', 'Failed to save bill');
        }
    } catch (error) {
        console.error('Save bill error:', error);
    }
}

function handleClearBill() {
    billItems = [];
    displayBillItems();
    document.getElementById('taxPercentage').value = 18;
    document.getElementById('discountAmount').value = 0;
    document.getElementById('billNotes').value = '';
    updateBillTotals();
}

async function handlePrintBill() {
    if (billItems.length === 0) {
        showAlert('Error', 'Please add items to print bill');
        return;
    }

    let subtotal = billItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxPercentage = parseFloat(document.getElementById('taxPercentage').value) || 0;
    const discount = parseFloat(document.getElementById('discountAmount').value) || 0;
    const tax = (subtotal * taxPercentage) / 100;
    const grandTotal = subtotal + tax - discount;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Invoice</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .header h1 { margin: 0; color: #0066cc; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
                    th { background-color: #0066cc; color: white; }
                    .totals { text-align: right; width: 40%; margin-left: auto; }
                    .totals-row { display: flex; justify-content: space-between; padding: 8px; }
                    .grand-total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #0066cc; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Inventory Pro - Invoice</h1>
                    <p>Date: ${new Date().toLocaleDateString()}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${billItems.map(item => `
                            <tr>
                                <td>${item.product_name}</td>
                                <td>${item.quantity}</td>
                                <td>$${item.unit_price.toFixed(2)}</td>
                                <td>$${(item.quantity * item.unit_price).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="totals">
                    <div class="totals-row">
                        <span>Subtotal:</span>
                        <span>$${subtotal.toFixed(2)}</span>
                    </div>
                    <div class="totals-row">
                        <span>Tax (${taxPercentage}%):</span>
                        <span>$${tax.toFixed(2)}</span>
                    </div>
                    <div class="totals-row">
                        <span>Discount:</span>
                        <span>-$${discount.toFixed(2)}</span>
                    </div>
                    <div class="totals-row grand-total">
                        <span>Grand Total:</span>
                        <span>$${grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
}

async function loadSalesHistory() {
    try {
        const response = await fetch(`${API_URL}/sales`, {
            credentials: 'include'
        });
        const sales = await response.json();

        const tbody = document.getElementById('salesHistoryBody');
        tbody.innerHTML = sales.map(s => `
            <tr>
                <td>${s.sale_number}</td>
                <td>${new Date(s.created_at).toLocaleDateString()}</td>
                <td>$${s.total_amount.toFixed(2)}</td>
                <td>$${s.tax_amount.toFixed(2)}</td>
                <td>$${s.grand_total.toFixed(2)}</td>
                <td>${s.payment_method}</td>
                <td>
                    <button onclick="viewSaleDetails(${s.id})" class="btn-small" style="background: #667eea;">View</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Load sales history error:', error);
    }
}

async function viewSaleDetails(saleId) {
    try {
        const response = await fetch(`${API_URL}/sales/${saleId}`, {
            credentials: 'include'
        });
        const data = await response.json();
        const sale = data.sale;

        let details = `Sale Number: ${sale.sale_number}\nDate: ${new Date(sale.created_at).toLocaleDateString()}\n\nItems:\n`;
        data.items.forEach(item => {
            details += `- ${item.product_name}: ${item.quantity} x $${item.unit_price.toFixed(2)} = $${item.total_price.toFixed(2)}\n`;
        });
        details += `\nSubtotal: $${sale.total_amount.toFixed(2)}\nTax: $${sale.tax_amount.toFixed(2)}\nDiscount: $${sale.discount_amount.toFixed(2)}\nGrand Total: $${sale.grand_total.toFixed(2)}`;

        showAlert('Sale Details', details);
    } catch (error) {
        console.error('View sale details error:', error);
    }
}

// ==================== REPORTS ====================
async function loadReportsData() {
    try {
        const [salesRes, profitRes, stockRes, bestRes] = await Promise.all([
            fetch(`${API_URL}/reports/monthly-sales`, { credentials: 'include' }),
            fetch(`${API_URL}/reports/profit`, { credentials: 'include' }),
            fetch(`${API_URL}/reports/stock-category`, { credentials: 'include' }),
            fetch(`${API_URL}/reports/best-sellers`, { credentials: 'include' })
        ]);

        const salesData = await salesRes.json();
        const profitData = await profitRes.json();
        const stockData = await stockRes.json();
        const bestData = await bestRes.json();

        createReportsCharts(salesData, profitData, stockData, bestData);
    } catch (error) {
        console.error('Load reports error:', error);
    }
}

function createReportsCharts(salesData, profitData, stockData, bestData) {
    const months = salesData.map(d => d.month || 'N/A');
    const salesValues = salesData.map(d => d.total || 0);
    const profitValues = profitData.map(d => d.profit || 0);

    // Monthly Sales
    const ctx1 = document.getElementById('reportMonthlySalesChart')?.getContext('2d');
    if (ctx1) {
        new Chart(ctx1, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Sales',
                    data: salesValues,
                    borderColor: '#00a8ff',
                    backgroundColor: 'rgba(0, 168, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true, labels: { color: '#b0b8c1' } }
                },
                scales: {
                    y: { ticks: { color: '#b0b8c1' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                    x: { ticks: { color: '#b0b8c1' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
                }
            }
        });
    }

    // Profit
    const ctx2 = document.getElementById('reportProfitChart')?.getContext('2d');
    if (ctx2) {
        new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [{
                    label: 'Profit',
                    data: profitValues,
                    backgroundColor: 'rgba(0, 208, 132, 0.7)',
                    borderColor: '#00d084',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true, labels: { color: '#b0b8c1' } }
                },
                scales: {
                    y: { ticks: { color: '#b0b8c1' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                    x: { ticks: { color: '#b0b8c1' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
                }
            }
        });
    }

    // Stock Distribution
    const ctx3 = document.getElementById('reportStockChart')?.getContext('2d');
    if (ctx3 && stockData.length > 0) {
        new Chart(ctx3, {
            type: 'pie',
            data: {
                labels: stockData.map(d => d.category),
                datasets: [{
                    data: stockData.map(d => d.total_quantity || 0),
                    backgroundColor: [
                        '#0066cc', '#00a8ff', '#00d4ff', '#667eea',
                        '#764ba2', '#ff6b6b', '#ffa500', '#00d084'
                    ],
                    borderColor: 'rgba(10, 20, 40, 0.95)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: true, labels: { color: '#b0b8c1' } }
                }
            }
        });
    }

    // Best Sellers
    const ctx4 = document.getElementById('reportBestSellersChart')?.getContext('2d');
    if (ctx4 && bestData.length > 0) {
        new Chart(ctx4, {
            type: 'bar',
            data: {
                labels: bestData.map(d => d.name),
                datasets: [{
                    label: 'Units Sold',
                    data: bestData.map(d => d.total_quantity || 0),
                    backgroundColor: 'rgba(102, 126, 234, 0.7)',
                    borderColor: '#667eea',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                plugins: {
                    legend: { display: true, labels: { color: '#b0b8c1' } }
                },
                scales: {
                    x: { ticks: { color: '#b0b8c1' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                    y: { ticks: { color: '#b0b8c1' }, grid: { color: 'rgba(255, 255, 255, 0.1)' } }
                }
            }
        });
    }
}

// ==================== USERS MANAGEMENT ====================
async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/users`, {
            credentials: 'include'
        });
        allUsers = await response.json();
        displayUsers(allUsers);
    } catch (error) {
        console.error('Load users error:', error);
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = users.map(u => `
        <tr>
            <td>${u.username}</td>
            <td>${u.email || 'N/A'}</td>
            <td><span style="background: ${u.role === 'admin' ? '#667eea' : '#00d084'}; padding: 4px 8px; border-radius: 4px;">${u.role}</span></td>
            <td><span style="color: ${u.status === 'active' ? '#00d084' : '#ff6b6b'}">${u.status}</span></td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
            <td>
                ${u.id !== currentUser.id ? `<button onclick="deleteUser(${u.id})" class="btn-small" style="background: #ff6b6b;">Delete</button>` : ''}
            </td>
        </tr>
    `).join('');
}

function openUserModal() {
    const modal = document.getElementById('userModal');
    document.getElementById('userForm').reset();
    modal.classList.add('active');
}

async function handleSaveUser(e) {
    e.preventDefault();
    const username = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('userRole').value;

    try {
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, email, password, role })
        });

        if (response.ok) {
            showAlert('Success', 'User created successfully');
            closeModal(document.getElementById('userModal'));
            loadUsers();
        } else {
            const data = await response.json();
            showAlert('Error', data.message || 'Failed to create user');
        }
    } catch (error) {
        console.error('Save user error:', error);
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            showAlert('Success', 'User deleted successfully');
            loadUsers();
        } else {
            showAlert('Error', 'Failed to delete user');
        }
    } catch (error) {
        console.error('Delete user error:', error);
    }
}

// ==================== ALERTS ====================
async function loadAlerts() {
    try {
        const [lowRes, outRes] = await Promise.all([
            fetch(`${API_URL}/alerts/low-stock`, { credentials: 'include' }),
            fetch(`${API_URL}/alerts/out-of-stock`, { credentials: 'include' })
        ]);

        const lowStock = await lowRes.json();
        const outOfStock = await outRes.json();

        displayAlerts(lowStock, outOfStock);
    } catch (error) {
        console.error('Load alerts error:', error);
    }
}

function displayAlerts(lowStock, outOfStock) {
    const lowBody = document.getElementById('lowStockBody');
    lowBody.innerHTML = lowStock.length > 0 ? lowStock.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.category || 'N/A'}</td>
            <td style="color: #ffa500; font-weight: bold;">${p.quantity}</td>
            <td>${p.reorder_level}</td>
        </tr>
    `).join('') : '<tr><td colspan="4" style="text-align: center; color: #00d084;">No low stock items</td></tr>';

    const outBody = document.getElementById('outOfStockBody');
    outBody.innerHTML = outOfStock.length > 0 ? outOfStock.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.category || 'N/A'}</td>
        </tr>
    `).join('') : '<tr><td colspan="2" style="text-align: center; color: #00d084;">No out of stock items</td></tr>';
}

// ==================== UTILITIES ====================
function closeModal(modal) {
    modal.classList.remove('active');
}

function showAlert(title, message) {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    document.getElementById('alertModal').classList.add('active');
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    if (allProducts.length > 0) {
        const filtered = allProducts.filter(p => 
            p.name.toLowerCase().includes(query) || 
            p.category_name?.toLowerCase().includes(query)
        );
        displayProducts(filtered);
    }
}
