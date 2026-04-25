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
    const appContainer = document.getElementById('app-container');
    appContainer.style.display = 'flex'; // Reset to flex (desktop) or handled by CSS

    // Inject Overlay if not exists
    if (!document.querySelector('.sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.onclick = closeSidebar;
        document.body.appendChild(overlay);
    }

    document.getElementById('current-user-name').textContent = state.user.name;
    document.getElementById('current-user-role').textContent = state.user.role;

    document.getElementById('logout-btn').onclick = logout;

    // Add Burger Button to Header if missing
    const topBar = document.querySelector('.top-bar');
    if (!topBar.querySelector('.burger-btn')) {
        const burgerBtn = document.createElement('button');
        burgerBtn.className = 'burger-btn';
        burgerBtn.innerHTML = '<i class="fas fa-bars"></i>';
        burgerBtn.onclick = toggleSidebar;
        topBar.insertBefore(burgerBtn, topBar.firstChild);
    }

    renderSidebar();
    loadModule('dashboard'); // Default view
}

async function syncToCloud() {
    showModal(`
        <div style="text-align: center; padding: 1rem;">
            <div style="color: var(--primary); font-size: 3rem; margin-bottom: 1rem;">
                <i class="fas fa-cloud-upload-alt fa-beat"></i>
            </div>
            <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: #1f2937;">Cloud Sync in Progress</h3>
            <p id="cloud-sync-status" style="color: #4b5563; line-height: 1.6; margin-bottom: 2rem;">
                Preparing your data and assets for cloud backup...
            </p>
            
            <div style="height: 10px; width: 100%; background: #e5e7eb; border-radius: 5px; overflow: hidden; margin-bottom: 2rem;">
                <div id="cloud-sync-bar" style="height: 100%; width: 30%; background: var(--primary); transition: width 0.5s; animation: pulse 2s infinite;"></div>
            </div>

            <button id="cloud-sync-close" class="btn btn-secondary" disabled style="opacity: 0.5; width: 100%;">
                Please wait...
            </button>
        </div>
    `, async () => {
        const statusText = document.getElementById('cloud-sync-status');
        const progressBar = document.getElementById('cloud-sync-bar');
        const closeBtn = document.getElementById('cloud-sync-close');

        try {
            // Step 1: Initializing
            setTimeout(() => { 
                if (progressBar) {
                    progressBar.style.width = '60%';
                    statusText.textContent = 'Uploading backup to Google Drive...';
                }
            }, 2000);

            const response = await fetch('/api/admin/backup/cloud', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${state.token}`
                }
            });
            const result = await response.json();

            if (response.ok && result.success) {
                progressBar.style.width = '100%';
                progressBar.style.background = '#10b981';
                progressBar.style.animation = 'none';
                statusText.innerHTML = `<span style="color: #10b981; font-weight: 600;">Success!</span><br>Backup uploaded to Google Drive successfully.`;
                
                const modalContent = document.querySelector('.modal-content');
                modalContent.innerHTML = `
                    <div style="text-align: center; padding: 1rem;">
                        <div style="color: #10b981; font-size: 4rem; margin-bottom: 1.5rem;">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <h3 style="font-size: 1.8rem; margin-bottom: 1rem; color: #111827;">Sync Successful</h3>
                        <p style="color: #4b5563; margin-bottom: 2rem;">Your backup is now safely stored on Google Drive.</p>
                        
                        <div style="text-align: left; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 1rem; margin-bottom: 2rem; font-family: monospace; font-size: 0.85rem; color: #15803d;">
                            File: ${result.fileName}
                        </div>

                        <button class="btn btn-primary" onclick="closeModal()" style="width: 100%;">
                            Close
                        </button>
                    </div>
                `;
            } else {
                throw new Error(result.message || 'Cloud sync failed');
            }
        } catch (err) {
            console.error('Cloud Sync Error:', err);
            const modalContent = document.querySelector('.modal-content');
            modalContent.innerHTML = `
                <div style="text-align: center; padding: 1rem;">
                    <div style="color: #ef4444; font-size: 4rem; margin-bottom: 1.5rem;">
                        <i class="fas fa-times-circle"></i>
                    </div>
                    <h3 style="font-size: 1.8rem; margin-bottom: 1rem; color: #111827;">Sync Failed</h3>
                    <p style="color: #4b5563; margin-bottom: 2rem;">An error occurred while uploading to Google Drive.</p>
                    
                    <div style="text-align: left; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;">
                        <p style="color: #991b1b; font-family: monospace; font-size: 0.9rem;">${err.message}</p>
                    </div>

                    <button class="btn btn-secondary" onclick="closeModal()" style="width: 100%;">
                        Close
                    </button>
                </div>
            `;
        }
    });
}

async function restoreBackup() {
    showModal(`
        <div style="padding: 1rem;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <div style="color: #f59e0b; font-size: 3rem; margin-bottom: 1rem;">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 style="font-size: 1.8rem; margin-bottom: 0.5rem; color: #111827;">Restore Backup</h3>
                <p style="color: #4b5563;">Warning: Restoring will overwrite all current website data.</p>
            </div>

            <div id="restore-selection-view">
                <div class="tabs" style="display: flex; gap: 1rem; margin-bottom: 1.5rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem;">
                <button class="tab-btn active" data-tab="upload" style="background: none; border: none; padding: 0.5rem 1rem; cursor: pointer; font-weight: 600; color: var(--primary); border-bottom: 2px solid var(--primary);">
                    <i class="fas fa-upload" style="margin-right: 8px;"></i> Upload ZIP
                </button>
                <button class="tab-btn" data-tab="cloud" style="background: none; border: none; padding: 0.5rem 1rem; cursor: pointer; font-weight: 600; color: #6b7280;">
                    <i class="fab fa-google-drive" style="margin-right: 8px;"></i> From Cloud
                </button>
            </div>

            <div id="tab-upload" class="tab-content">
                <div id="restore-drop-zone" style="border: 2px dashed #d1d5db; border-radius: 12px; padding: 3rem 2rem; text-align: center; cursor: pointer; transition: all 0.3s ease; background: #f9fafb; margin-bottom: 1.5rem;">
                    <input type="file" id="restore-file-input" accept=".zip" style="display: none;">
                    <div id="restore-empty-state">
                        <i class="fas fa-file-archive" style="font-size: 3rem; color: #9ca3af; margin-bottom: 1rem;"></i>
                        <p style="color: #4b5563; font-weight: 500;">Select or Drop Backup ZIP file</p>
                        <p style="color: #9ca3af; font-size: 0.875rem; margin-top: 0.5rem;">Only .zip files generated by this system are supported</p>
                    </div>
                    <div id="restore-selected-state" style="display: none;">
                        <i class="fas fa-file-zip" style="font-size: 3rem; color: var(--primary); margin-bottom: 1rem;"></i>
                        <p id="restore-filename" style="color: #111827; font-weight: 600;"></p>
                        <button id="change-file-btn" class="btn btn-secondary" style="margin-top: 1rem; font-size: 0.8rem;">Change File</button>
                    </div>
                </div>

                <button id="start-restore-btn" class="btn btn-primary" disabled style="width: 100%; padding: 12px; font-weight: 600; opacity: 0.6;">
                    Confirm & Start Restore
                </button>
            </div>

            <div id="tab-cloud" class="tab-content" style="display: none;">
                <div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; background: #f3f4f6; padding: 0.75rem; border-radius: 8px;">
                    <label style="font-size: 0.85rem; font-weight: 600; color: #4b5563;">Filter by Date:</label>
                    <input type="date" id="cloud-backup-date" class="form-control" style="flex: 1; height: 32px; padding: 0 8px; font-size: 0.85rem;">
                    <button id="cloud-backup-filter-btn" class="btn btn-primary" style="padding: 4px 12px; height: 32px; font-size: 0.8rem; margin: 0;">
                        <i class="fas fa-search"></i>
                    </button>
                    <button id="cloud-backup-clear-btn" class="btn btn-secondary" style="padding: 4px 12px; height: 32px; font-size: 0.8rem; margin: 0;" title="Clear Filter">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="cloud-backups-list" style="max-height: 250px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.5rem;">
                    <div style="text-align: center; padding: 2rem; color: #6b7280;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <p>Fetching backups from Google Drive...</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Global Status Bar -->
            <div id="restore-status-area" style="display: none; margin: 2rem 0; padding: 2rem; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; animation: slideUp 0.4s ease;">
                <div id="restore-progress-container" style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <p id="restore-progress-text" style="color: #111827; font-weight: 700; font-size: 1.1rem;">Initializing...</p>
                        <span id="restore-progress-percent" style="color: var(--primary); font-weight: 800; font-size: 1.2rem; background: #e0e7ff; padding: 4px 12px; border-radius: 20px;">0%</span>
                    </div>
                    <div style="height: 16px; width: 100%; background: #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
                        <div id="restore-progress-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, var(--primary), #6366f1); transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                    </div>
                    <p style="color: #6b7280; font-size: 0.85rem; margin-top: 1rem; text-align: center;">
                        <i class="fas fa-info-circle" style="margin-right: 5px;"></i> Please do not close this window or refresh the page.
                    </p>
                </div>
                <div id="restore-error-box" style="display: none; background: #fef2f2; border: 1px solid #fee2e2; border-radius: 10px; padding: 1.5rem; color: #991b1b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <div style="display: flex; gap: 15px;">
                        <i class="fas fa-times-circle" style="font-size: 2rem; color: #ef4444;"></i>
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 5px 0; font-weight: 700;">Restoration Failed</h4>
                            <span id="restore-error-text" style="font-size: 0.95rem; line-height: 1.5;"></span>
                            <button class="btn btn-secondary" onclick="restoreBackup()" style="margin-top: 1rem; width: auto; padding: 6px 15px; font-size: 0.85rem;">Try Different Backup</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `, async () => {
        const fileInput = document.getElementById('restore-file-input');
        const dropZone = document.getElementById('restore-drop-zone');
        const emptyState = document.getElementById('restore-empty-state');
        const selectedState = document.getElementById('restore-selected-state');
        const filenameText = document.getElementById('restore-filename');
        const changeBtn = document.getElementById('change-file-btn');
        const startBtn = document.getElementById('start-restore-btn');
        const progressContainer = document.getElementById('restore-progress-container');
        const progressBar = document.getElementById('restore-progress-bar');
        const progressText = document.getElementById('restore-progress-text');
        const progressPercent = document.getElementById('restore-progress-percent');
        const selectionView = document.getElementById('restore-selection-view');
        const statusArea = document.getElementById('restore-status-area');
        const errorBox = document.getElementById('restore-error-box');
        const errorText = document.getElementById('restore-error-text');
        
        // Tab switching logic
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(btn => {
            btn.onclick = () => {
                tabs.forEach(t => {
                    t.classList.remove('active');
                    t.style.color = '#6b7280';
                    t.style.borderBottom = 'none';
                });
                btn.classList.add('active');
                btn.style.color = 'var(--primary)';
                btn.style.borderBottom = '2px solid var(--primary)';
                
                document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
                const target = document.getElementById(`tab-${btn.dataset.tab}`);
                target.style.display = 'block';
                
                if (btn.dataset.tab === 'cloud') {
                    fetchCloudBackups();
                }
            };
        });

        async function fetchCloudBackups(date = '') {
            const listContainer = document.getElementById('cloud-backups-list');
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #6b7280;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Fetching ${date ? 'backups for ' + date : 'latest backups'}...</p>
                </div>
            `;
            try {
                const url = date ? `/api/admin/backup/cloud/list?date=${date}` : '/api/admin/backup/cloud/list';
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${state.token}` }
                });
                const result = await response.json();
                
                if (result.success && result.backups.length > 0) {
                    listContainer.innerHTML = result.backups.map(file => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #f3f4f6; transition: background 0.2s;" onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background='transparent'">
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: #111827; font-size: 0.95rem;">${file.name}</div>
                                <div style="font-size: 0.8rem; color: #6b7280; margin-top: 4px;">
                                    <i class="far fa-calendar-alt" style="margin-right: 4px;"></i> ${new Date(file.createdTime).toLocaleString()}
                                    <span style="margin-left: 12px;"><i class="fas fa-hdd" style="margin-right: 4px;"></i> ${(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                                </div>
                            </div>
                            <button class="btn btn-primary restore-cloud-btn" data-id="${file.id}" data-name="${file.name}" style="padding: 6px 12px; font-size: 0.8rem; margin: 0;">
                                Restore
                            </button>
                        </div>
                    `).join('');
                    
                    document.querySelectorAll('.restore-cloud-btn').forEach(btn => {
                        btn.onclick = () => confirmCloudRestore(btn.dataset.id, btn.dataset.name);
                    });
                } else {
                    listContainer.innerHTML = `<div style="text-align: center; padding: 3rem; color: #6b7280;">
                        <i class="fab fa-google-drive" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                        <p>${date ? 'No backups found for ' + date : 'No backups found on Google Drive'}</p>
                    </div>`;
                }
            } catch (err) {
                listContainer.innerHTML = `<div style="text-align: center; padding: 2rem; color: #ef4444;">Failed to load cloud backups</div>`;
            }
        }

        // Initialize Cloud Tab UI Handlers
        const dateInput = document.getElementById('cloud-backup-date');
        const filterBtn = document.getElementById('cloud-backup-filter-btn');
        const clearBtn = document.getElementById('cloud-backup-clear-btn');

        if (filterBtn) {
            filterBtn.onclick = () => {
                if (dateInput.value) {
                    fetchCloudBackups(dateInput.value);
                } else {
                    showToast('Please select a date', 'warning');
                }
            };
        }

        if (clearBtn) {
            clearBtn.onclick = () => {
                dateInput.value = '';
                fetchCloudBackups();
            };
        }

        // Status elements are declared at the top of the modal callback

        async function confirmCloudRestore(fileId, fileName) {
            window.customConfirm(`Are you sure you want to restore "${fileName}" from Cloud? All current website data will be overwritten.`, async (confirmed) => {
                if (!confirmed) return;
                
                // Hide selection and show status
                selectionView.style.display = 'none';
                statusArea.style.display = 'block';
                errorBox.style.display = 'none';
                progressBar.style.width = '20%';
                progressPercent.textContent = '20%';
                progressText.textContent = `Downloading ${fileName}...`;

                try {
                    const response = await fetch(`/api/admin/backup/cloud/restore/${fileId}`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${state.token}` }
                    });
                    const result = await response.json();
                    
                    if (result.success) {
                        progressBar.style.width = '80%';
                        progressPercent.textContent = '80%';
                        progressText.textContent = 'Extracting and applying data...';
                        setTimeout(() => handleRestoreResponse(result), 1000);
                    } else {
                        throw new Error(result.message || result.error || 'Restore failed');
                    }
                } catch (err) {
                    console.error('Cloud Restore Error:', err);
                    progressBar.style.width = '0%';
                    progressPercent.textContent = 'Error';
                    errorBox.style.display = 'block';
                    errorText.textContent = err.message;
                    progressText.textContent = 'Restoration Failed';
                }
            });
        }

        function handleRestoreResponse(result) {
            if (result.success) {
                progressBar.style.width = '100%';
                progressPercent.textContent = '100%';
                progressText.textContent = 'Restoration Complete!';
                
                const modalContent = document.querySelector('.modal-content');
                modalContent.innerHTML = `
                    <div style="text-align: center; padding: 1rem;">
                        <div style="color: #10b981; font-size: 4rem; margin-bottom: 1.5rem;">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <h3 style="font-size: 1.8rem; margin-bottom: 1rem; color: #111827;">Restoration Successful</h3>
                        <p style="color: #4b5563; margin-bottom: 2rem;">The backup has been fully applied to your system.</p>
                        
                        <div style="text-align: left; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;">
                            <h4 style="font-size: 1rem; color: #166534; margin-bottom: 1rem; border-bottom: 1px solid #bbf7d0; padding-bottom: 0.5rem;">Restored Components:</h4>
                            <ul style="list-style: none; padding: 0; margin: 0; color: #15803d;">
                                ${(result.summary || []).map(item => `<li style="margin-bottom: 8px;"><i class="fas fa-check" style="margin-right: 10px;"></i> ${item}</li>`).join('')}
                            </ul>
                        </div>

                        <button class="btn btn-primary" onclick="location.reload()" style="width: 100%; padding: 12px; font-weight: 600;">
                            Finish & Refresh Dashboard
                        </button>
                    </div>
                `;
            } else {
                throw new Error(result.message || result.error || 'Restore failed');
            }
        }

        function handleRestoreError(err) {
            console.error('Restore Error:', err);
            progressBar.style.width = '0%';
            progressPercent.textContent = 'Error';
            errorBox.style.display = 'block';
            errorText.textContent = err.message;
            progressText.textContent = 'Restoration Failed';
            
            // Re-enable buttons if failed
            startBtn.disabled = false;
            startBtn.style.opacity = '1';
            startBtn.textContent = 'Confirm & Start Restore';
        }

        dropZone.onclick = () => fileInput.click();
        changeBtn.onclick = (e) => {
            e.stopPropagation();
            fileInput.click();
        };

        fileInput.onchange = () => {
            if (fileInput.files.length > 0) {
                emptyState.style.display = 'none';
                selectedState.style.display = 'block';
                filenameText.textContent = fileInput.files[0].name;
                startBtn.disabled = false;
                startBtn.style.opacity = '1';
            }
        };

        startBtn.onclick = () => {
            if (!fileInput.files.length) return;
            
            window.customConfirm(`Are you sure you want to restore from "${fileInput.files[0].name}"? This will overwrite all current website data.`, async (confirmed) => {
                if (!confirmed) return;

                // Hide selection and show status
                selectionView.style.display = 'none';
                statusArea.style.display = 'block';
                errorBox.style.display = 'none';
                
                const formData = new FormData();
                formData.append('backup', fileInput.files[0]);

                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/api/admin/backup/restore', true);
                xhr.setRequestHeader('Authorization', `Bearer ${state.token}`);

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 70); // 70% for upload
                        progressBar.style.width = percent + '%';
                        progressPercent.textContent = percent + '%';
                        progressText.textContent = `Uploading backup: ${percent}%`;
                    }
                };

                xhr.onload = () => {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        if (xhr.status === 200 && result.success) {
                            progressBar.style.width = '90%';
                            progressPercent.textContent = '90%';
                            progressText.textContent = 'Applying data...';
                            setTimeout(() => handleRestoreResponse(result), 1000);
                        } else {
                            throw new Error(result.message || result.error || 'Restore failed');
                        }
                    } catch (err) {
                        handleRestoreError(err);
                    }
                };
                
                xhr.onerror = () => handleRestoreError(new Error('Network error during upload'));
                xhr.send(formData);
            });
        };
    });
}

async function downloadBackup() {
    showToast('Preparing backup zip...', 'info');
    try {
        const a = document.createElement('a');
        a.href = '/api/admin/backup';
        a.download = `steelflex-backup-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('Backup download started');
    } catch (err) {
        console.error('Backup download error:', err);
        showToast('Failed to start backup download', 'error');
    }
}

// Sidebar Toggles
window.toggleSidebar = () => {
    document.querySelector('.sidebar').classList.toggle('active');
    document.querySelector('.sidebar-overlay').classList.toggle('active');
    // Lock body scroll
    document.body.style.overflow = document.body.style.overflow === 'hidden' ? '' : 'hidden';
};

window.closeSidebar = () => {
    document.querySelector('.sidebar').classList.remove('active');
    document.querySelector('.sidebar-overlay').classList.remove('active');
    document.body.style.overflow = '';
};


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
        { id: 'backup', icon: 'download', label: 'Download Backup', roles: ['SUPER_ADMIN'], action: downloadBackup },
        { id: 'cloud', icon: 'cloud-upload-alt', label: 'Sync to Cloud', roles: ['SUPER_ADMIN'], action: syncToCloud },
        { id: 'restore', icon: 'upload', label: 'Restore Backup', roles: ['SUPER_ADMIN'], action: restoreBackup },
    ];

    items.forEach(item => {
        if (item.roles.includes(state.user.role)) {
            const a = document.createElement('a');
            a.className = 'nav-item';
            a.href = '#';
            a.innerHTML = `<i class="fas fa-${item.icon}"></i> ${item.label}`;
            a.onclick = (e) => {
                e.preventDefault();
                if (item.action) {
                    item.action();
                } else {
                    loadModule(item.id);
                    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                    a.classList.add('active');
                }

                // Auto close on mobile
                if (window.innerWidth < 1024) {
                    closeSidebar();
                }
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
                    DataManager.getAll('users'),
                    DataManager.getAll('projects'),
                    DataManager.getAll('reviews'),
                    DataManager.getAll('contact'),
                    DataManager.getAll('careers')
                ]);

                // Calculate counts with proper normalization
                const newReviews = reviews.filter(r => (r.status || 'Pending').toLowerCase() === 'pending').length;
                const newQueries = queries.filter(q => (q.status || 'New').toLowerCase() !== 'read').length;
                const totalProjects = projects.length;
                const totalApps = careers.length;
                const newApps = careers.filter(c => (c.status || 'New').toLowerCase() === 'new').length;

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
                                            <p>Applied for: <strong>${a.appliedRole || a.position || 'N/A'}</strong></p>
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
                                    <button class="btn-sm btn-secondary" onclick="showEditUserModal('${u.id}')" title="Edit User"><i class="fas fa-edit"></i></button>
                                    <button class="btn-sm btn-delete js-delete-btn" data-id="${u.id}" data-type="users" title="Delete User"><i class="fas fa-trash"></i></button>
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

window.showEditUserModal = async (id) => {
    try {
        const users = await DataManager.getAll('users');
        const user = users.find(u => u.id == id);
        if (!user) throw new Error("User not found");

        showModal(`
            <div style="padding: 1rem;">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <div style="color: var(--primary); font-size: 3rem; margin-bottom: 1rem;">
                        <i class="fas fa-user-edit"></i>
                    </div>
                    <h3 style="font-size: 1.8rem; margin-bottom: 0.5rem; color: #111827;">Edit Admin User</h3>
                    <p style="color: #4b5563;">Update credentials for <strong>${user.name}</strong></p>
                </div>

                <form id="edit-user-form" class="admin-form">
                    <div class="form-group" style="margin-bottom: 1.5rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Full Name</label>
                        <input type="text" name="name" class="form-control" value="${user.name}" required style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 1.5rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Email Address</label>
                        <input type="email" name="email" class="form-control" value="${user.email}" required style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 1.5rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">User ID (Login ID)</label>
                        <input type="text" name="userId" class="form-control" value="${user.userId}" required style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px;">
                    </div>
                    <div class="form-group" style="margin-bottom: 2rem;">
                        <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">New Password (Optional)</label>
                        <div style="position: relative;">
                            <input type="password" name="password" id="edit-user-password" class="form-control" placeholder="Leave blank to keep current" style="width: 100%; padding: 10px; padding-right: 40px; border: 1px solid #d1d5db; border-radius: 8px;">
                            <button type="button" onclick="togglePasswordVisibility('edit-user-password', this)" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #6b7280;">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        <p style="font-size: 0.75rem; color: #6b7280; margin-top: 5px;">Only fill this if you want to change the password.</p>
                    </div>

                    <div style="display: flex; gap: 1rem;">
                        <button type="button" class="btn btn-secondary" onclick="closeModal()" style="flex: 1; padding: 12px;">Cancel</button>
                        <button type="submit" class="btn btn-primary" style="flex: 1; padding: 12px; font-weight: 600;">Save Changes</button>
                    </div>
                </form>
            </div>
        `, () => {
            const form = document.getElementById('edit-user-form');
            if (!form) return;
            
            form.onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                
                if (!data.password) {
                    delete data.password;
                }

                try {
                    await DataManager.update('users', id, data);
                    closeModal();
                    showToast('User updated successfully');
                    loadModule('users');
                } catch (err) {
                    alert('Error updating user: ' + err.message);
                }
            };
        });
    } catch (err) {
        showToast('Error loading user data', 'error');
    }
};

window.showUserModal = () => {
    showModal(`
        <div style="padding: 1rem;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <div style="color: var(--primary); font-size: 3rem; margin-bottom: 1rem;">
                    <i class="fas fa-user-plus"></i>
                </div>
                <h3 style="font-size: 1.8rem; margin-bottom: 0.5rem; color: #111827;">Add New Admin</h3>
                <p style="color: #4b5563;">Create a new administrator account</p>
            </div>

            <form id="add-user-form" class="admin-form">
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Full Name</label>
                    <input type="text" name="name" class="form-control" placeholder="e.g. John Doe" required style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px;">
                </div>
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Email Address</label>
                    <input type="email" name="email" class="form-control" placeholder="e.g. john@example.com" required style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px;">
                </div>
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">User ID (Login ID)</label>
                    <input type="text" name="userId" class="form-control" placeholder="e.g. admin_john" required style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px;">
                </div>
                <div class="form-group" style="margin-bottom: 2rem;">
                    <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: #374151;">Password</label>
                    <div style="position: relative;">
                        <input type="password" name="password" id="add-user-password" class="form-control" required style="width: 100%; padding: 10px; padding-right: 40px; border: 1px solid #d1d5db; border-radius: 8px;">
                        <button type="button" onclick="togglePasswordVisibility('add-user-password', this)" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #6b7280;">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>

                <div style="display: flex; gap: 1rem;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()" style="flex: 1; padding: 12px;">Cancel</button>
                    <button type="submit" class="btn btn-primary" style="flex: 1; padding: 12px; font-weight: 600;">Create User</button>
                </div>
            </form>
        </div>
        `, () => {
            const form = document.getElementById('add-user-form');
            if (!form) return;

            form.onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                data.role = 'ADMIN'; // Default
                try {
                    await DataManager.add('users', data);
                    closeModal();
                    showToast('User created successfully');
                    loadModule('users');
                } catch (err) {
                    alert('Error creating user: ' + err.message);
                }
            };
        });
};

// deleteUser removed, using global delegation

// 2. Reviews
async function loadReviews(container) {
    try {
        const allReviews = await DataManager.getAll('reviews');

        // Data Normalization (Fix Existing Stored Data)
        window.cachedReviews = allReviews.map(r => {
            if (r.company && !r.companyName) r.companyName = r.company;
            if (r.photo && !r.reviewerPhoto) r.reviewerPhoto = r.photo;
            if (r.logo && !r.companyLogo) r.companyLogo = r.logo;
            if (r.reviewImages && (!r.projectImages || r.projectImages.length === 0)) r.projectImages = r.reviewImages;
            return r;
        });

        window.currentReviewFilter = window.currentReviewFilter || 'all';

        window.renderReviewsTableRows = (filter) => {
            let filtered = window.cachedReviews;
            if (filter !== 'all') {
                filtered = filtered.filter(r => (r.status || 'pending').toLowerCase() === filter);
            }
            if (filtered.length === 0) return '<tr><td colspan="5" style="text-align: center;">No reviews found</td></tr>';

            return filtered.map(r => {
                let statusColor = 'var(--warning)'; // Pending
                if (r.status === 'Approved' || r.status === 'Accepted' || r.status === 'active' || r.status === 'Active') statusColor = 'var(--success)';
                if (r.status === 'Rejected' || r.status === 'rejected') statusColor = 'var(--danger)';

                let displayStatus = r.status;
                if (displayStatus === 'Active' || displayStatus === 'active') displayStatus = 'Accepted';

                return `
                    <tr>
                        <td>${r.clientName}</td>
                        <td>${r.companyName || '-'}</td>
                        <td>${r.rating}/5</td>
                        <td><span style="color: ${statusColor}; font-weight: 600; text-transform: capitalize;">${displayStatus}</span></td>
                        <td>
                            <button class="btn-sm btn-edit" title="View Details" onclick="viewReviewDetails('${r.id}')"><i class="fas fa-eye"></i></button>
                            <button class="btn-sm btn-delete js-delete-btn" title="Delete" data-id="${r.id}" data-type="reviews"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            }).join('');
        };

        window.handleReviewFilterChange = (dropdown) => {
            window.currentReviewFilter = dropdown.value;
            const tbody = document.getElementById('admin-reviews-tbody');
            if (tbody) tbody.innerHTML = window.renderReviewsTableRows(dropdown.value);
        };

        container.innerHTML = `
            <div style="margin-bottom: 1rem; display: flex; align-items: center; gap: 10px;">
                <label style="font-weight: 600; color: #4b5563;">Filter Status:</label>
                <select id="reviewStatusFilter" class="form-control" style="width: 200px;" onchange="handleReviewFilterChange(this)">
                    <option value="all" ${window.currentReviewFilter === 'all' ? 'selected' : ''}>All Reviews</option>
                    <option value="pending" ${window.currentReviewFilter === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="accepted" ${window.currentReviewFilter === 'accepted' ? 'selected' : ''}>Accepted</option>
                    <option value="rejected" ${window.currentReviewFilter === 'rejected' ? 'selected' : ''}>Rejected</option>
                </select>
            </div>
            <div class="card">
                <table class="data-table">
                    <thead><tr><th>Client</th><th>Company</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody id="admin-reviews-tbody">
                        ${window.renderReviewsTableRows(window.currentReviewFilter)}
                    </tbody>
                </table>
            </div>
        `;
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
    window.customConfirm(`Are you sure you want to mark this review as ${status}?`, async (confirmed) => {
        if (!confirmed) return;
        try {
            await DataManager.update('reviews', id, { status });
            closeModal();
            showToast(`Review ${status}`);
            loadModule('reviews');
        } catch (err) {
            alert('Error updating status');
        }
    });
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
let cachedQueries = [];

async function loadQueries(container) {
    try {
        const allQueries = await DataManager.getAll('contact');
        
        // Normalization
        cachedQueries = allQueries.map(q => ({
            ...q,
            date: q.createdAt || q.date || new Date().toISOString(),
            isRead: q.status === 'Read' || q.isRead === true
        })).sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                 <div class="filter-bar" style="margin-bottom: 0;">
                    <button class="filter-btn active" onclick="filterQueries('ALL', this)">All</button>
                    <button class="filter-btn" onclick="filterQueries('Unread', this)">Unread</button>
                    <button class="filter-btn" onclick="filterQueries('Read', this)">Read</button>
                </div>
            </div>

            <div class="card">
                <table class="data-table">
                    <thead><tr><th>Status</th><th>Name</th><th>Email</th><th>Date</th><th>Message</th><th>Actions</th></tr></thead>
                    <tbody id="queries-table-body">
                        <!-- Dynamic Content -->
                    </tbody>
                </table>
                 <div id="no-queries-msg" style="display:none; text-align: center; padding: 2rem; color: var(--text-gray);">
                    No queries found.
                </div>
            </div>
        `;
        renderQueryTable(cachedQueries);
    } catch (e) { container.innerHTML = 'Error loading queries'; }
}

window.filterQueries = (filter, btn) => {
    if (btn) {
        // Scope to filter bar in queries section if needed, though globally unique works for now
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    if (filter === 'ALL') {
        renderQueryTable(cachedQueries);
    } else if (filter === 'Unread') {
        renderQueryTable(cachedQueries.filter(q => !q.isRead));
    } else if (filter === 'Read') {
        renderQueryTable(cachedQueries.filter(q => q.isRead));
    }
};

function renderQueryTable(queries) {
    const tbody = document.getElementById('queries-table-body');
    const noMsg = document.getElementById('no-queries-msg');

    if (queries.length === 0) {
        tbody.innerHTML = '';
        noMsg.style.display = 'block';
        return;
    }

    noMsg.style.display = 'none';
    tbody.innerHTML = queries.map(q => `
        <tr style="${!q.isRead ? 'font-weight: 600; background-color: #f0f9ff;' : ''}">
            <td>${q.isRead ? '<span style="color:var(--secondary);"><i class="fas fa-check-double"></i> Read</span>' : '<span style="color:var(--primary);"><i class="fas fa-circle" style="font-size: 8px;"></i> New</span>'}</td>
            <td>${q.name}</td>
            <td>${q.email}</td>
            <td>${new Date(q.date).toLocaleDateString()}</td>
            <td>${q.message.substring(0, 50)}...</td>
            <td>
                <button class="btn-sm btn-edit" onclick="viewQuery('${q.id}')"><i class="fas fa-eye"></i></button>
                <button class="btn-sm btn-delete" onclick="deleteQuery('${q.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

window.viewQuery = async (id) => {
    const query = cachedQueries.find(q => q.id === id);
    if (!query) return;

    // Mark as read if not already
    if (!query.isRead) {
        try {
            await DataManager.update('contact', id, { status: 'Read' });
            query.isRead = true;
            query.status = 'Read';
            renderQueryTable(cachedQueries); 
        } catch (e) { console.error('Failed to mark read', e); }
    }

    showModal(`
        <h3>Contact Query</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; background: #f8fafc; padding: 1rem; border-radius: 8px;">
            <div><strong>Name:</strong> ${query.name}</div>
            <div><strong>Email:</strong> ${query.email}</div>
            <div><strong>Phone:</strong> ${query.phone || '-'}</div>
            <div><strong>Date:</strong> ${new Date(query.date).toLocaleString()}</div>
            <div style="grid-column: span 2;"><strong>Project Type:</strong> ${query.projectType || '-'}</div>
        </div>
        <div class="form-group">
            <label>Message</label>
            <div style="padding: 1rem; border: 1px solid #eee; border-radius: 6px; background: white; min-height: 100px;">
                ${query.message}
            </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 1rem;">
             <button class="btn btn-danger" onclick="deleteQuery('${query.id}', true)">Delete</button>
             <button class="btn btn-secondary" onclick="closeModal()">Close</button>
        </div>
    `);
};

window.deleteQuery = async (id, fromModal = false) => {
    window.customConfirm('Are you sure you want to delete this query?', async (confirmed) => {
        if (!confirmed) return;
        try {
            await DataManager.delete('contact', id);
            if (fromModal) closeModal();
            showToast('Query deleted');
            loadModule('queries');
        } catch (err) {
            alert('Error deleting query');
        }
    });
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
            <div class="form-group"><label>Category</label><input type="text" name="category" class="form-control" placeholder="e.g. Industrial Warehouse" value="${project ? project.category || '' : ''}" required></div>
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

            const rawFormData = new FormData(e.target);
            const projectData = Object.fromEntries(rawFormData.entries());
            
            showToast('Uploading and optimizing images...', 'info');

            try {
                // 1. Upload new files sequentially to the SEO endpoint
                const uploadedUrls = [];
                for (const file of newFiles) {
                    const uploadFormData = new FormData();
                    uploadFormData.append('image', file);
                    uploadFormData.append('project', projectData.title);
                    uploadFormData.append('location', projectData.location);
                    uploadFormData.append('category', projectData.category);

                    // Use fetch directly for /upload since it's not under /api/data
                    const response = await fetch('/upload', {
                        method: 'POST',
                        body: uploadFormData
                    });
                    
                    if (!response.ok) throw new Error('Failed to upload image');
                    const uploadResult = await response.json();
                    uploadedUrls.push(uploadResult.optimizedUrl);
                }

                // 2. Finalize project object
                const finalProject = {
                    ...projectData,
                    id: project ? project.id : 'proj_' + Date.now(),
                    images: [...existingImages, ...uploadedUrls],
                    updatedAt: new Date().toISOString()
                };

                // 3. Save to JSON DB
                const url = project ? `/data/projects/${project.id}` : '/data/projects';
                const method = project ? 'PUT' : 'POST';

                await apiCall(url, method, finalProject, false); // JSON mode
                
                closeModal();
                showToast(project ? 'Project updated' : 'Project saved');
                loadModule('projects');
            } catch (err) {
                console.error(err);
                showToast('Error processing request: ' + err.message, 'error');
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
        cachedVacancies = await DataManager.getAll('vacancies');
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
            <td>${new Date(v.createdAt || v.date || Date.now()).toLocaleDateString()}</td>
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
        const apps = await DataManager.getAll('careers');
        container.innerHTML = `
            <div class="card">
                <table class="data-table">
                    <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>CV</th><th>Submitted</th><th style="width: 120px;">Status</th><th style="width: 100px;">Actions</th></tr></thead>
                    <tbody>
                        ${apps.map(a => {
                            const status = a.status || 'New';
                            let dotColor = '#3b82f6'; // Blue for New
                            if (status === 'Reviewed') dotColor = '#22c55e'; // Green
                            if (status === 'Interview') dotColor = '#f59e0b'; // Orange
                            if (status === 'Rejected') dotColor = '#ef4444'; // Red

                            return `
                                <tr>
                                    <td><strong>${a.name}</strong></td>
                                    <td>${a.position || a.appliedRole || 'N/A'}</td>
                                    <td>${a.email}</td>
                                    <td>
                                        ${a.cvData ? `<a href="${a.cvData}" download="${a.cvName || 'Resume.pdf'}" class="btn-sm btn-secondary" style="font-size: 0.75rem; padding: 2px 6px; display:inline-block; text-decoration:none;">Download</a>` : '-'}
                                    </td>
                                    <td>${new Date(a.submittedAt || a.createdAt || a.date || Date.now()).toLocaleDateString()}</td>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <span style="width: 8px; height: 8px; background: ${dotColor}; border-radius: 50%; display: inline-block;"></span>
                                            <span style="font-size: 0.85rem; font-weight: 500;">${status}</span>
                                        </div>
                                    </td>
                                    <td style="display: flex; gap: 5px;">
                                        <button class="btn-sm btn-edit" onclick="viewApplicationDetails('${a.id}')" title="View Details" style="margin: 0;"><i class="fas fa-eye"></i></button>
                                        <button class="btn-sm btn-delete" onclick="deleteApplication('${a.id}')" title="Delete" style="margin: 0;"><i class="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            `;
                        }).join('') || '<tr><td colspan="7" style="text-align:center;">No applications found.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<p class="error">Error loading applications: ${e.message}</p>`;
    }
}

window.viewApplicationDetails = async (id) => {
    try {
        const app = await DataManager.getById('careers', id);
        if (!app) return;

        showModal(`
            <div class="application-view-modal">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; border-bottom: 1px solid #eee; padding-bottom: 1rem;">
                    <div>
                        <h2 style="margin: 0; color: var(--primary);">${app.name}</h2>
                        <p style="margin: 5px 0 0; color: #666;">Applied for: <strong>${app.position || app.appliedRole || 'N/A'}</strong></p>
                    </div>
                    <span class="badge badge-info is-light">${app.status || 'New'}</span>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 1.5rem;">
                    <div>
                        <label style="display: block; font-size: 0.8rem; color: #888; text-transform: uppercase; margin-bottom: 5px;">Email Address</label>
                        <p style="margin: 0; font-weight: 500;">${app.email}</p>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.8rem; color: #888; text-transform: uppercase; margin-bottom: 5px;">Phone Number</label>
                        <p style="margin: 0; font-weight: 500;">${app.mobile || app.phone || 'N/A'}</p>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.8rem; color: #888; text-transform: uppercase; margin-bottom: 5px;">Submission Date</label>
                        <p style="margin: 0;">${new Date(app.submittedAt || app.createdAt || app.date || Date.now()).toLocaleString()}</p>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.8rem; color: #888; text-transform: uppercase; margin-bottom: 5px;">CV Attachment</label>
                        ${app.cvData ? `<a href="${app.cvData}" download="${app.cvName || 'Resume.pdf'}" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:5px; text-decoration:none;"><i class="fas fa-download"></i> Download CV</a>` : '<p style="margin: 0; color: #999;">No CV attached</p>'}
                    </div>
                </div>

                <div style="background: #f9fafb; padding: 1.5rem; border-radius: 8px; border: 1px solid #f1f5f9;">
                    <label style="display: block; font-size: 0.8rem; color: #888; text-transform: uppercase; margin-bottom: 10px;">Brief Introduction / Message</label>
                    <p style="margin: 0; line-height: 1.6; white-space: pre-wrap; color: #334155;">${app.message || 'No message provided.'}</p>
                </div>

                <div style="margin-top: 2rem; display: flex; gap: 15px; justify-content: flex-end; align-items: flex-end;">
                    <button class="btn btn-secondary" onclick="closeModal()" style="height: 42px;">Close</button>
                    <div style="flex: 1; max-width: 200px;">
                        <label style="display: block; font-size: 0.75rem; color: #888; text-transform: uppercase; margin-bottom: 5px;">Update Status</label>
                        <select class="form-control" onchange="updateCareerStatus('${app.id}', this.value); closeModal();" style="height: 42px; cursor: pointer;">
                            <option value="New" ${app.status === 'New' || !app.status ? 'selected' : ''}>New / Unread</option>
                            <option value="Reviewed" ${app.status === 'Reviewed' ? 'selected' : ''}>Mark Reviewed</option>
                            <option value="Interview" ${app.status === 'Interview' ? 'selected' : ''}>Mark Interview</option>
                            <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Mark Rejected</option>
                        </select>
                    </div>
                </div>
            </div>
        `);
    } catch (err) {
        console.error('Error viewing application:', err);
        showToast('Error loading application details', 'error');
    }
};

window.updateCareerStatus = async (id, status) => {
    try {
        await DataManager.update('careers', id, { status });
        const container = document.getElementById('content-area');
        if (container) renderApplications(container);
        showToast(`Status updated to ${status}`);
    } catch (e) {
        alert('Error updating status: ' + e.message);
    }
};

window.deleteApplication = async (id) => {
    window.customConfirm('Are you sure you want to delete this application?', async (confirmed) => {
        if (!confirmed) return;
        try {
            await DataManager.delete('careers', id);
            showToast('Application deleted');
            renderApplications(document.getElementById('applications-container'));
        } catch (err) {
            alert('Error deleting application');
        }
    });
};

// --- Modal Helper ---
function showModal(contentHtml, callback) {
    const container = document.getElementById('modal-container');
    container.innerHTML = `
        <div class="modal-content">
            <button class="modal-close-btn" onclick="closeModal()" aria-label="Close">
                <i class="fas fa-times"></i>
            </button>
            ${contentHtml}
        </div>
    `;
    container.style.display = 'flex';
    if (callback) callback();
}

window.closeModal = () => {
    document.getElementById('modal-container').style.display = 'none';
};

// Close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

window.customConfirm = (msg, callback) => {
    const div = document.createElement('div');
    div.id = 'custom-confirm-overlay';
    div.style = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4px);';
    div.innerHTML = `
        <div style="background: white; padding: 2.5rem; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); max-width: 450px; width: 90%; text-align: center; animation: slideUp 0.3s ease;">
            <div style="color: #f59e0b; font-size: 4rem; margin-bottom: 1.5rem;"><i class="fas fa-exclamation-circle"></i></div>
            <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: #111827; font-weight: 700;">Are you sure?</h3>
            <p style="color: #4b5563; margin-bottom: 2rem; line-height: 1.6; font-size: 1.05rem;">${msg}</p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button id="custom-confirm-no" class="btn btn-secondary" style="padding: 10px 25px; font-weight: 600;">Cancel</button>
                <button id="custom-confirm-yes" class="btn btn-primary" style="padding: 10px 25px; font-weight: 600; background: #ef4444; border-color: #ef4444;">Yes, Proceed</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
    document.getElementById('custom-confirm-no').onclick = () => { div.remove(); callback(false); };
    document.getElementById('custom-confirm-yes').onclick = () => { div.remove(); callback(true); };
};

window.togglePasswordVisibility = (inputId, btn) => {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
};

// --- Global Event Delegation for Delete Buttons ---
document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.js-delete-btn');
    if (!btn) return;
    
    const id = btn.getAttribute('data-id');
    const type = btn.getAttribute('data-type');
    
    window.customConfirm(`Are you sure you want to delete this ${type}?`, async (confirmed) => {
        if (!confirmed) return;
        try {
            await DataManager.delete(type, id);
            showToast(`${type} deleted successfully`);
            
            // Re-render module immediately
            if (type === 'reviews') loadModule('reviews');
            else if (type === 'contact') loadModule('queries');
            else if (type === 'projects') loadModule('projects');
            else if (type === 'vacancies' || type === 'careers') loadModule('careers');
            else if (type === 'users') loadModule('users');
            
            closeModal();
        } catch (err) {
            alert('Error deleting: ' + err.message);
        }
    });
});

// Start
init();
