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
                const newReviews = reviews.filter(r => r.status === 'Hidden').length;
                const newQueries = queries.filter(q => !q.isRead).length;
                const totalProjects = projects.length;
                const totalApps = careers.length;

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
                           <div class="summary-icon"><i class="fas fa-building"></i></div>
                        </div>

                        <!-- Reviews Card -->
                        <div class="summary-card" onclick="loadModule('reviews')">
                           <div class="summary-content">
                                <h3>Client Reviews</h3>
                                <div class="count">${newReviews > 0 ? newReviews : reviews.length}</div>
                                <div class="sub-text">${newReviews > 0 ? 'New / Hidden Reviews' : 'Total Reviews'}</div>
                           </div>
                           <div class="summary-icon"><i class="fas fa-star"></i></div>
                           ${newReviews > 0 ? '<div class="notification-dot"></div>' : ''}
                        </div>

                        <!-- Queries Card -->
                        <div class="summary-card" onclick="loadModule('queries')">
                           <div class="summary-content">
                                <h3>Contact Queries</h3>
                                <div class="count">${newQueries}</div>
                                <div class="sub-text">New Queries</div>
                           </div>
                           <div class="summary-icon"><i class="fas fa-envelope"></i></div>
                           ${newQueries > 0 ? '<div class="notification-dot"></div>' : ''}
                        </div>

                        <!-- Careers Card -->
                        <div class="summary-card" onclick="loadModule('careers')">
                           <div class="summary-content">
                                <h3>Careers</h3>
                                <div class="count">${totalApps}</div>
                                <div class="sub-text">Received Applications</div>
                           </div>
                           <div class="summary-icon"><i class="fas fa-briefcase"></i></div>
                           ${totalApps > 0 ? '<div class="notification-dot"></div>' : ''}
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
            } catch (err) { }
        };
    });
};

window.deleteUser = async (id) => {
    if (confirm('Are you sure?')) {
        try {
            await apiCall(`/users/${id}`, 'DELETE');
            showToast('User deleted');
            loadModule('users');
        } catch (err) { }
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
                        ${reviews.map(r => `
                            <tr>
                                <td>${r.clientName}</td>
                                <td>${r.companyName}</td>
                                <td>${r.rating}/5</td>
                                <td><span style="color: ${r.status === 'Active' ? 'var(--success)' : 'var(--warning)'}">${r.status}</span></td>
                                <td>
                                    <button class="btn-sm btn-delete" onclick="deleteReview('${r.id}')"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (e) { container.innerHTML = 'Error loading reviews'; }
}

window.showReviewModal = () => {
    showModal(`
        <h3>Add Client Review</h3>
        <form id="add-review-form">
            <div class="form-group"><label>Client Name</label><input type="text" name="clientName" class="form-control" required></div>
            <div class="form-group"><label>Company</label><input type="text" name="companyName" class="form-control"></div>
            <div class="form-group"><label>Review Text</label><textarea name="reviewText" class="form-control" required></textarea></div>
            <div class="form-group"><label>Rating (1-5)</label><input type="number" name="rating" min="1" max="5" class="form-control" required></div>
            <div class="form-group"><label>Status</label>
                <select name="status" class="form-control">
                    <option value="Active">Active</option>
                    <option value="Hidden">Hidden</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary">Save Review</button>
        </form>
    `, async () => {
        document.getElementById('add-review-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            try {
                await apiCall('/reviews', 'POST', Object.fromEntries(formData));
                closeModal();
                showToast('Review saved');
                loadModule('reviews');
            } catch (err) { }
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
            <td>${p.image ? `<img src="${p.image}" style="height: 40px; border-radius: 4px;">` : 'No Img'}</td>
            <td>${p.title}</td>
            <td>${p.location}</td>
            <td><span style="color: ${p.status === 'Completed' ? 'var(--success)' : 'var(--warning)'}">${p.status}</span></td>
            <td>
                <button class="btn-sm btn-delete" onclick="deleteProject('${p.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

window.showProjectModal = () => {
    showModal(`
        <h3>Add Project</h3>
        <form id="add-project-form">
            <div class="form-group"><label>Title</label><input type="text" name="title" class="form-control" required></div>
            <div class="form-group"><label>Location</label><input type="text" name="location" class="form-control" required></div>
            <div class="form-group"><label>Area (SqFt)</label><input type="text" name="area" class="form-control"></div>
            <div class="form-group"><label>Status</label>
                <select name="status" class="form-control">
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                </select>
            </div>
            <div class="form-group"><label>Description</label><textarea name="description" class="form-control"></textarea></div>
            <div class="form-group"><label>Image</label><input type="file" name="image" class="form-control" accept="image/*"></div>
            <button type="submit" class="btn btn-primary">Save Project</button>
        </form>
    `, async () => {
        document.getElementById('add-project-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            try {
                await apiCall('/projects', 'POST', formData, true); // multipart
                closeModal();
                showToast('Project saved');
                loadModule('projects');
            } catch (err) { }
        };
    });
};

window.deleteProject = async (id) => {
    if (confirm('Delete project?')) {
        await apiCall(`/projects/${id}`, 'DELETE');
        loadModule('projects');
    }
};

// 5. Careers
async function loadCareers(container) {
    try {
        const apps = await apiCall('/careers/admin', 'GET');
        container.innerHTML = `
            <div class="card">
                <table class="data-table">
                    <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>CV</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${apps.map(a => `
                            <tr>
                                <td>${a.name}</td>
                                <td>${a.appliedRole}</td>
                                <td>${a.email}</td>
                                <td><a href="${a.cvFile}" target="_blank" style="color: var(--primary);">Download</a></td>
                                <td>
                                    <button class="btn-sm btn-delete" onclick="deleteApplication('${a.id}')"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (e) { container.innerHTML = 'Error loading applications'; }
}

window.deleteApplication = async (id) => {
    if (confirm('Delete application?')) {
        await apiCall(`/careers/admin/${id}`, 'DELETE');
        loadModule('careers');
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
