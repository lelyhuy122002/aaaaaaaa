const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// In-memory messages store (resets on server restart)
const messages = [];

// ---------------------------------------------------------------------------
// POST /api/contact
// Save a contact message
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    // --- Basic validation ---------------------------------------------------
    if (!name || !message) {
      return res.status(400).json({
        success: false,
        error: 'Name and message are required.',
      });
    }

    const entry = {
      id: uuidv4(),
      name,
      email: email || '',
      phone: phone || '',
      message,
      createdAt: new Date().toISOString(),
    };

    messages.push(entry);

    console.log(`[Contact] New message from "${name}" (id: ${entry.id})`);

    res.status(201).json({
      success: true,
      message: 'Message received',
    });
  } catch (err) {
    console.error('[Contact] Error saving message:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save message' });
  }
});

module.exports = router;
