/**
 * Blankup Authentication Routes — SQL Server
 * Handles local login/register, Google/Facebook social login,
 * session checking, and user lookup.
 */

const express = require('express');
const { getPool, sql } = require('../db');

const router = express.Router();

// ---------------------------------------------------------------------------
// Helper: authenticate middleware (extracts user from mock token)
// ---------------------------------------------------------------------------
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token.startsWith('mock-token-')) {
    return res.status(401).json({ success: false, error: 'Invalid authentication token.' });
  }

  const userId = token.replace('mock-token-', '');

  try {
    const pool = getPool();
    const result = await pool.request()
      .input('id', sql.NVarChar, userId)
      .query('SELECT id, username, fullName, email, avatar, provider, role FROM Users WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(401).json({ success: false, error: 'Session expired or user not found.' });
    }

    req.user = result.recordset[0];
    next();
  } catch (err) {
    console.error('[Auth] Error in authenticate middleware:', err.message);
    return res.status(500).json({ success: false, error: 'Authentication check failed.' });
  }
}

// ---------------------------------------------------------------------------
// Helper: read all users (for admin routes)
// ---------------------------------------------------------------------------
async function readUsers() {
  try {
    const pool = getPool();
    const result = await pool.request().query('SELECT id, username, fullName, email, avatar, provider, role, createdAt FROM Users');
    return result.recordset;
  } catch (err) {
    console.error('[Auth] Error reading users:', err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/register  (Local registration)
// ---------------------------------------------------------------------------
router.post('/register', async (req, res) => {
  try {
    const { username, password, fullName } = req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({
        success: false,
        error: 'Tên đăng nhập, mật khẩu và họ tên là bắt buộc.',
      });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const pool = getPool();

    // Check if user already exists
    const existing = await pool.request()
      .input('username', sql.NVarChar, normalizedUsername)
      .query('SELECT id FROM Users WHERE username = @username');

    if (existing.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Tên đăng nhập đã tồn tại trên hệ thống.',
      });
    }

    const newId = 'u-' + Date.now();
    await pool.request()
      .input('id', sql.NVarChar, newId)
      .input('username', sql.NVarChar, normalizedUsername)
      .input('password', sql.NVarChar, password)
      .input('fullName', sql.NVarChar, fullName.trim())
      .input('role', sql.NVarChar, 'user')
      .input('provider', sql.NVarChar, 'local')
      .query(`
        INSERT INTO Users (id, username, password, fullName, role, provider)
        VALUES (@id, @username, @password, @fullName, @role, @provider)
      `);

    console.log(`[Auth] Registered new user: ${normalizedUsername}`);

    res.status(201).json({
      success: true,
      user: {
        id: newId,
        username: normalizedUsername,
        fullName: fullName.trim(),
        role: 'user',
        provider: 'local',
      },
      token: 'mock-token-' + newId,
      message: 'Đăng ký thành công!',
    });
  } catch (err) {
    console.error('[Auth] Error registering user:', err.message);
    res.status(500).json({ success: false, error: 'Đăng ký thất bại. Vui lòng thử lại.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/login  (Local login)
// ---------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Tên đăng nhập và mật khẩu là bắt buộc.',
      });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const pool = getPool();

    const result = await pool.request()
      .input('username', sql.NVarChar, normalizedUsername)
      .query('SELECT id, username, password, fullName, email, avatar, provider, role FROM Users WHERE username = @username AND provider = \'local\'');

    if (result.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Tên đăng nhập hoặc mật khẩu không đúng.',
      });
    }

    const user = result.recordset[0];
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        error: 'Tên đăng nhập hoặc mật khẩu không đúng.',
      });
    }

    console.log(`[Auth] User logged in: ${user.username} (Role: ${user.role})`);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        provider: user.provider,
      },
      token: 'mock-token-' + user.id,
      message: 'Đăng nhập thành công!',
    });
  } catch (err) {
    console.error('[Auth] Error logging in user:', err.message);
    res.status(500).json({ success: false, error: 'Đăng nhập thất bại. Vui lòng thử lại.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/social  (Google / Facebook login)
// ---------------------------------------------------------------------------
router.post('/social', async (req, res) => {
  try {
    const { provider, providerId, email, fullName, avatar } = req.body;

    if (!provider || !providerId || !fullName) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu thông tin đăng nhập mạng xã hội.',
      });
    }

    if (!['google', 'facebook'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Provider không hợp lệ. Chỉ hỗ trợ google hoặc facebook.',
      });
    }

    const pool = getPool();

    // Check if this social account already exists
    const existing = await pool.request()
      .input('provider', sql.NVarChar, provider)
      .input('providerId', sql.NVarChar, providerId)
      .query('SELECT id, username, fullName, email, avatar, provider, role FROM Users WHERE provider = @provider AND providerId = @providerId');

    let user;

    if (existing.recordset.length > 0) {
      // Existing social user — update their info (name, avatar may change)
      user = existing.recordset[0];
      await pool.request()
        .input('id', sql.NVarChar, user.id)
        .input('fullName', sql.NVarChar, fullName)
        .input('avatar', sql.NVarChar, avatar || null)
        .input('email', sql.NVarChar, email || null)
        .query('UPDATE Users SET fullName = @fullName, avatar = @avatar, email = @email WHERE id = @id');

      user.fullName = fullName;
      user.avatar = avatar;
      user.email = email;

      console.log(`[Auth] Social login (returning user): ${provider} — ${fullName}`);
    } else {
      // New social user — create account
      const newId = 'u-' + Date.now();
      const username = `${provider}_${providerId.slice(0, 10)}`;

      await pool.request()
        .input('id', sql.NVarChar, newId)
        .input('username', sql.NVarChar, username)
        .input('fullName', sql.NVarChar, fullName)
        .input('email', sql.NVarChar, email || null)
        .input('avatar', sql.NVarChar, avatar || null)
        .input('provider', sql.NVarChar, provider)
        .input('providerId', sql.NVarChar, providerId)
        .input('role', sql.NVarChar, 'user')
        .query(`
          INSERT INTO Users (id, username, fullName, email, avatar, provider, providerId, role)
          VALUES (@id, @username, @fullName, @email, @avatar, @provider, @providerId, @role)
        `);

      user = {
        id: newId,
        username,
        fullName,
        email,
        avatar,
        provider,
        role: 'user',
      };

      console.log(`[Auth] Social login (new user): ${provider} — ${fullName}`);
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        provider: user.provider || provider,
      },
      token: 'mock-token-' + user.id,
      message: 'Đăng nhập thành công!',
    });
  } catch (err) {
    console.error('[Auth] Social login error:', err.message);
    res.status(500).json({ success: false, error: 'Đăng nhập mạng xã hội thất bại.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me  (Check current session)
// ---------------------------------------------------------------------------
router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      fullName: req.user.fullName,
      email: req.user.email,
      avatar: req.user.avatar,
      role: req.user.role,
      provider: req.user.provider,
    },
  });
});

module.exports = {
  router,
  authenticate,
  readUsers,
};
