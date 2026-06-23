/**
 * Blankup Admin Dashboard Logic
 * Handles stats fetching, order status updates, tab switching, and design rendering
 */

const API_ADMIN = window.location.origin + '/api/admin';
const API_ORDERS = window.location.origin + '/api/orders';

// Local State
const adminState = {
  stats: null,
  orders: [],
  users: [],
  designs: [],
  currentTab: 'overview',
  orderFilter: 'all',
  selectedPreviewOrder: null,
  previewSide: 'front',
  previewShirtColor: '#ffffff',
};

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initOrderFilters();
  initColorDotPreview();
  initPreviewSideToggle();
  initPreviewModalClose();
  
  // Load data
  loadDashboardData();

  // "View all orders" shortcut btn in Overview
  const viewAllBtn = document.getElementById('viewAllOrdersBtn');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', () => {
      switchTab('orders');
    });
  }
});

/* ============================================================
   DATA LOADING
   ============================================================ */
async function loadDashboardData() {
  try {
    const response = await fetch(`${API_ADMIN}/stats`, {
      headers: auth.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch admin stats');
    }

    const resData = await response.json();
    if (resData.success) {
      adminState.stats = resData.stats;
      adminState.users = resData.users;
      
      // Fetch all orders in full
      await loadAllOrders();

      // Render all dashboard sections
      renderOverview();
      renderOrdersList();
      renderUsersList();
      renderDesignsGrid();
    }
  } catch (err) {
    console.error('Error loading admin dashboard data:', err);
    alert('Không thể tải dữ liệu admin. Vui lòng thử lại.');
  }
}

async function loadAllOrders() {
  try {
    const response = await fetch(API_ORDERS, {
      headers: auth.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('API error');
    const res = await response.json();
    adminState.orders = res.data || [];
  } catch (err) {
    console.error('Error fetching orders:', err);
    adminState.orders = [];
  }
}

/* ============================================================
   TAB SYSTEM
   ============================================================ */
function initTabs() {
  const links = document.querySelectorAll('.sidebar-link');
  links.forEach(link => {
    link.addEventListener('click', () => {
      const tab = link.dataset.tab;
      switchTab(tab);
    });
  });
}

function switchTab(tabName) {
  adminState.currentTab = tabName;

  // Active sidebar state
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.toggle('active', link.dataset.tab === tabName);
  });

  // Active panel state
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${tabName}`);
  });

  // Smooth scroll to top of workspace
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   ORDER FILTERS
   ============================================================ */
function initOrderFilters() {
  const pills = document.querySelectorAll('.filter-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      adminState.orderFilter = pill.dataset.filter;
      renderOrdersList();
    });
  });
}

/* ============================================================
   RENDERING
   ============================================================ */

// 1. Overview Tab
function renderOverview() {
  const stats = adminState.stats;
  if (!stats) return;

  const isVi = i18n.currentLang === 'vi';

  // Format currency helper
  const formatMoney = (val) => {
    return isVi 
      ? `${val.toLocaleString('vi-VN')}đ` 
      : `$${Math.round(val / 25000)}`;
  };

  // Populate cards
  document.getElementById('stat-revenue').textContent = formatMoney(stats.totalRevenue);
  document.getElementById('stat-pending-revenue').textContent = formatMoney(stats.pendingRevenue);
  document.getElementById('stat-average-value').textContent = formatMoney(stats.averageOrderValue);
  document.getElementById('stat-total-orders').textContent = stats.totalOrdersCount;
  document.getElementById('stat-users-count').textContent = stats.usersCount;
  document.getElementById('stat-designs-count').textContent = stats.designsCount;

  // Populate indicator summaries
  document.getElementById('summary-completed').textContent = stats.completedCount;
  document.getElementById('summary-pending').textContent = stats.pendingCount;
  document.getElementById('summary-cancelled').textContent = stats.cancelledCount;

  // Render Category Breakdown bars
  const list = document.getElementById('categoryBreakdownList');
  if (list) {
    const cats = stats.categories || {};
    const maxRevenue = Math.max(...Object.values(cats).map(c => c.revenue), 1);

    const categoriesLocal = {
      tshirt: { name: isVi ? 'Áo Thun Basic' : 'Basic T-Shirt' },
      oversize: { name: isVi ? 'Áo Thun Oversize' : 'Oversize T-Shirt' },
      polo: { name: isVi ? 'Áo Polo Classic' : 'Classic Polo' },
      hoodie: { name: isVi ? 'Hoodie Premium' : 'Premium Hoodie' },
    };

    list.innerHTML = Object.keys(cats).map(key => {
      const cat = cats[key];
      const name = categoriesLocal[key]?.name || key;
      const pct = (cat.revenue / maxRevenue) * 100;
      return `
        <div class="category-row">
          <div class="category-labels">
            <span class="cat-name">${name}</span>
            <span class="cat-count">${cat.count} ${isVi ? 'cái' : 'pcs'} | ${formatMoney(cat.revenue)}</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Recent Orders Table (Overview tab)
  const recentBody = document.getElementById('recentOrdersTableBody');
  if (recentBody) {
    const recent = adminState.orders.slice(0, 5); // Take top 5
    recentBody.innerHTML = recent.map(order => renderOrderRow(order)).join('');
    bindRowActions(recentBody);
  }
}

// 2. Orders Tab
function renderOrdersList() {
  const tbody = document.getElementById('allOrdersTableBody');
  if (!tbody) return;

  const filter = adminState.orderFilter;
  let filteredOrders = adminState.orders;

  if (filter !== 'all') {
    filteredOrders = adminState.orders.filter(o => o.status === filter);
  }

  if (filteredOrders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 30px;">
          Không có đơn hàng nào trong bộ lọc này.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredOrders.map(order => renderOrderRow(order)).join('');
  bindRowActions(tbody);
}

function renderOrderRow(order) {
  const isVi = i18n.currentLang === 'vi';
  const total = order.price * order.quantity;
  const priceStr = isVi 
    ? `${total.toLocaleString('vi-VN')}đ` 
    : `$${Math.round(total / 25000)}`;
  
  const dateObj = new Date(order.createdAt);
  const dateStr = dateObj.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const statusMap = {
    pending: { label: isVi ? 'Đang xử lý' : 'Pending', cls: 'badge-pending' },
    completed: { label: isVi ? 'Hoàn thành' : 'Completed', cls: 'badge-completed' },
    cancelled: { label: isVi ? 'Đã hủy' : 'Cancelled', cls: 'badge-cancelled' },
  };

  const status = statusMap[order.status] || { label: order.status, cls: '' };

  const completeActionHtml = order.status === 'pending'
    ? `<button class="btn-icon btn-complete-action" data-action="complete" data-id="${order.orderId}" title="${isVi ? 'Đánh dấu Hoàn thành' : 'Mark Completed'}">✓</button>`
    : '';

  const cancelActionHtml = order.status === 'pending'
    ? `<button class="btn-icon btn-cancel-action" data-action="cancel" data-id="${order.orderId}" title="${isVi ? 'Hủy đơn hàng' : 'Cancel Order'}">✕</button>`
    : '';

  return `
    <tr data-order-id="${order.orderId}">
      <td style="font-weight: 700; color: var(--accent);">${order.orderId}</td>
      <td>
        <div style="font-weight: 600;">${order.customer.name}</div>
        <div style="font-size: 12px; color: var(--text-secondary);">${order.customer.phone}</div>
      </td>
      <td>
        <div style="font-weight: 600; text-transform: capitalize;">${order.productType}</div>
        <div style="font-size: 12px; color: var(--text-secondary);">${order.size} - Qty: ${order.quantity}</div>
      </td>
      <td style="font-weight: 700; color: white;">${priceStr}</td>
      <td><span class="badge ${status.cls}">${status.label}</span></td>
      <td style="font-size: 13px; color: var(--text-secondary);">${dateStr}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-icon btn-view-action" data-action="preview" data-id="${order.orderId}" title="${isVi ? 'Xem thiết kế' : 'View Design'}">👁️</button>
          ${completeActionHtml}
          ${cancelActionHtml}
        </div>
      </td>
    </tr>
  `;
}

function bindRowActions(container) {
  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const orderId = btn.dataset.id;
      
      if (action === 'complete') {
        updateOrderStatus(orderId, 'completed');
      } else if (action === 'cancel') {
        if (confirm(i18n.currentLang === 'vi' ? 'Bạn chắc chắn muốn hủy đơn hàng này?' : 'Are you sure you want to cancel this order?')) {
          updateOrderStatus(orderId, 'cancelled');
        }
      } else if (action === 'preview') {
        openPreviewModal(orderId);
      }
    });
  });
}

