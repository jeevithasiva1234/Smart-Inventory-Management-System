const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbDir = path.join(__dirname, 'data');
const dbFiles = {
  users: path.join(dbDir, 'users.json'),
  categories: path.join(dbDir, 'categories.json'),
  products: path.join(dbDir, 'products.json'),
  sales: path.join(dbDir, 'sales.json'),
  saleItems: path.join(dbDir, 'saleItems.json')
};

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

// Read data from file
function readData(file) {
  try {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf8');
      return JSON.parse(data || '[]');
    }
  } catch (error) {
    console.error('Error reading data:', error);
  }
  return [];
}

// Write data to file
function writeData(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing data:', error);
  }
}

// Helper functions
function getNextId(file) {
  const data = readData(file);
  if (data.length === 0) return 1;
  return Math.max(...data.map(item => item.id || 0)) + 1;
}

async function initializeDatabase() {
  try {
    ensureDataDir();

    // Initialize users
    let users = readData(dbFiles.users);
    const adminExists = users.some(u => u.username === 'admin');
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      users.push({
        id: 1,
        username: 'admin',
        password: hashedPassword,
        email: 'admin@inventory.local',
        role: 'admin',
        status: 'active',
        created_at: new Date().toISOString()
      });
      writeData(dbFiles.users, users);
      console.log('Admin user created');
    }

    // Initialize categories if empty
    let categories = readData(dbFiles.categories);
    if (categories.length === 0) {
      categories = [
        { id: 1, name: 'Electronics', description: 'Electronic devices', created_at: new Date().toISOString() },
        { id: 2, name: 'Clothing', description: 'Clothing items', created_at: new Date().toISOString() },
        { id: 3, name: 'Home & Kitchen', description: 'Home and kitchen products', created_at: new Date().toISOString() }
      ];
      writeData(dbFiles.categories, categories);
    }

    // Initialize products if empty
    let products = readData(dbFiles.products);
    if (products.length === 0) {
      products = [
        { id: 1, name: 'Laptop', category_id: 1, quantity: 15, unit_price: 899.99, reorder_level: 5, status: 'active', created_at: new Date().toISOString() },
        { id: 2, name: 'T-Shirt', category_id: 2, quantity: 50, unit_price: 19.99, reorder_level: 20, status: 'active', created_at: new Date().toISOString() },
        { id: 3, name: 'Microwave', category_id: 3, quantity: 8, unit_price: 149.99, reorder_level: 3, status: 'active', created_at: new Date().toISOString() }
      ];
      writeData(dbFiles.products, products);
    }

    // Initialize sales and saleItems if don't exist
    if (!fs.existsSync(dbFiles.sales)) {
      writeData(dbFiles.sales, []);
    }
    if (!fs.existsSync(dbFiles.saleItems)) {
      writeData(dbFiles.saleItems, []);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Query functions
function getUser(username) {
  const users = readData(dbFiles.users);
  return users.find(u => u.username === username && u.status === 'active');
}

function getUserById(id) {
  const users = readData(dbFiles.users);
  return users.find(u => u.id === parseInt(id));
}

function getUsers() {
  const users = readData(dbFiles.users);
  return users.map(({ password, ...u }) => u);
}

function addUser(username, password, email, role = 'user') {
  const users = readData(dbFiles.users);
  if (users.some(u => u.username === username)) {
    throw new Error('Username already exists');
  }
  const id = getNextId(dbFiles.users);
  users.push({
    id,
    username,
    password,
    email,
    role,
    status: 'active',
    created_at: new Date().toISOString()
  });
  writeData(dbFiles.users, users);
  return id;
}

function deleteUser(id) {
  const users = readData(dbFiles.users);
  const index = users.findIndex(u => u.id === parseInt(id));
  if (index !== -1) {
    users.splice(index, 1);
    writeData(dbFiles.users, users);
  }
}

function updateUserPassword(id, hashedPassword) {
  const users = readData(dbFiles.users);
  const user = users.find(u => u.id === parseInt(id));
  if (user) {
    user.password = hashedPassword;
    writeData(dbFiles.users, users);
  }
}

function getCategories() {
  return readData(dbFiles.categories);
}

function addCategory(name, description) {
  const categories = readData(dbFiles.categories);
  const id = getNextId(dbFiles.categories);
  categories.push({
    id,
    name,
    description,
    created_at: new Date().toISOString()
  });
  writeData(dbFiles.categories, categories);
  return id;
}

function getProducts() {
  const products = readData(dbFiles.products);
  const categories = readData(dbFiles.categories);
  return products.map(p => ({
    ...p,
    category_name: categories.find(c => c.id === p.category_id)?.name
  }));
}

function addProduct(name, category_id, quantity, unit_price, reorder_level) {
  const products = readData(dbFiles.products);
  const id = getNextId(dbFiles.products);
  products.push({
    id,
    name,
    category_id: parseInt(category_id),
    quantity: parseInt(quantity),
    unit_price: parseFloat(unit_price),
    reorder_level: parseInt(reorder_level),
    status: 'active',
    created_at: new Date().toISOString()
  });
  writeData(dbFiles.products, products);
  return id;
}

function updateProduct(id, name, category_id, quantity, unit_price, reorder_level) {
  const products = readData(dbFiles.products);
  const product = products.find(p => p.id === parseInt(id));
  if (product) {
    product.name = name;
    product.category_id = parseInt(category_id);
    product.quantity = parseInt(quantity);
    product.unit_price = parseFloat(unit_price);
    product.reorder_level = parseInt(reorder_level);
    writeData(dbFiles.products, products);
  }
}

function deleteProduct(id) {
  const products = readData(dbFiles.products);
  const index = products.findIndex(p => p.id === parseInt(id));
  if (index !== -1) {
    products.splice(index, 1);
    writeData(dbFiles.products, products);
  }
}

function updateProductQuantity(id, quantity) {
  const products = readData(dbFiles.products);
  const product = products.find(p => p.id === parseInt(id));
  if (product) {
    product.quantity += parseInt(quantity);
    writeData(dbFiles.products, products);
  }
}

function getSales() {
  const sales = readData(dbFiles.sales);
  const users = readData(dbFiles.users);
  return sales.map(s => ({
    ...s,
    username: users.find(u => u.id === s.user_id)?.username
  })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100);
}

function getSaleById(id) {
  const sales = readData(dbFiles.sales);
  return sales.find(s => s.id === parseInt(id));
}

function getSaleItems(saleId) {
  const items = readData(dbFiles.saleItems);
  const products = readData(dbFiles.products);
  return items.filter(i => i.sale_id === parseInt(saleId)).map(i => ({
    ...i,
    product_name: products.find(p => p.id === i.product_id)?.name
  }));
}

function addSale(sale_number, user_id, total_amount, tax_amount, discount_amount, grand_total, payment_method, notes) {
  const sales = readData(dbFiles.sales);
  const id = getNextId(dbFiles.sales);
  const newSale = {
    id,
    sale_number,
    user_id: parseInt(user_id),
    total_amount: parseFloat(total_amount),
    tax_amount: parseFloat(tax_amount),
    discount_amount: parseFloat(discount_amount),
    grand_total: parseFloat(grand_total),
    payment_method,
    notes,
    created_at: new Date().toISOString()
  };
  sales.push(newSale);
  writeData(dbFiles.sales, sales);
  return id;
}

function addSaleItem(sale_id, product_id, quantity, unit_price, total_price) {
  const items = readData(dbFiles.saleItems);
  const id = getNextId(dbFiles.saleItems);
  items.push({
    id,
    sale_id: parseInt(sale_id),
    product_id: parseInt(product_id),
    quantity: parseInt(quantity),
    unit_price: parseFloat(unit_price),
    total_price: parseFloat(total_price)
  });
  writeData(dbFiles.saleItems, items);
}

function getDashboardStats() {
  const products = readData(dbFiles.products);
  const sales = readData(dbFiles.sales);

  const totalProducts = products.length;
  const lowStockItems = products.filter(p => p.quantity <= p.reorder_level).length;
  const totalSales = sales.reduce((sum, s) => sum + s.grand_total, 0);
  const todaysRevenue = sales.filter(s => {
    const saleDate = new Date(s.created_at).toDateString();
    const today = new Date().toDateString();
    return saleDate === today;
  }).reduce((sum, s) => sum + s.grand_total, 0);
  const totalProfit = totalSales * 0.3;

  return {
    totalProducts,
    lowStockItems,
    totalSales,
    totalProfit: parseFloat(totalProfit.toFixed(2)),
    todaysRevenue
  };
}

function getReportsData() {
  const sales = readData(dbFiles.sales);
  const products = readData(dbFiles.products);
  const categories = readData(dbFiles.categories);

  // Monthly sales
  const monthlySales = {};
  sales.forEach(s => {
    const month = new Date(s.created_at).toISOString().slice(0, 7);
    monthlySales[month] = (monthlySales[month] || 0) + s.grand_total;
  });

  // Stock by category
  const stockByCategory = categories.map(c => ({
    category: c.name,
    count: products.filter(p => p.category_id === c.id).length,
    total_quantity: products.filter(p => p.category_id === c.id).reduce((sum, p) => sum + p.quantity, 0)
  }));

  // Best sellers
  const saleItems = readData(dbFiles.saleItems);
  const bestSellers = {};
  saleItems.forEach(item => {
    const product = products.find(p => p.id === item.product_id);
    if (product) {
      if (!bestSellers[item.product_id]) {
        bestSellers[item.product_id] = { name: product.name, quantity: 0, revenue: 0 };
      }
      bestSellers[item.product_id].quantity += item.quantity;
      bestSellers[item.product_id].revenue += item.total_price;
    }
  });
  const bestSellersArray = Object.values(bestSellers)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)
    .map(b => ({ name: b.name, total_quantity: b.quantity, total_revenue: b.revenue }));

  return {
    monthlySales: Object.entries(monthlySales).map(([month, total]) => ({ month, total })),
    profit: Object.entries(monthlySales).map(([month, total]) => ({ month, profit: parseFloat((total * 0.3).toFixed(2)) })),
    stockByCategory,
    bestSellers: bestSellersArray
  };
}

function getLowStockAlerts() {
  const products = readData(dbFiles.products);
  const categories = readData(dbFiles.categories);
  return products
    .filter(p => p.quantity <= p.reorder_level && p.quantity > 0)
    .map(p => ({
      ...p,
      category: categories.find(c => c.id === p.category_id)?.name
    }))
    .sort((a, b) => a.quantity - b.quantity);
}

function getOutOfStockAlerts() {
  const products = readData(dbFiles.products);
  const categories = readData(dbFiles.categories);
  return products
    .filter(p => p.quantity === 0)
    .map(p => ({
      ...p,
      category: categories.find(c => c.id === p.category_id)?.name
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = {
  initializeDatabase,
  getUser,
  getUserById,
  getUsers,
  addUser,
  deleteUser,
  updateUserPassword,
  getCategories,
  addCategory,
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  updateProductQuantity,
  getSales,
  getSaleById,
  getSaleItems,
  addSale,
  addSaleItem,
  getDashboardStats,
  getReportsData,
  getLowStockAlerts,
  getOutOfStockAlerts
};
