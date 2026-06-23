const express = require('express');
const path = require('path');

const router = express.Router();

// Load product catalogue from JSON
const products = require(path.join(__dirname, '../data/products.json'));

// ---------------------------------------------------------------------------
// GET /api/products
// Optional query: ?category=tshirt
// ---------------------------------------------------------------------------
router.get('/', (req, res) => {
  try {
    const { category } = req.query;

    let result = products;

    if (category) {
      result = products.filter(
        (p) => p.category.toLowerCase() === category.toLowerCase()
      );
    }

    res.json({ success: true, count: result.length, data: result });
  } catch (err) {
    console.error('[Products] Error fetching products:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/products/:id
// ---------------------------------------------------------------------------
router.get('/:id', (req, res) => {
  try {
    const product = products.find((p) => p.id === req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: `Product with id "${req.params.id}" not found`,
      });
    }

    res.json({ success: true, data: product });
  } catch (err) {
    console.error('[Products] Error fetching product:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

module.exports = router;
