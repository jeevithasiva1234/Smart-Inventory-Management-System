const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const initSqlJs = require('sql.js');

const dbDir = path.join(__dirname, 'data');
const dbFile = path.join(dbDir, 'inventory.db');

let db = null;
let SQL = null;


function ensureDataDir() {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}


function loadDatabase() {
  try {
    if (fs.existsSync(dbFile)) {
      return fs.readFileSync(dbFile);
    }
  } catch (error) {
    console.error('Error loading database:', error);
  }
  return null;
}


function saveDatabase() {
  try {
    if (db) {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbFile, buffer);
    }
  } catch (error) {
    console.error('Error saving database:', error);
  }
}


async function initializeDatabase() {
  try {
    ensureDataDir();
    SQL = await initSqlJs();
    
    const dbData = loadDatabase();
    
    if (dbData) {
      db = new SQL.Database(dbData);
      console.log('Database loaded from file');
    } else {
      db = new SQL.Database();
      console.log('New database created');
      createTables();
      createInitialData();
    }
    
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}


function createTables() {
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 0,
        unit_price REAL NOT NULL,
        reorder_level INTEGER DEFAULT 5,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_number TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        total_amount REAL NOT NULL,
        tax_amount REAL DEFAULT 0,
        discount_amount REAL DEFAULT 0,
        grand_total REAL NOT NULL,
        payment_method TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    console.log('Tables created successfully');
    saveDatabase();
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}


async function createInitialData() {
  try {
   
    const hashedPassword = await bcrypt.hash('admin123', 10);
    db.run(
      'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
      ['admin', hashedPassword, 'admin@inventory.com', 'admin']
    );

    
    db.run('INSERT INTO categories (name, description) VALUES (?, ?)', ['Electronics', 'Electronic devices and accessories']);
    db.run('INSERT INTO categories (name, description) VALUES (?, ?)', ['Furniture', 'Office furniture and fixtures']);
    db.run('INSERT INTO categories (name, description) VALUES (?, ?)', ['Accessories', 'Various accessories and gadgets']);

    console.log('Admin user created');
    saveDatabase();
  } catch (error) {
    console.error('Error creating initial data:', error);
  }
}


function getUser(username) {
  try {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    stmt.bind([username]);
    if (stmt.step()) {
      const user = stmt.getAsObject();
      stmt.free();
      return user;
    }
    stmt.free();
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

function getUserById(id) {
  try {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const user = stmt.getAsObject();
      stmt.free();
      return user;
    }
    stmt.free();
    return null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

function getUsers() {
  try {
    const results = db.exec('SELECT id, username, email, role FROM users');
    if (results.length > 0) {
      return results[0].values.map(row => ({
        id: row[0],
        username: row[1],
        email: row[2],
        role: row[3]
      }));
    }
    return [];
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
}

async function addUser(username, hashedPassword, email, role) {
  try {
    db.run(
      'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, email, role]
    );
    saveDatabase();
    return true;
  } catch (error) {
    console.error('Error adding user:', error);
    throw error;
  }
}

function deleteUser(id) {
  try {
    db.run('DELETE FROM users WHERE id = ?', [id]);
    saveDatabase();
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

function updateUserPassword(id, hashedPassword) {
  try {
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
    saveDatabase();
    return true;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
}


function getCategories() {
  try {
    const results = db.exec('SELECT id, name, description FROM categories ORDER BY name');
    if (results.length > 0) {
      return results[0].values.map(row => ({
        id: row[0],
        name: row[1],
        description: row[2]
      }));
    }
    return [];
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
}

function addCategory(name, description) {
  try {
    db.run(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description || '']
    );
    saveDatabase();
    return true;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
}


function getProducts() {
  try {
    const results = db.exec(`
      SELECT p.id, p.name, p.category_id, c.name as category_name, 
             p.quantity, p.unit_price, p.reorder_level 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      ORDER BY p.name
    `);
    
    if (results.length > 0) {
      return results[0].values.map(row => ({
        id: row[0],
        name: row[1],
        category_id: row[2],
        category_name: row[3],
        quantity: row[4],
        unit_price: row[5],
        reorder_level: row[6]
      }));
    }
    return [];
  } catch (error) {
    console.error('Error getting products:', error);
    return [];
  }
}

function addProduct(name, category_id, quantity, unit_price, reorder_level) {
  try {
    db.run(
      'INSERT INTO products (name, category_id, quantity, unit_price, reorder_level) VALUES (?, ?, ?, ?, ?)',
      [name, category_id, quantity, unit_price, reorder_level]
    );
    saveDatabase();
    return true;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
}

function updateProduct(id, name, category_id, quantity, unit_price, reorder_level) {
  try {
    db.run(
      'UPDATE products SET name = ?, category_id = ?, quantity = ?, unit_price = ?, reorder_level = ? WHERE id = ?',
      [name, category_id, quantity, unit_price, reorder_level, id]
    );
    saveDatabase();
    return true;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

function deleteProduct(id) {
  try {
    db.run('DELETE FROM products WHERE id = ?', [id]);
    saveDatabase();
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

function updateProductQuantity(id, quantity) {
  try {
    db.run(
      'UPDATE products SET quantity = quantity + ? WHERE id = ?',
      [quantity, id]
    );
    saveDatabase();
    return true;
  } catch (error) {
    console.error('Error updating quantity:', error);
    throw error;
  }
}


function addSale(saleNumber, userId, totalAmount, taxAmount, discountAmount, grandTotal, paymentMethod, notes) {
  try {
    db.run(
      'INSERT INTO sales (sale_number, user_id, total_amount, tax_amount, discount_amount, grand_total, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [saleNumber, userId, totalAmount, taxAmount, discountAmount, grandTotal, paymentMethod, notes]
    );
    
    const result = db.exec('SELECT last_insert_rowid() as id');
    const saleId = result[0]?.values[0][0] || 1;
    
    saveDatabase();
    return saleId;
  } catch (error) {
    console.error('Error adding sale:', error);
    throw error;
  }
}

function getSales() {
  try {
    const results = db.exec(`
      SELECT id, sale_number, created_at, total_amount, tax_amount, grand_total, payment_method 
      FROM sales 
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    
    if (results.length > 0) {
      return results[0].values.map(row => ({
        id: row[0],
        sale_number: row[1],
        date: row[2],
        total_amount: row[3],
        tax_amount: row[4],
        grand_total: row[5],
        payment_method: row[6]
      }));
    }
    return [];
  } catch (error) {
    console.error('Error getting sales:', error);
    return [];
  }
}

function getSaleById(id) {
  try {
    const stmt = db.prepare('SELECT * FROM sales WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const sale = stmt.getAsObject();
      stmt.free();
      return sale;
    }
    stmt.free();
    return null;
  } catch (error) {
    console.error('Error getting sale:', error);
    return null;
  }
}

function addSaleItem(saleId, productId, quantity, unitPrice, totalPrice) {
  try {
    db.run(
      'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
      [saleId, productId, quantity, unitPrice, totalPrice]
    );
    saveDatabase();
    return true;
  } catch (error) {
    console.error('Error adding sale item:', error);
    throw error;
  }
}

function getSaleItems(saleId) {
  try {
    const results = db.exec(`
      SELECT si.id, si.product_id, p.name as product_name, si.quantity, si.unit_price, si.total_price 
      FROM sale_items si 
      JOIN products p ON si.product_id = p.id 
      WHERE si.sale_id = ?
      ORDER BY si.id
    `, [saleId]);
    
    if (results.length > 0) {
      return results[0].values.map(row => ({
        id: row[0],
        product_id: row[1],
        product_name: row[2],
        quantity: row[3],
        unit_price: row[4],
        total_price: row[5]
      }));
    }
    return [];
  } catch (error) {
    console.error('Error getting sale items:', error);
    return [];
  }
}


function getDashboardStats() {
  try {
    const productsResult = db.exec('SELECT COUNT(*) as count FROM products');
    const totalProducts = productsResult[0]?.values[0][0] || 0;

    const lowStockResult = db.exec('SELECT COUNT(*) as count FROM products WHERE quantity <= reorder_level');
    const lowStockItems = lowStockResult[0]?.values[0][0] || 0;

    const salesResult = db.exec('SELECT SUM(grand_total) as total FROM sales');
    const totalSales = salesResult[0]?.values[0][0] || 0;

    const profitResult = db.exec('SELECT SUM(grand_total * 0.3) as profit FROM sales');
    const totalProfit = profitResult[0]?.values[0][0] || 0;

    const todayResult = db.exec(`
      SELECT SUM(grand_total) as today_total 
      FROM sales 
      WHERE DATE(created_at) = DATE('now')
    `);
    const todaysRevenue = todayResult[0]?.values[0][0] || 0;

    return {
      totalProducts,
      lowStockItems,
      totalSales,
      totalProfit,
      todaysRevenue
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return {
      totalProducts: 0,
      lowStockItems: 0,
      totalSales: 0,
      totalProfit: 0,
      todaysRevenue: 0
    };
  }
}

function getReportsData() {
  try {
    
    const monthlySalesResult = db.exec(`
      SELECT STRFTIME('%Y-%m', created_at) as month, SUM(grand_total) as total 
      FROM sales 
      GROUP BY STRFTIME('%Y-%m', created_at)
      ORDER BY month DESC
      LIMIT 12
    `);
    const monthlySales = monthlySalesResult[0]?.values.map(row => ({
      month: row[0],
      total: row[1]
    })) || [];

    
    const profitResult = db.exec(`
      SELECT STRFTIME('%Y-%m', created_at) as month, SUM(grand_total * 0.3) as profit 
      FROM sales 
      GROUP BY STRFTIME('%Y-%m', created_at)
      ORDER BY month DESC
      LIMIT 12
    `);
    const profit = profitResult[0]?.values.map(row => ({
      month: row[0],
      profit: row[1]
    })) || [];

    // Stock by category
    const stockResult = db.exec(`
      SELECT c.name as category, SUM(p.quantity) as total_quantity 
      FROM products p 
      JOIN categories c ON p.category_id = c.id 
      GROUP BY c.id, c.name
    `);
    const stockByCategory = stockResult[0]?.values.map(row => ({
      category: row[0],
      total_quantity: row[1]
    })) || [];

    // Best sellers
    const bestResult = db.exec(`
      SELECT p.name, SUM(si.quantity) as total_sold 
      FROM sale_items si 
      JOIN products p ON si.product_id = p.id 
      GROUP BY p.id, p.name
      ORDER BY total_sold DESC
      LIMIT 10
    `);
    const bestSellers = bestResult[0]?.values.map(row => ({
      product_name: row[0],
      total_sold: row[1]
    })) || [];

    return {
      monthlySales: monthlySales.reverse(),
      profit: profit.reverse(),
      stockByCategory,
      bestSellers
    };
  } catch (error) {
    console.error('Error getting reports data:', error);
    return {
      monthlySales: [],
      profit: [],
      stockByCategory: [],
      bestSellers: []
    };
  }
}


function getLowStockAlerts() {
  try {
    const results = db.exec(`
      SELECT id, name, quantity, reorder_level, unit_price 
      FROM products 
      WHERE quantity <= reorder_level AND quantity > 0
      ORDER BY quantity ASC
    `);
    
    if (results.length > 0) {
      return results[0].values.map(row => ({
        id: row[0],
        name: row[1],
        quantity: row[2],
        reorder_level: row[3],
        unit_price: row[4]
      }));
    }
    return [];
  } catch (error) {
    console.error('Error getting low stock alerts:', error);
    return [];
  }
}

function getOutOfStockAlerts() {
  try {
    const results = db.exec(`
      SELECT id, name, quantity, reorder_level, unit_price 
      FROM products 
      WHERE quantity = 0
      ORDER BY name
    `);
    
    if (results.length > 0) {
      return results[0].values.map(row => ({
        id: row[0],
        name: row[1],
        quantity: row[2],
        reorder_level: row[3],
        unit_price: row[4]
      }));
    }
    return [];
  } catch (error) {
    console.error('Error getting out of stock alerts:', error);
    return [];
  }
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
  addSale,
  getSales,
  getSaleById,
  addSaleItem,
  getSaleItems,
  getDashboardStats,
  getReportsData,
  getLowStockAlerts,
  getOutOfStockAlerts
};
