const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'inventory_secret_key_12345',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  next();
};

// ==================== AUTH ROUTES ====================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const user = db.getUser(username);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/check', (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        username: req.session.username,
        role: req.session.role
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// ==================== DASHBOARD ROUTES ====================
app.get('/api/dashboard', requireAuth, (req, res) => {
  try {
    const stats = db.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== PRODUCT ROUTES ====================
app.get('/api/products', requireAuth, (req, res) => {
  try {
    const products = db.getProducts();
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/categories', requireAuth, (req, res) => {
  try {
    const categories = db.getCategories();
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/categories', requireAuth, (req, res) => {
  try {
    const { name, description } = req.body;
    db.addCategory(name, description);
    res.json({ message: 'Category added successfully' });
  } catch (error) {
    console.error('Add category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/products', requireAuth, (req, res) => {
  try {
    const { name, category_id, quantity, unit_price, reorder_level } = req.body;
    db.addProduct(name, category_id, quantity, unit_price, reorder_level);
    res.json({ message: 'Product added successfully' });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/products/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_id, quantity, unit_price, reorder_level } = req.body;
    db.updateProduct(id, name, category_id, quantity, unit_price, reorder_level);
    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/products/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    db.deleteProduct(id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== SALES/BILLING ROUTES ====================
app.post('/api/sales', requireAuth, (req, res) => {
  try {
    const { items, taxPercentage, discountAmount, paymentMethod, notes } = req.body;

    let totalAmount = 0;
    for (let item of items) {
      totalAmount += item.quantity * item.unit_price;
    }

    const taxAmount = (totalAmount * taxPercentage) / 100;
    const grandTotal = totalAmount + taxAmount - (discountAmount || 0);
    const saleNumber = 'SALE-' + Date.now();

    const saleId = db.addSale(saleNumber, req.session.userId, totalAmount, taxAmount, discountAmount || 0, grandTotal, paymentMethod, notes);

    for (let item of items) {
      db.addSaleItem(saleId, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price);
      db.updateProductQuantity(item.product_id, -item.quantity);
    }

    res.json({
      message: 'Sale created successfully',
      saleId: saleId,
      saleNumber: saleNumber,
      grandTotal: grandTotal
    });
  } catch (error) {
    console.error('Create sale error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/sales', requireAuth, (req, res) => {
  try {
    const sales = db.getSales();
    res.json(sales);
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/sales/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const sale = db.getSaleById(id);
    const items = db.getSaleItems(id);

    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    res.json({
      sale: sale,
      items: items
    });
  } catch (error) {
    console.error('Get sale details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== REPORTS ROUTES ====================
app.get('/api/reports/monthly-sales', requireAuth, (req, res) => {
  try {
    const data = db.getReportsData();
    res.json(data.monthlySales);
  } catch (error) {
    console.error('Monthly sales error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/reports/profit', requireAuth, (req, res) => {
  try {
    const data = db.getReportsData();
    res.json(data.profit);
  } catch (error) {
    console.error('Profit data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/reports/stock-category', requireAuth, (req, res) => {
  try {
    const data = db.getReportsData();
    res.json(data.stockByCategory);
  } catch (error) {
    console.error('Stock category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/reports/best-sellers', requireAuth, (req, res) => {
  try {
    const data = db.getReportsData();
    res.json(data.bestSellers);
  } catch (error) {
    console.error('Best sellers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== USER MANAGEMENT ROUTES ====================
app.get('/api/users', requireAuth, (req, res) => {
  try {
    if (req.session.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const users = db.getUsers();
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/users', requireAuth, async (req, res) => {
  try {
    if (req.session.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { username, password, email, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    db.addUser(username, hashedPassword, email, role || 'user');

    res.json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.message.includes('already exists')) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/users/:id', requireAuth, (req, res) => {
  try {
    if (req.session.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { id } = req.params;

    if (id == req.session.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    db.deleteUser(id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/users/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = db.getUserById(req.session.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.updateUserPassword(req.session.userId, hashedPassword);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== LOW STOCK ALERTS ====================
app.get('/api/alerts/low-stock', requireAuth, (req, res) => {
  try {
    const alerts = db.getLowStockAlerts();
    res.json(alerts);
  } catch (error) {
    console.error('Low stock alerts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/alerts/out-of-stock', requireAuth, (req, res) => {
  try {
    const alerts = db.getOutOfStockAlerts();
    res.json(alerts);
  } catch (error) {
    console.error('Out of stock alerts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== Server startup ====================
async function startServer() {
  try {
    await db.initializeDatabase();
    console.log('Database initialized');

    app.listen(PORT, () => {
      console.log(`\n====================================`);
      console.log(`✓ Backend server running on http://localhost:${PORT}`);
      console.log(`====================================\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
