const state = {
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    currentView: 'dashboard'
};

const API_BASE = '/api';

// --- Utils ---
async function apiCall(endpoint, method = 'GET', body = null, isMultipart = false) {
    const headers = {};
    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }

    const options = { method, headers };

    if (body) {
        if (isMultipart) {
            options.body = body;
            // Content-Type header is set automatically by browser for FormData
        } else {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        if (response.status === 401) {
            logout();
            throw new Error('Session expired');
        }
        if (response.status === 403) {
            throw new Error('Permission denied');
        }

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'API Error');
        return data;
    } catch (error) {
        showToast(error.message, 'error');
        throw error;
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// --- Auth ---
function init() {
    if (!state.token) {
        renderLogin();
    } else {
        renderDashboard();
    }
}

async function login(userId, password) {
    try {
        const data = await apiCall('/auth/login', 'POST', { userId, password });
        state.user = { id: data.id, name: data.name, role: data.role, email: data.email };
        state.token = data.accessToken;
        localStorage.setItem('user', JSON.stringify(state.user));
        localStorage.setItem('token', state.token);

        showToast('Login successful');
        renderDashboard();
    } catch (err) {
        console.error(err);
    }
}

function logout() {
    state.user = null;
    state.token = null;
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    renderLogin();
}

// --- Rendering ---
function renderLogin() {
    document.getElementById('app-container').style.display = 'none';
    const container = document.getElementById('login-container');
    container.style.display = 'flex';
    container.innerHTML = `
        <div class="auth-box">
            <h2>Admin Login</h2>
            <form id="login-form">
                <div class="form-group">
                    <label>User ID</label>
                    <input type="text" id="userid" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="password" class="form-control" required>
                </div>
                <button type="submit" class="btn btn-primary">Login</button>
            </form>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        login(document.getElementById('userid').value, document.getElementById('password').value);
    });
}

function renderDashboard() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';

    document.getElementById('current-user-name').textContent = state.user.name;
    document.getElementById('current-user-role').textContent = state.user.role;

    document.getElementById('logout-btn').onclick = logout;

    renderSidebar();
    loadModule('dashboard'); // Default view
}

function renderSidebar() {
    const menu = document.getElementById('nav-menu');
    menu.innerHTML = '';

    const items = [
        { id: 'dashboard', icon: 'home', label: 'Dashboard', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { id: 'users', icon: 'users', label: 'User Management', roles: ['SUPER_ADMIN'] },
        { id: 'reviews', icon: 'star', label: 'Client Reviews', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { id: 'queries', icon: 'envelope', label: 'Contact Queries', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { id: 'projects', icon: 'building', label: 'Projects', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { id: 'careers', icon: 'briefcase', label: 'Careers', roles: ['SUPER_ADMIN', 'ADMIN'] },
    ];

    items.forEach(item => {
        if (item.roles.includes(state.user.role)) {
            const a = document.createElement('a');
            a.className = 'nav-item';
            a.href = '#';
            a.innerHTML = `<i class="fas fa-${item.icon}"></i> ${item.label}`;
            a.onclick = (e) => {
                e.preventDefault();
                loadModule(item.id);
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                a.classList.add('active');
            };
            menu.appendChild(a);
        }
    });
}

// --- Modules ---
async function loadModule(moduleId) {
    const content = document.getElementById('content-area');
    const title = document.getElementById('page-title');
    content.innerHTML = '<p>Loading...</p>';

    switch (moduleId) {
        case 'dashboard':
            title.textContent = 'Dashboard';

            try {
                // Fetch stats concurrently
                const [users, projects, reviews, queries, careers] = await Promise.all([
                    apiCall('/users', 'GET').catch(() => []), // Super admin only, might fail for others? Safe check:
                    apiCall('/projects', 'GET'),
                    apiCall('/reviews/admin', 'GET'),
                    apiCall('/contact/admin', 'GET'),
                    apiCall('/careers/admin', 'GET')
                ]);

                // Calculate counts
                const newReviews = reviews.filter(r => r.status === 'Pending').length;
                const newQueries = queries.filter(q => q.status === 'new').length;
                const totalProjects = projects.length;
                const totalApps = careers.length;
                const newApps = careers.filter(c => c.status === 'new').length;

                content.innerHTML = `
                    <div style="margin-bottom: 2rem;">
                        <h2 style="font-size: 1.5rem; font-weight: 600;">Hello, <span style="color: var(--primary);">${state.user.name}</span></h2>
                        <p style="color: var(--text-gray);">Here is what's happening today.</p>
                    </div>

                    <div class="dashboard-grid">
                        <!-- Projects Card -->
                        <div class="summary-card" onclick="loadModule('projects')">
                           <div class="summary-content">
                                <h3>All Projects</h3>
                                <div class="count">${totalProjects}</div>
                                <div class="sub-text">Total Projects</div>
                           </div>
                           <div class="summary-icon" style="color: var(--primary); background: rgba(38, 71, 150, 0.1);"><i class="fas fa-building"></i></div>
                        </div>

                        <!-- Reviews Card -->
                        <div class="summary-card" onclick="loadModule('reviews')">
                           <div class="summary-content">
                                <h3>Client Reviews</h3>
                                <div class="count">${newReviews > 0 ? newReviews + ' New' : '0 New'}</div>
                                <div class="sub-text">
                                    <span style="display:block; margin-top: 5px; font-size: 0.75rem; color: var(--secondary); font-weight: 600;">TOTAL REVIEWS</span>
                                    <strong style="font-size: 1rem; color: var(--text-main);">${reviews.length}</strong>
                                </div>
                           </div>
                           <div class="summary-right-panel">
                               <div class="summary-icon" style="color: var(--warning); background: rgba(245, 158, 11, 0.1);"><i class="fas fa-star"></i></div>
                               <div class="total-stats">
                                   <span>Avg Rating</span>
                                   <strong>${(() => {
                        const totalRating = reviews.reduce((sum, r) => sum + parseInt(r.rating || 0), 0);
                        return reviews.length ? (totalRating / reviews.length).toFixed(1) + ' / 5' : 'N/A';
                    })()}</strong>
                               </div>
                           </div>
                           ${newReviews > 0 ? '<div class="notification-dot">' + newReviews + '</div>' : ''}
                        </div>

                        <!-- Queries Card -->
                        <div class="summary-card" onclick="loadModule('queries')">
                           <div class="summary-content">
                                <h3>Contact Queries</h3>
                                <div class="count">${newQueries > 0 ? newQueries + ' New' : '0 New'}</div>
                                <div class="sub-text">Unread Messages</div>
                           </div>
                           <div class="summary-icon" style="color: var(--success); background: rgba(34, 197, 94, 0.1);"><i class="fas fa-envelope"></i></div>
                           ${newQueries > 0 ? '<div class="notification-dot">' + newQueries + '</div>' : ''}
                        </div>

                        <!-- Careers Card -->
                        <div class="summary-card" onclick="loadModule('careers')">
                           <div class="summary-content">
                                <h3>Careers</h3>
                                <div class="count">${newApps} New</div>
                                <div class="sub-text">Received Applications</div>
                           </div>
                           <div class="summary-icon" style="color: var(--btn-color); background: rgba(0, 151, 211, 0.1);"><i class="fas fa-briefcase"></i></div>
                           ${newApps > 0 ? '<div class="notification-dot">' + newApps + '</div>' : ''}
                        </div>
                    </div>

                    <!-- Lower Content Section -->
                    <div class="content-grid">
                        <!-- Recent Reviews -->
                        <div class="content-block">
                            <h3>Recent Reviews <button class="btn-sm btn-edit" onclick="loadModule('reviews')" style="margin:0; font-size: 0.7rem;">View All</button></h3>
                            <div class="recent-list">
                                ${reviews.slice(0, 3).map(r => `
                                    <div class="recent-item ${r.status === 'Pending' ? 'unread' : ''}" onclick="loadModule('reviews')">
                                        <div class="avatar">${r.clientName.charAt(0)}</div>
                                        <div class="info">
                                            <h4>${r.clientName}</h4>
                                            <p>${r.reviewText.substring(0, 60)}...</p>
                                        </div>
                                    </div>
                                `).join('') || '<p style="color: var(--text-muted); font-size: 0.9rem;">No reviews yet.</p>'}
                            </div>
                        </div>

                        <!-- Recent Queries -->
                        <div class="content-block">
                            <h3>Recent Queries <button class="btn-sm btn-edit" onclick="loadModule('queries')" style="margin:0; font-size: 0.7rem;">View All</button></h3>
                            <div class="recent-list">
                                ${queries.slice(0, 3).map(q => `
                                    <div class="recent-item ${q.status === 'new' ? 'unread' : ''}" onclick="loadModule('queries')">
                                        <div class="avatar" style="color: var(--success); background: rgba(34, 197, 94, 0.1);">${q.name.charAt(0)}</div>
                                        <div class="info">
                                            <h4>${q.name}</h4>
                                            <p>${q.message.substring(0, 60)}...</p>
                                        </div>
                                    </div>
                                `).join('') || '<p style="color: var(--text-muted); font-size: 0.9rem;">No queries yet.</p>'}
                            </div>
                        </div>

                        <!-- Recent Applications -->
                        <div class="content-block">
                            <h3>New Applications <button class="btn-sm btn-edit" onclick="loadModule('careers')" style="margin:0; font-size: 0.7rem;">View All</button></h3>
                            <div class="recent-list">
                                ${careers.slice(0, 3).map(a => `
                                    <div class="recent-item ${a.status === 'new' ? 'unread' : ''}" onclick="loadModule('careers')">
                                        <div class="avatar" style="color: var(--btn-color); background: rgba(0, 151, 211, 0.1);">${a.name.charAt(0)}</div>
                                        <div class="info">
                                            <h4>${a.name}</h4>
                                            <p>Applied for: <strong>${a.appliedRole}</strong></p>
                                        </div>
                                    </div>
                                `).join('') || '<p style="color: var(--text-muted); font-size: 0.9rem;">No applications yet.</p>'}
                            </div>
                        </div>
                    </div>
                `;
            } catch (err) {
                content.innerHTML = `<p class="error">Error loading dashboard stats: ${err.message}</p>`;
            }
            break;

        case 'users':
            title.textContent = 'User Management';
            await loadUsers(content);
            break;

        case 'reviews':
            title.textContent = 'Client Reviews';
            await loadReviews(content);
            break;

        case 'queries':
            title.textContent = 'Contact Queries';
            await loadQueries(content);
            break;

        case 'projects':
            title.textContent = 'Project Manager';
            await loadProjects(content);
            break;

        case 'careers':
            title.textContent = 'Job Applications';
            await loadCareers(content);
            break;
    }
}

// --- Module Implementations ---
// 1. Users
async function loadUsers(container) {
    try {
        const users = await apiCall('/users', 'GET');
        container.innerHTML = `
            <button class="btn btn-primary" style="margin-bottom: 1rem;" onclick="showUserModal()">Add New Admin</button>
            <div class="card">
                <table class="data-table">
                    <thead><tr><th>Name</th><th>Email</th><th>User ID</th><th>Role</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${users.map(u => `
                            <tr>
                                <td>${u.name}</td>
                                <td>${u.email}</td>
                                <td>${u.userId}</td>
                                <td>${u.role}</td>
                                <td>
                                    <button class="btn-sm btn-delete" onclick="deleteUser('${u.id}')"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<p class="error">Error loading users</p>`;
    }
}

window.showUserModal = () => {
    showModal(`
        <h3>Add Admin User</h3>
        <form id="add-user-form">
            <div class="form-group"><label>Name</label><input type="text" name="name" class="form-control" required></div>
            <div class="form-group"><label>Email</label><input type="email" name="email" class="form-control" required></div>
            <div class="form-group"><label>User ID</label><input type="text" name="userId" class="form-control" required></div>
            <div class="form-group"><label>Password</label><input type="password" name="password" class="form-control" required></div>
            <button type="submit" class="btn btn-primary">Create User</button>
        </form>
    `, async () => {
        document.getElementById('add-user-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.role = 'ADMIN'; // Default
            try {
                await apiCall('/users', 'POST', data);
                closeModal();
                showToast('User created');
                loadModule('users');
            } catch (err) {
                console.error(err);
                alert('Error creating user: ' + (err.message || 'Unknown error'));
            }
        };
    });
};

window.deleteUser = async (id) => {
    if (confirm('Are you sure?')) {
        try {
            await apiCall(`/users/${id}`, 'DELETE');
            showToast('User deleted');
            loadModule('users');
        } catch (err) {
            console.error(err);
            alert('Error deleting user: ' + (err.message || 'Unknown error'));
        }
    }
};

// 2. Reviews
async function loadReviews(container) {
    try {
        const reviews = await apiCall('/reviews/admin', 'GET');
        container.innerHTML = `
            <button class="btn btn-primary" style="margin-bottom: 1rem;" onclick="showReviewModal()">Add Review</button>
            <div class="card">
                <table class="data-table">
                    <thead><tr><th>Client</th><th>Company</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${reviews.map(r => {
            let statusColor = 'var(--warning)'; // Pending
            if (r.status === 'Accepted') statusColor = 'var(--success)';
            if (r.status === 'Rejected') statusColor = 'var(--danger)';

            return `
                            <tr>
                                <td>${r.clientName}</td>
                                <td>${r.companyName || '-'}</td>
                                <td>${r.rating}/5</td>
                                <td><span style="color: ${statusColor}; font-weight: 600;">${r.status}</span></td>
                                <td>
                                    <button class="btn-sm btn-edit" title="View Details" onclick="viewReviewDetails('${r.id}')"><i class="fas fa-eye"></i></button>
                                    <button class="btn-sm btn-delete" title="Delete" onclick="deleteReview('${r.id}')"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        window.cachedReviews = reviews;
    } catch (e) { container.innerHTML = 'Error loading reviews'; }
}

window.viewReviewDetails = (id) => {
    const review = window.cachedReviews.find(r => r.id === id);
    if (!review) return;

    showModal(`
        <div class="review-detail-modal">
            <div class="modal-header-custom">
                <h3>Review Details</h3>
                <span class="status-badge ${review.status.toLowerCase()}">${review.status}</span>
            </div>
            
            <div class="review-media-grid">
                <div class="media-item">
                    <label>Reviewer Photo</label>
                    ${review.reviewerPhoto ? `<img src="${review.reviewerPhoto}" class="review-img-preview">` : '<div class="no-img">No Photo</div>'}
                </div>
                <div class="media-item">
                    <label>Company Logo</label>
                    ${review.companyLogo ? `<img src="${review.companyLogo}" class="review-img-preview">` : '<div class="no-img">No Logo</div>'}
                </div>
            </div>

            ${review.reviewImages && review.reviewImages.length > 0 ? `
                <div class="review-carousel-container">
                    <label style="font-size: 0.75rem; color: #6b7280; font-weight: 600; margin-bottom: 5px; display: block;">Project Images</label>
                    <div class="carousel-wrapper">
                        <div class="carousel-slides">
                            ${review.reviewImages.map(img => `<img src="${img}" class="carousel-img" onclick="window.open('${img}', '_blank')">`).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}

            <div class="review-info-grid">
                <div><strong>Client:</strong> ${review.clientName}</div>
                <div><strong>Company:</strong> ${review.companyName || '-'}</div>
                <div><strong>Rating:</strong> ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                <div><strong>Date:</strong> ${review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'N/A'}</div>
            </div>

            <div class="review-text-block">
                <label>Review</label>
                <p>"${review.reviewText}"</p>
            </div>

            <div class="modal-actions">
                ${review.status !== 'Accepted' ? `<button class="btn btn-success" onclick="updateReviewStatus('${review.id}', 'Accepted')">Accept Review</button>` : ''}
                ${review.status !== 'Rejected' ? `<button class="btn btn-danger" onclick="updateReviewStatus('${review.id}', 'Rejected')">Reject Review</button>` : ''}
                <button class="btn btn-secondary" onclick="closeModal()">Close</button>
            </div>
        </div>
        <style>
            .review-detail-modal { display: flex; flex-direction: column; gap: 1rem; }
            .modal-header-custom { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
            .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; }
            .status-badge.pending { background: #fff7ed; color: #c2410c; }
            .status-badge.accepted { background: #f0fdf4; color: #15803d; }
            .status-badge.rejected { background: #fef2f2; color: #b91c1c; }
            .review-media-grid { display: flex; gap: 1rem; margin-top: 0.5rem; }
            .media-item { flex: 1; text-align: center; background: #f9fafb; padding: 10px; border-radius: 6px; }
            .media-item label { display: block; font-size: 0.75rem; color: #6b7280; margin-bottom: 5px; }
            .review-img-preview { width: 80px; height: 80px; object-fit: cover; border-radius: 50%; border: 2px solid #e5e7eb; }
            .no-img { width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; background: #e5e7eb; border-radius: 50%; color: #9ca3af; margin: 0 auto; font-size: 0.7rem; }
            .review-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.9rem; background: #f3f4f6; padding: 10px; border-radius: 6px; }
            .review-text-block { background: #fff; border: 1px solid #e5e7eb; padding: 10px; border-radius: 6px; }
            .review-text-block label { display: block; font-size: 0.75rem; color: #6b7280; margin-bottom: 5px; font-weight: 600; }
            .review-text-block p { font-style: italic; color: #374151; margin: 0; }
            .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 1rem; border-top: 1px solid #eee; padding-top: 1rem; }
            .modal-actions .btn { min-width: 100px; } /* Ensure buttons have width */
        </style>
    `);
};

window.updateReviewStatus = async (id, status) => {
    if (confirm(`Mark review as ${status}?`)) {
        try {
            // Must allow partial updates via FormData or JSON. 
            // Our controller expects multipart mostly for files, but handles JSON if no files? 
            // The route expects Multer which handles multipart. 
            // If we send JSON to a Multer route, it generally works if we don't send files, 
            // BUT let's use FormData to be safe since the route is configured for it.

            const formData = new FormData();
            formData.append('status', status);

            await apiCall(`/reviews/${id}`, 'PUT', formData, true);
            closeModal();
            showToast(`Review ${status}`);
            loadModule('reviews');
        } catch (err) {
            alert('Error updating status');
        }
    }
};

window.showReviewModal = () => {
    showModal(`
        <h3>Add Client Review</h3>
        <form id="add-review-form">
            <div class="form-group"><label>Client Name</label><input type="text" name="clientName" class="form-control" required></div>
            <div class="form-group"><label>Company</label><input type="text" name="companyName" class="form-control"></div>
            <div class="form-group"><label>Review Text</label><textarea name="reviewText" class="form-control" required></textarea></div>
            <div class="form-group"><label>Rating (1-5)</label><input type="number" name="rating" min="1" max="5" class="form-control" required></div>
            
            <div class="form-group">
                <label>Reviewer Photo (Optional)</label>
                <input type="file" name="reviewerPhoto" class="form-control" accept="image/*">
            </div>
             <div class="form-group">
                <label>Company Logo (Optional)</label>
                <input type="file" name="companyLogo" class="form-control" accept="image/*">
            </div>
            
            <div class="form-group">
                <label>Project Images (Multiple, Optional)</label>
                <input type="file" name="reviewImages" class="form-control" accept="image/*" multiple>
            </div>

            <div class="form-group"><label>Initial Status</label>
                <select name="status" class="form-control">
                    <option value="Pending">Pending</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary">Save Review</button>
        </form>
    `, async () => {
        document.getElementById('add-review-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            try {
                // Remove empty files to avoid backend issues if any (Multer handles empty fields ok usually)
                const photo = formData.get('reviewerPhoto');
                if (photo && photo.size === 0) formData.delete('reviewerPhoto');

                const logo = formData.get('companyLogo');
                if (logo && logo.size === 0) formData.delete('companyLogo');

                await apiCall('/reviews', 'POST', formData, true); // Multipart
                closeModal();
                showToast('Review saved');
                loadModule('reviews');
            } catch (err) {
                console.error(err);
                alert('Error saving review: ' + (err.message || 'Unknown error'));
            }
        };
    });
};

window.deleteReview = async (id) => {
    if (confirm('Delete review?')) {
        await apiCall(`/reviews/${id}`, 'DELETE');
        loadModule('reviews');
    }
};

// 3. Contact Queries
async function loadQueries(container) {
    try {
        const queries = await apiCall('/contact/admin', 'GET');
        container.innerHTML = `
            <div class="card">
                <table class="data-table">
                    <thead><tr><th>Name</th><th>Email</th><th>Date</th><th>Message</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${queries.map(q => `
                            <tr>
                                <td>${q.name}</td>
                                <td>${q.email}</td>
                                <td>${new Date(q.date).toLocaleDateString()}</td>
                                <td>${q.message.substring(0, 50)}...</td>
                                <td>
                                    <button class="btn-sm btn-delete" onclick="deleteQuery('${q.id}')"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (e) { container.innerHTML = 'Error loading queries'; }
}

window.deleteQuery = async (id) => {
    if (confirm('Delete query?')) {
        await apiCall(`/contact/admin/${id}`, 'DELETE');
        loadModule('queries');
    }
};

// 4. Projects
let cachedProjects = []; // Store for filtering

async function loadProjects(container) {
    try {
        cachedProjects = await apiCall('/projects', 'GET');
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                 <div class="filter-bar" style="margin-bottom: 0;">
                    <button class="filter-btn active" onclick="filterProjects('ALL', this)">All Projects</button>
                    <button class="filter-btn" onclick="filterProjects('Ongoing', this)">Ongoing</button>
                    <button class="filter-btn" onclick="filterProjects('Completed', this)">Completed</button>
                </div>
                <button class="btn btn-primary" onclick="showProjectModal()">Add Project</button>
            </div>
           
            <div class="card">
                <table class="data-table">
                    <thead><tr><th>Image</th><th>Title</th><th>Location</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody id="projects-table-body">
                        <!-- Dynamic Content -->
                    </tbody>
                </table>
                <div id="no-projects-msg" style="display:none; text-align: center; padding: 2rem; color: var(--text-gray);">
                    No projects found for this filter.
                </div>
            </div>
        `;
        renderProjectTable(cachedProjects);
    } catch (e) { container.innerHTML = 'Error loading projects'; }
}

window.filterProjects = (status, btn) => {
    // Update Active State
    if (btn) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    // Filter Data
    if (status === 'ALL') {
        renderProjectTable(cachedProjects);
    } else {
        const filtered = cachedProjects.filter(p => p.status === status);
        renderProjectTable(filtered);
    }
};

function renderProjectTable(projects) {
    const tbody = document.getElementById('projects-table-body');
    const noMsg = document.getElementById('no-projects-msg');

    if (projects.length === 0) {
        tbody.innerHTML = '';
        noMsg.style.display = 'block';
        return;
    }

    noMsg.style.display = 'none';
    tbody.innerHTML = projects.map(p => `
        <tr>
            <td>
                ${(p.images && p.images.length > 0) ? `<img src="${p.images[0]}" style="height: 40px; border-radius: 4px;">` :
            (p.image ? `<img src="${p.image}" style="height: 40px; border-radius: 4px;">` : 'No Img')}
            </td>
            <td>${p.title}</td>
            <td>${p.location}</td>
            <td><span style="color: ${p.status === 'Completed' ? 'var(--success)' : 'var(--warning)'}">${p.status}</span></td>
            <td>
                <button class="btn-sm btn-edit" onclick="openEditProject('${p.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-sm btn-delete" onclick="deleteProject('${p.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// Helper to open edit modal
window.openEditProject = (id) => {
    const project = cachedProjects.find(p => p.id === id);
    if (project) showProjectModal(project);
};

window.showProjectModal = (project = null) => {
    // State for this modal instance
    let existingImages = project ? (project.images || (project.image ? [project.image] : [])) : [];
    let newFiles = [];
    const MAX_IMAGES = 27;

    const renderPreviews = () => {
        const container = document.getElementById('preview-container');
        const countSpan = document.getElementById('image-count');
        const uploadBtn = document.getElementById('upload-trigger-btn');

        const total = existingImages.length + newFiles.length;
        countSpan.textContent = `${total} / ${MAX_IMAGES}`;
        uploadBtn.disabled = total >= MAX_IMAGES;

        container.innerHTML = '';

        // Existing
        existingImages.forEach((src, idx) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `<img src="${src}"> <button type="button" class="remove-btn" onclick="removeExisting(${idx})">&times;</button>`;
            container.appendChild(div);
        });

        // New
        newFiles.forEach((file, idx) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            // Create object URL
            const url = URL.createObjectURL(file);
            div.innerHTML = `<img src="${url}"> <button type="button" class="remove-btn" onclick="removeNew(${idx})">&times;</button>`;
            container.appendChild(div);
        });
    };

    // Global handlers for the modal context (temporary window Attachments)
    window.removeExisting = (idx) => {
        existingImages.splice(idx, 1);
        renderPreviews();
    };
    window.removeNew = (idx) => {
        newFiles.splice(idx, 1);
        renderPreviews();
    };

    // File Handler
    window.handleFiles = (input) => {
        const files = Array.from(input.files);
        const currentTotal = existingImages.length + newFiles.length;
        const allowed = MAX_IMAGES - currentTotal;

        if (files.length > allowed) {
            alert(`Limit exceeded. You can only add ${allowed} more images.`);
            return;
        }

        for (let f of files) {
            // Validate type
            if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(f.type)) {
                alert('Invalid format: ' + f.name);
                continue;
            }
            newFiles.push(f);
        }
        renderPreviews();
        input.value = ''; // Reset
    };

    showModal(`
        <h3>${project ? 'Edit Project' : 'Add Project'}</h3>
        <form id="project-form">
            <div class="form-group"><label>Title</label><input type="text" name="title" class="form-control" value="${project ? project.title : ''}" required></div>
            <div class="form-group"><label>Location</label><input type="text" name="location" class="form-control" value="${project ? project.location : ''}" required></div>
            <div class="form-group"><label>Area (SqFt)</label><input type="text" name="area" class="form-control" value="${project ? project.area || '' : ''}"></div>
            <div class="form-group"><label>Weight</label><input type="text" name="weight" class="form-control" value="${project ? project.weight || '' : ''}"></div>
            <div class="form-group"><label>Status</label>
                <select name="status" class="form-control">
                    <option value="Ongoing" ${project && project.status === 'Ongoing' ? 'selected' : ''}>Ongoing</option>
                    <option value="Completed" ${project && project.status === 'Completed' ? 'selected' : ''}>Completed</option>
                </select>
            </div>
            <div class="form-group"><label>YouTube Video URL</label><input type="url" name="youtubeUrl" class="form-control" placeholder="https://youtube.com/..." value="${project ? project.youtubeUrl || '' : ''}"></div>
            <div class="form-group"><label>Description</label><textarea name="description" class="form-control">${project ? project.description || '' : ''}</textarea></div>
            
            <div class="form-group">
                <label>Images (<span id="image-count">0 / ${MAX_IMAGES}</span>)</label>
                <button type="button" id="upload-trigger-btn" class="btn-sm btn-edit" onclick="document.getElementById('file-input').click()">+ Add Images</button>
                <input type="file" id="file-input" hidden multiple accept="image/*" onchange="handleFiles(this)">
                <div id="preview-container" class="image-preview-container"></div>
            </div>

            <button type="submit" class="btn btn-primary">${project ? 'Update Project' : 'Save Project'}</button>
        </form>
    `, () => {
        renderPreviews();

        document.getElementById('project-form').onsubmit = async (e) => {
            e.preventDefault();

            // YouTube Validation
            const ytInput = e.target.youtubeUrl.value;
            const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
            if (ytInput && !ytRegex.test(ytInput)) {
                alert('Invalid YouTube URL');
                return;
            }

            const formData = new FormData(e.target);

            // Append Images
            // 1. Existing paths as strings
            existingImages.forEach(path => formData.append('existingImages', path));
            // 2. New Files
            newFiles.forEach(file => formData.append('images', file));

            // Clean up FormData (remove 'image' from file input if it exists or duplicate names)
            // Note: FormData(e.target) automatically grabs named inputs. 
            // My file input has id='file-input' but NO name attribute, so it won't double add.
            // But I have text inputs.

            try {
                const url = project ? `/projects/${project.id}` : '/projects';
                const method = project ? 'PUT' : 'POST';

                await apiCall(url, method, formData, true); // multipart
                closeModal();
                showToast(project ? 'Project updated' : 'Project saved');
                loadModule('projects');
            } catch (err) {
                console.error(err);
                alert('Error processing request');
            }
        };
    });
};

window.deleteProject = async (id) => {
    if (confirm('Delete project?')) {
        await apiCall(`/projects/${id}`, 'DELETE');
        loadModule('projects');
    }
};

// 5. Careers (Vacancies + Applications)
async function loadCareers(container) {
    container.innerHTML = `
        <div id="vacancies-section">
            <h3 style="margin-bottom: 1rem; color: var(--text-main);">Job Vacancies</h3>
            <div id="vacancies-container"></div>
        </div>
        <div id="applications-section" style="margin-top: 3rem;">
            <h3 style="margin-bottom: 1rem; color: var(--text-main);">Job Applications</h3>
            <div id="applications-container"></div>
        </div>
    `;

    // Load both sections
    await renderVacancies(document.getElementById('vacancies-container'));
    await renderApplications(document.getElementById('applications-container'));
}

// Remove switchCareerTab as it's no longer needed

// --- Vacancies Sub-module ---
let cachedVacancies = [];

async function renderVacancies(container) {
    try {
        cachedVacancies = await apiCall('/vacancies', 'GET');
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                 <div class="filter-bar" style="margin-bottom: 0;">
                    <button class="filter-btn active" onclick="filterVacancies('ALL', this)">All Vacancies</button>
                    <button class="filter-btn" onclick="filterVacancies('Open', this)">Open</button>
                    <button class="filter-btn" onclick="filterVacancies('Closed', this)">Closed</button>
                </div>
                <button class="btn btn-primary" onclick="showVacancyModal()">Add Job Vacancy</button>
            </div>
            
            <div class="card">
                <table class="data-table">
                    <thead><tr><th>Title</th><th>Department</th><th>Location</th><th>Status</th><th>Posted Date</th><th>Actions</th></tr></thead>
                    <tbody id="vacancies-table-body">
                        <!-- Dynamic Content -->
                    </tbody>
                </table>
                 <div id="no-vacancies-msg" style="display:none; text-align: center; padding: 2rem; color: var(--text-gray);">
                    No vacancies found for this filter.
                </div>
            </div>
        `;
        renderVacancyTable(cachedVacancies);
    } catch (e) {
        container.innerHTML = `<p class="error">Error loading vacancies: ${e.message}</p>`;
    }
}

window.filterVacancies = (status, btn) => {
    if (btn) {
        // Ensure we only select buttons within the vacancies container
        const container = document.getElementById('vacancies-container');
        if (container) {
            container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        }
        btn.classList.add('active');
    }

    if (status === 'ALL') {
        renderVacancyTable(cachedVacancies);
    } else {
        const filtered = cachedVacancies.filter(v => v.status === status);
        renderVacancyTable(filtered);
    }
};

function renderVacancyTable(vacancies) {
    const tbody = document.getElementById('vacancies-table-body');
    const noMsg = document.getElementById('no-vacancies-msg');

    if (vacancies.length === 0) {
        tbody.innerHTML = '';
        noMsg.style.display = 'block';
        return;
    }

    noMsg.style.display = 'none';
    tbody.innerHTML = vacancies.map(v => `
        <tr>
            <td>${v.title}</td>
            <td>${v.department}</td>
            <td>${v.location}</td>
            <td>
                <span style="color: ${v.status === 'Open' ? 'var(--success)' : 'var(--warning)'}">${v.status}</span>
            </td>
            <td>${new Date(v.createdAt).toLocaleDateString()}</td>
            <td>
                <button class="btn-sm btn-edit" onclick="openEditVacancy('${v.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-sm btn-edit" title="${v.status === 'Open' ? 'Close Vacancy' : 'Re-open Vacancy'}" onclick="toggleVacancyStatus('${v.id}')">
                    <i class="fas ${v.status === 'Open' ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                </button>
                <button class="btn-sm btn-delete" onclick="deleteVacancy('${v.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

window.showVacancyModal = (vacancy = null) => {
    showModal(`
        <h3>${vacancy ? 'Edit Vacancy' : 'Create Job Vacancy'}</h3>
        <form id="vacancy-form">
            <div class="form-group"><label>Job Title</label><input type="text" name="title" class="form-control" value="${vacancy ? vacancy.title : ''}" required></div>
            <div class="row">
                <div class="col"><div class="form-group"><label>Department</label><input type="text" name="department" class="form-control" value="${vacancy ? vacancy.department : ''}"></div></div>
                <div class="col"><div class="form-group"><label>Location</label><input type="text" name="location" class="form-control" value="${vacancy ? vacancy.location : ''}"></div></div>
            </div>
            <div class="row">
                <div class="col">
                    <div class="form-group"><label>Employment Type</label>
                        <select name="employmentType" class="form-control">
                            <option value="Full-Time" ${vacancy && vacancy.employmentType === 'Full-Time' ? 'selected' : ''}>Full-Time</option>
                            <option value="Part-Time" ${vacancy && vacancy.employmentType === 'Part-Time' ? 'selected' : ''}>Part-Time</option>
                            <option value="Contract" ${vacancy && vacancy.employmentType === 'Contract' ? 'selected' : ''}>Contract</option>
                        </select>
                    </div>
                </div>
                <div class="col"><div class="form-group"><label>Experience</label><input type="text" name="experience" class="form-control" value="${vacancy ? vacancy.experience || '' : ''}" placeholder="e.g. 2-5 years"></div></div>
            </div>
            <div class="form-group"><label>Salary Range</label><input type="text" name="salary" class="form-control" value="${vacancy ? vacancy.salary || '' : ''}" placeholder="Optional"></div>
            <div class="form-group"><label>Job Description</label><textarea name="description" class="form-control" style="height: 120px;">${vacancy ? vacancy.description || '' : ''}</textarea></div>
            <div class="form-group"><label>Status</label>
                <select name="status" class="form-control">
                    <option value="Open" ${vacancy && vacancy.status === 'Open' ? 'selected' : ''}>Open</option>
                    <option value="Closed" ${vacancy && vacancy.status === 'Closed' ? 'selected' : ''}>Closed</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary">${vacancy ? 'Update Vacancy' : 'Create Vacancy'}</button>
        </form>
    `, () => {
        document.getElementById('vacancy-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            try {
                const url = vacancy ? `/vacancies/${vacancy.id}` : '/vacancies';
                const method = vacancy ? 'PUT' : 'POST';
                await apiCall(url, method, data);

                closeModal();
                showToast(vacancy ? 'Vacancy updated' : 'Vacancy created');
                // Refresh list
                renderVacancies(document.getElementById('vacancies-container'));
            } catch (err) {
                console.error(err);
                alert('Error saving vacancy: ' + (err.message || 'Unknown error'));
            }
        };
    });
};

window.openEditVacancy = (id) => {
    const vacancy = cachedVacancies.find(v => v.id === id);
    if (vacancy) showVacancyModal(vacancy);
};

window.toggleVacancyStatus = async (id) => {
    try {
        await apiCall(`/vacancies/${id}/toggle-status`, 'PATCH');
        showToast('Status updated');
        renderVacancies(document.getElementById('vacancies-container'));
    } catch (err) {
        alert('Error updating status');
    }
};

window.deleteVacancy = async (id) => {
    if (confirm('Delete this vacancy details?')) {
        try {
            await apiCall(`/vacancies/${id}`, 'DELETE');
            showToast('Vacancy deleted');
            renderVacancies(document.getElementById('vacancies-container'));
        } catch (err) {
            alert('Error deleting vacancy');
        }
    }
};

// --- Applications Sub-module (Existing Logic moved here) ---
async function renderApplications(container) {
    try {
        const apps = await apiCall('/careers/admin', 'GET');
        container.innerHTML = `
            <div class="card">
                <table class="data-table">
                    <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>CV</th><th>Submitted</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${apps.map(a => `
                            <tr>
                                <td>${a.name}</td>
                                <td>${a.appliedRole}</td>
                                <td>${a.email}</td>
                                <td><a href="${a.cvFile}" target="_blank" style="color: var(--primary);">Download</a></td>
                                <td>${new Date(a.submittedAt || a.date).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn-sm btn-delete" onclick="deleteApplication('${a.id}')"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('') || '<tr><td colspan="6" style="text-align:center;">No applications found.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<p class="error">Error loading applications: ${e.message}</p>`;
    }
}

window.deleteApplication = async (id) => {
    if (confirm('Delete application?')) {
        try {
            await apiCall(`/careers/admin/${id}`, 'DELETE');
            showToast('Application deleted');
            // Refresh applications list
            renderApplications(document.getElementById('applications-container'));
        } catch (err) {
            alert('Error deleting application');
        }
    }
};

// --- Modal Helper ---
function showModal(contentHtml, callback) {
    const container = document.getElementById('modal-container');
    container.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <div></div>
                <button class="close-modal" onclick="closeModal()">&times;</button>
            </div>
            ${contentHtml}
        </div>
    `;
    container.style.display = 'flex';
    if (callback) callback();
}

window.closeModal = () => {
    document.getElementById('modal-container').style.display = 'none';
};

// Start
init();