// 3. Users Tab
function renderUsersList() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  const isVi = i18n.currentLang === 'vi';

  if (adminState.users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 30px;">
          Không tìm thấy tài khoản người dùng nào.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = adminState.users.map(u => {
    const dateObj = new Date(u.createdAt);
    const dateStr = dateObj.toLocaleDateString(isVi ? 'vi-VN' : 'en-US');
    const totalSpendStr = isVi 
      ? `${u.totalSpend.toLocaleString('vi-VN')}đ` 
      : `$${Math.round(u.totalSpend / 25000)}`;

    const roleHtml = u.role === 'admin' 
      ? `<span class="badge badge-pending" style="font-size:11px;">Admin</span>` 
      : `<span class="badge badge-completed" style="font-size:11px; background:rgba(255,255,255,0.05); color:var(--text-secondary); border:none;">User</span>`;

    return `
      <tr>
        <td style="font-weight: 700;">@${u.username}</td>
        <td style="font-weight: 600; color: white;">${u.fullName}</td>
        <td>${roleHtml}</td>
        <td style="color: var(--text-secondary); font-size:13px;">${dateStr}</td>
        <td style="font-weight: 600; text-align: center;">${u.ordersCount}</td>
        <td style="font-weight: 700; color: var(--color-gold);">${totalSpendStr}</td>
      </tr>
    `;
  }).join('');
}

