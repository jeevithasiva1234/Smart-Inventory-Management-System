const fs = require('fs');
const path = require('path');
const db = require('./database');

async function seedDatabase() {
  try {
    console.log('Seeding database with sample data...');

    // Add more products to existing ones
    const products = [
      { name: 'Laptop Computer', category_id: 1, quantity: 50, unit_price: 45000, reorder_level: 10 },
      { name: 'Wireless Mouse', category_id: 1, quantity: 200, unit_price: 1500, reorder_level: 30 },
      { name: 'USB-C Cable', category_id: 1, quantity: 300, unit_price: 500, reorder_level: 50 },
      { name: 'Monitor 27"', category_id: 1, quantity: 30, unit_price: 15000, reorder_level: 5 },
      { name: 'Mechanical Keyboard', category_id: 1, quantity: 80, unit_price: 3500, reorder_level: 15 },
      { name: 'Office Desk', category_id: 2, quantity: 25, unit_price: 8000, reorder_level: 5 },
      { name: 'Ergonomic Chair', category_id: 2, quantity: 15, unit_price: 12000, reorder_level: 3 },
      { name: 'Desk Lamp LED', category_id: 2, quantity: 40, unit_price: 2000, reorder_level: 10 },
      { name: 'File Cabinet', category_id: 2, quantity: 20, unit_price: 5000, reorder_level: 4 },
      { name: 'Wireless Headphones', category_id: 3, quantity: 60, unit_price: 3000, reorder_level: 10 },
      { name: 'USB Hub 7-Port', category_id: 3, quantity: 120, unit_price: 1200, reorder_level: 25 },
      { name: 'Power Bank 20000mAh', category_id: 3, quantity: 100, unit_price: 2500, reorder_level: 20 },
    ];

    for (const product of products) {
      db.addProduct(product.name, product.category_id, product.quantity, product.unit_price, product.reorder_level);
    }

    console.log('✓ Added 12 sample products');

    // Add sample sales (various dates in current month)
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const salesData = [
      { items: [{ product_id: 1, quantity: 2, unit_price: 45000 }], tax: 18, discount: 0, payment: 'Card' },
      { items: [{ product_id: 2, quantity: 5, unit_price: 1500 }], tax: 18, discount: 500, payment: 'Cash' },
      { items: [{ product_id: 3, quantity: 10, unit_price: 500 }], tax: 18, discount: 0, payment: 'Online' },
      { items: [{ product_id: 4, quantity: 1, unit_price: 15000 }], tax: 18, discount: 1000, payment: 'Card' },
      { items: [{ product_id: 5, quantity: 3, unit_price: 3500 }], tax: 18, discount: 0, payment: 'Cash' },
      { items: [{ product_id: 6, quantity: 2, unit_price: 8000 }], tax: 18, discount: 500, payment: 'Online' },
      { items: [{ product_id: 7, quantity: 1, unit_price: 12000 }], tax: 18, discount: 0, payment: 'Card' },
      { items: [{ product_id: 8, quantity: 4, unit_price: 2000 }], tax: 18, discount: 200, payment: 'Cash' },
      { items: [{ product_id: 9, quantity: 1, unit_price: 5000 }], tax: 18, discount: 0, payment: 'Online' },
      { items: [{ product_id: 10, quantity: 2, unit_price: 3000 }], tax: 18, discount: 300, payment: 'Card' },
      { items: [{ product_id: 11, quantity: 8, unit_price: 1200 }], tax: 18, discount: 0, payment: 'Cash' },
      { items: [{ product_id: 12, quantity: 5, unit_price: 2500 }], tax: 18, discount: 500, payment: 'Online' },
      { items: [{ product_id: 1, quantity: 1, unit_price: 45000 }, { product_id: 2, quantity: 10, unit_price: 1500 }], tax: 18, discount: 2000, payment: 'Card' },
      { items: [{ product_id: 3, quantity: 20, unit_price: 500 }], tax: 18, discount: 0, payment: 'Cash' },
      { items: [{ product_id: 4, quantity: 2, unit_price: 15000 }], tax: 18, discount: 1500, payment: 'Online' },
      { items: [{ product_id: 5, quantity: 2, unit_price: 3500 }, { product_id: 8, quantity: 3, unit_price: 2000 }], tax: 18, discount: 500, payment: 'Card' },
      { items: [{ product_id: 10, quantity: 5, unit_price: 3000 }], tax: 18, discount: 500, payment: 'Cash' },
      { items: [{ product_id: 11, quantity: 10, unit_price: 1200 }], tax: 18, discount: 0, payment: 'Online' },
      { items: [{ product_id: 12, quantity: 3, unit_price: 2500 }], tax: 18, discount: 200, payment: 'Card' },
      { items: [{ product_id: 2, quantity: 15, unit_price: 1500 }, { product_id: 3, quantity: 25, unit_price: 500 }], tax: 18, discount: 1000, payment: 'Cash' },
    ];

    salesData.forEach((sale, index) => {
      let totalAmount = 0;
      for (let item of sale.items) {
        totalAmount += item.quantity * item.unit_price;
      }

      const taxAmount = (totalAmount * sale.tax) / 100;
      const grandTotal = totalAmount + taxAmount - sale.discount;

      // Create sale with date spread across the month
      const saleDate = new Date(currentYear, currentMonth, (index % 28) + 1);
      const saleNumber = 'SALE-' + saleDate.getTime();

      const saleId = db.addSale(saleNumber, 1, totalAmount, taxAmount, sale.discount, grandTotal, sale.payment, 'Sample sale');

      for (let item of sale.items) {
        db.addSaleItem(saleId, item.product_id, item.quantity, item.unit_price, item.quantity * item.unit_price);
        db.updateProductQuantity(item.product_id, -item.quantity);
      }
    });

    console.log('✓ Added 20 sample sales');
    console.log('\n✓ Database seeding completed successfully!');
    console.log('\nSample data includes:');
    console.log('- 12 products across 3 categories');
    console.log('- 20 sales transactions with various items and discounts');
    console.log('- Mix of payment methods (Card, Cash, Online)');

  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seedDatabase();
