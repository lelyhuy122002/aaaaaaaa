/**
 * Blankup Authentication System
 * Handles login, registration, navbar updating, and session checking.
 */

const AUTH_API = window.location.origin + '/api/auth';

class AuthManager {
  constructor() {
    this.token = localStorage.getItem('blankup_token');
    this.user = null;
    const userStr = localStorage.getItem('blankup_user');
    if (userStr) {
      try {
        this.user = JSON.parse(userStr);
      } catch (e) {
        localStorage.removeItem('blankup_user');
      }
    }
  }

  isLoggedIn() {
    return !!this.token && !!this.user;
  }

  isAdmin() {
    return this.isLoggedIn() && this.user.role === 'admin';
  }

  getAuthHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': this.token ? `Bearer ${this.token}` : '',
    };
  }

  async login(username, password) {
    try {
      const response = await fetch(`${AUTH_API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Đăng nhập thất bại.' };
      }

      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('blankup_token', data.token);
      localStorage.setItem('blankup_user', JSON.stringify(data.user));

      return { success: true, user: data.user };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Không thể kết nối đến server.' };
    }
  }

  async register(username, password, fullName) {
    try {
      const response = await fetch(`${AUTH_API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, fullName }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Đăng ký thất bại.' };
      }

      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('blankup_token', data.token);
      localStorage.setItem('blankup_user', JSON.stringify(data.user));

      return { success: true, user: data.user };
    } catch (err) {
      console.error('Registration error:', err);
      return { success: false, error: 'Không thể kết nối đến server.' };
    }
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('blankup_token');
    localStorage.removeItem('blankup_user');
    window.location.href = '/';
  }

  // Update navbar action buttons based on auth state
  init() {
    this.updateNavbar();

    // Re-check session on load
    if (this.isLoggedIn()) {
      this.checkSession();
    }
  }

  async checkSession() {
    try {
      const response = await fetch(`${AUTH_API}/me`, {
        headers: this.getAuthHeaders(),
      });
      if (!response.ok) {
        // Token expired or invalid
        this.logout();
      }
    } catch (err) {
      console.warn('Network issue when checking session, using offline session state.');
    }
  }

  updateNavbar() {
    // If we are currently on the login page, don't inject navigation items
    if (window.location.pathname.includes('login.html')) return;

    const navbarActions = document.querySelector('.navbar-actions');
    if (!navbarActions) return;

    // Clear existing auth button or menu if present
    const existingBtn = document.getElementById('navLoginBtn');
    const existingMenu = document.getElementById('userMenu');
    if (existingBtn) existingBtn.remove();
    if (existingMenu) existingMenu.remove();

    if (this.isLoggedIn()) {
      const name = this.user.fullName || this.user.username;
      const isAdmin = this.isAdmin();
      const host = window.location.hostname;
      const isLocalMachine = (host === 'localhost' || host === '127.0.0.1' || host === '::1');
      // Admin dashboard link only visible from the server machine
      const adminItemHtml = (isAdmin && isLocalMachine)
        ? `<a href="admin.html" class="dropdown-item">📊 Admin Dashboard</a>` 
        : '';

      const menuHtml = `
        <div class="user-menu" id="userMenu">
          <button class="user-menu-trigger" id="userMenuTrigger">
            <span class="avatar-circle">👤</span>
            <span class="user-name-text">${name}</span>
            <span class="chevron-down">▼</span>
          </button>
          <div class="user-dropdown" id="userDropdown">
            <div class="user-dropdown-header">
              <strong>${name}</strong>
              <span>@${this.user.username} (${this.user.role})</span>
            </div>
            <hr>
            <a href="studio.html" class="dropdown-item">🎨 AI Design Studio</a>
            ${adminItemHtml}
            <hr>
            <button class="dropdown-item logout-btn" id="navLogoutBtn">
              <span>🚪</span> <span data-i18n="nav.logout">Đăng xuất</span>
            </button>
          </div>
        </div>
      `;

      // Insert before language toggle if it exists, or just append
      const langToggle = document.getElementById('langToggle');
      if (langToggle) {
        langToggle.insertAdjacentHTML('beforebegin', menuHtml);
      } else {
        navbarActions.insertAdjacentHTML('beforeend', menuHtml);
      }

      // Bind dropdown toggle
      const trigger = document.getElementById('userMenuTrigger');
      const dropdown = document.getElementById('userDropdown');
      if (trigger && dropdown) {
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          dropdown.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
          dropdown.classList.remove('show');
        });
      }

      // Bind logout button
      const logoutBtn = document.getElementById('navLogoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => this.logout());
      }
    } else {
      const loginBtnHtml = `
        <button class="btn btn-ghost btn-sm" id="navLoginBtn" data-i18n="nav.login" style="margin-right: 10px;">Đăng nhập</button>
      `;

      const langToggle = document.getElementById('langToggle');
      if (langToggle) {
        langToggle.insertAdjacentHTML('beforebegin', loginBtnHtml);
      } else {
        navbarActions.insertAdjacentHTML('beforeend', loginBtnHtml);
      }

      // Bind redirect opening click
      const loginBtn = document.getElementById('navLoginBtn');
      if (loginBtn) {
        loginBtn.addEventListener('click', () => {
          window.location.href = '/login.html';
        });
      }
    }

    // Update translations for newly injected elements
    if (window.i18n && typeof window.i18n.updateDOM === 'function') {
      window.i18n.updateDOM();
    }
  }
}

// Global instance
const auth = new AuthManager();
document.addEventListener('DOMContentLoaded', () => {
  auth.init();
});