// 4. Designs Tab (Grid of all custom generated designs)
async function renderDesignsGrid() {
  const grid = document.getElementById('designsGrid');
  if (!grid) return;

  // Let's load the designs from AI Design Gallery
  try {
    const response = await fetch(`${window.location.origin}/api/ai-design/gallery`);
    if (!response.ok) throw new Error('API Error');
    const res = await response.json();
    adminState.designs = res.data || [];
  } catch (err) {
    console.error('Error fetching designs gallery:', err);
    adminState.designs = [];
  }

  if (adminState.designs.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 40px;">
        Chưa có thiết kế AI nào được tạo trên hệ thống.
      </div>
    `;
    return;
  }

  const isVi = i18n.currentLang === 'vi';

  grid.innerHTML = adminState.designs.map(design => {
    const prompt = isVi ? design.prompt : (design.promptEn || design.prompt);
    
    // We will render a template based on the design style
    // (If the designUrl starts with data:, it is an SVG)
    const previewUrl = design.designUrl;

    return `
      <div class="design-item-card">
        <div class="design-card-preview">
          <img src="${previewUrl}" alt="${prompt}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23f3f4f6\'/%3E%3Ctext x=\'50\' y=\'55\' text-anchor=\'middle\' fill=\'%239ca3af\'%3EError%3C/text%3E%3C/svg%3E'">
        </div>
        <div class="design-card-details">
          <div class="design-card-prompt">"${prompt}"</div>
          <div class="design-card-meta">
            <span class="design-card-author">👤 ${design.author || 'Guest'}</span>
            <span>❤️ ${design.likes || 0}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ============================================================
   STATUS UPDATES
   ============================================================ */
async function updateOrderStatus(orderId, newStatus) {
  try {
    const response = await fetch(`${API_ORDERS}/${orderId}/status`, {
      method: 'PUT',
      headers: auth.getAuthHeaders(),
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to update');
    }

    // Success! Reload dashboard statistics and items
    await loadDashboardData();
  } catch (err) {
    console.error('Error updating order status:', err);
    alert('Lỗi: ' + err.message);
  }
}

/* ============================================================
   PREVIEW MODAL ACTIONS
   ============================================================ */
function openPreviewModal(orderId) {
  const order = adminState.orders.find(o => o.orderId === orderId);
  if (!order) return;

  adminState.selectedPreviewOrder = order;
  adminState.previewSide = 'front';
  adminState.previewShirtColor = order.color || '#ffffff';

  // Fill text fields
  const isVi = i18n.currentLang === 'vi';
  document.getElementById('prev-order-id').textContent = order.orderId;
  document.getElementById('prev-customer-name').textContent = order.customer.name;
  document.getElementById('prev-customer-contact').textContent = order.customer.phone;
  document.getElementById('prev-customer-address').textContent = order.customer.address;
  document.getElementById('prev-customer-note').textContent = order.customer.note || '—';
  
  const total = order.price * order.quantity;
  const totalStr = isVi 
    ? `${total.toLocaleString('vi-VN')}đ` 
    : `$${Math.round(total / 25000)}`;

  document.getElementById('prev-product-details').textContent = `${order.productType.toUpperCase()} (${order.size}) - ${isVi ? 'Đơn giá' : 'Unit Price'}: ${isVi ? order.price.toLocaleString('vi-VN') + 'đ' : '$' + Math.round(order.price / 25000)}`;
  document.getElementById('prev-quantity').textContent = `${order.quantity} → ${totalStr}`;
  document.getElementById('prev-author').textContent = order.authorName || 'Guest';

  syncAdminPreviewSideButtons();
  renderAdminPreviewDesign();

  // Update active color dots in modal
  document.querySelectorAll('.admin-color-dot').forEach(dot => {
    dot.classList.toggle('active', dot.dataset.color === adminState.previewShirtColor);
  });

  updateAdminMockupColor();

  // Open modal overlay
  document.getElementById('designPreviewModal').classList.add('open');
}

function initPreviewSideToggle() {
  document.querySelectorAll('.admin-side-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      adminState.previewSide = btn.dataset.side || 'front';
      syncAdminPreviewSideButtons();
      renderAdminPreviewDesign();
    });
  });
}

function getOrderDesignUrl(order, side = adminState.previewSide) {
  if (!order) return '';
  const front = order.frontDesignUrl || order.designUrl || '';
  const back = order.backDesignUrl || '';
  return side === 'back' ? (back || front) : front;
}

function syncAdminPreviewSideButtons() {
  const order = adminState.selectedPreviewOrder;
  const hasBack = Boolean(order?.backDesignUrl);
  document.querySelectorAll('.admin-side-btn').forEach(btn => {
    const side = btn.dataset.side;
    btn.classList.toggle('active', side === adminState.previewSide);
    btn.disabled = side === 'back' && !hasBack;
  });
}

function renderAdminPreviewDesign() {
  const order = adminState.selectedPreviewOrder;
  const designUrl = getOrderDesignUrl(order);
  const overlay = document.getElementById('mockupDesignAdmin');
  const dlLink = document.getElementById('downloadSvgLink');

  if (overlay) {
    overlay.innerHTML = designUrl
      ? `<img src="${designUrl}" alt="AI Custom Design">`
      : `<span style="font-size: 11px; color: var(--text-secondary);">No design</span>`;
  }

  if (dlLink) {
    if (designUrl) {
      dlLink.href = designUrl;
      dlLink.download = `blankup-${order?.orderId || 'order'}-${adminState.previewSide}.png`;
      dlLink.style.display = 'inline-block';
    } else {
      dlLink.style.display = 'none';
    }
  }
}

function updateAdminMockupColor() {
  const mockup = document.getElementById('mockupTshirtAdmin');
  if (!mockup) return;

  const color = adminState.previewShirtColor;
  const isLight = isLightColorAdmin(color);
  const strokeColor = isLight ? '#ddd' : 'rgba(255,255,255,0.2)';
  const gradientLight = lightenColorAdmin(color, 10);
  const gradientDark = darkenColorAdmin(color, 10);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 360">
      <defs>
        <linearGradient id="g-admin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${gradientLight}"/>
          <stop offset="100%" stop-color="${gradientDark}"/>
        </linearGradient>
      </defs>
      <path d="M75 50 L30 80 L10 140 L55 150 L65 100 L65 330 L235 330 L235 100 L245 150 L290 140 L270 80 L225 50 L195 65 Q175 80 150 80 Q125 80 105 65 Z" fill="url(#g-admin)" stroke="${strokeColor}" stroke-width="1"/>
      <ellipse cx="150" cy="52" rx="30" ry="15" fill="none" stroke="${strokeColor}" stroke-width="1"/>
    </svg>
  `;

  mockup.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function initColorDotPreview() {
  document.querySelectorAll('.admin-color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.admin-color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      adminState.previewShirtColor = dot.dataset.color;
      updateAdminMockupColor();
    });
  });
}

function initPreviewModalClose() {
  const modal = document.getElementById('designPreviewModal');
  const close = document.getElementById('previewModalClose');

  if (close) {
    close.addEventListener('click', () => modal.classList.remove('open'));
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  }
}

/* ============================================================
   COLOR CONVERSION UTILS
   ============================================================ */
function isLightColorAdmin(hex) {
  if (!hex || hex.length < 7) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function lightenColorAdmin(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function darkenColorAdmin(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// Re-render when language changes
i18n.onChange(() => {
  renderOverview();
  renderOrdersList();
  renderUsersList();
  renderDesignsGrid();
});
