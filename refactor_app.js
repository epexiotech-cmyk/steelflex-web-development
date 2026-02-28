const fs = require('fs');
const path = require('path');

const appJsPath = path.join('d:', 'AAPP', 'steelflex-web-development', 'src', 'admin', 'js', 'app.js');
let appJs = fs.readFileSync(appJsPath, 'utf8');

// 1. Replace StorageManager to DataManager
appJs = appJs.replace(/StorageManager\.getData\b/g, 'DataManager.getAll');
appJs = appJs.replace(/StorageManager\.addItem\b/g, 'DataManager.add');
appJs = appJs.replace(/StorageManager\.updateItem\b/g, 'DataManager.update');
appJs = appJs.replace(/StorageManager\.deleteItem\b/g, 'DataManager.delete');
appJs = appJs.replace(/StorageManager\.getById\b/g, 'DataManager.getById');
appJs = appJs.replace(/StorageManager/g, 'DataManager');

// 2. Fix apiCall usage in Vacancies (vacancies is in localStorage via DataManager, not apiCall!)
// the user says "Switch review/contact/project storage to localStorage... All CRUD operations must go through it"
// In app.js around line 506: await apiCall('/vacancies', 'POST', data); -> needs to be DataManager
appJs = appJs.replace(/await apiCall\('\/vacancies',\s*'POST',\s*data\);/g, "await DataManager.add('vacancies', data);");
appJs = appJs.replace(/await apiCall\(`\/vacancies\/\$\{id\}\/toggle-status`,\s*'PATCH'\);/g,
    `const v = await DataManager.getById('vacancies', id);
 await DataManager.update('vacancies', id, { status: v.status === 'Open' ? 'Closed' : 'Open' });`);
appJs = appJs.replace(/await apiCall\(`\/vacancies\/\$\{id\}`,\s*'DELETE'\);/g, "await DataManager.delete('vacancies', id);");

// 3. Fix Image paths for storage. 
// "Ensure JSON stores image path as: /uploads/filename.ext"
// Currently in Review modal: `data.reviewerPhoto = await getBase64(...)`
// They want to store the image path as `/uploads/...` instead of base64!
// Wait, "Ensure JSON stores image path as: /uploads/filename.ext". Vite cannot write files.
// But we are using localStorage. If we use localStorage, base64 is stored directly in JSON (localStorage).
// But wait, "Do NOT attempt to write to JSON file directly. Switch ... to localStorage. Ensure all uploaded images are stored in public/uploads. Ensure JSON stores image path as /uploads/filename.ext"
// Is there a backend?
// The user says "Do NOT attempt to write to JSON file directly (Vite cannot write files)"
// So if they upload a file, how do we store it in public/uploads? We CANNOT without a backend!
// Maybe we just store base64 in localStorage? Or do they mean for PRE-EXISTING data in JSON it should be `/uploads/...` and new uploads?
// Let's change the modal fallback to handle whatever is there, and format paths correctly if they contain `../uploads`:
appJs = appJs.replace(/\.\.\/uploads\//g, '/uploads/');

// 4. Accept/Reject Reviews 
appJs = appJs.replace(/window\.updateReviewStatus = async \(id, status\) => \{[\s\S]*?loadModule\('reviews'\);\s*\} catch[\s\S]*?\}\s*\};/m,
    `window.updateReviewStatus = async (id, status) => {
    if (confirm(\`Are you sure you want to mark this review as \${status}?\`)) {
        try {
            await DataManager.update('reviews', id, { status });
            closeModal();
            showToast(\`Review successfully \${status}\`);
            const v = document.getElementById('reviewStatusFilter') ? document.getElementById('reviewStatusFilter').value : 'all';
            loadModule('reviews'); // refresh
        } catch (err) {
            alert('Error updating status: ' + (err.message || 'Unknown error'));
        }
    }
};`);

// 5. Delete buttons / event delegation
// The user wants Event Delegation for dynamically generated delete buttons. 
// Let's add a global event listener at the end of app.js.
const globalDeleter = `
// --- Global Event Delegation for Delete Buttons ---
document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.js-delete-btn');
    if (!btn) return;
    
    const id = btn.getAttribute('data-id');
    const type = btn.getAttribute('data-type');
    
    if (confirm(\`Are you sure you want to delete this \${type}?\`)) {
        try {
            await DataManager.delete(type, id);
            showToast(\`\${type} deleted successfully\`);
            
            // Re-render module immediately
            if (type === 'reviews') loadModule('reviews');
            else if (type === 'contact') loadModule('queries');
            else if (type === 'projects') loadModule('projects');
            else if (type === 'vacancies' || type === 'careers') loadModule('careers');
            else if (type === 'users') loadModule('users');
            
            // closeModal just in case we are inside a modal
            closeModal();
        } catch (err) {
            alert('Error deleting: ' + err.message);
        }
    }
});
`;

appJs = appJs.replace(/init\(\);\s*$/, globalDeleter + '\ninit();');

// Now we update all delete buttons in render templates to use js-delete-btn class and remove inline onclick
appJs = appJs.replace(/<button class="btn-sm btn-delete" title="Delete" onclick="deleteReview\('\$\{r\.id\}'\)"><i class="fas fa-trash"><\/i><\/button>/g,
    '<button class="btn-sm btn-delete js-delete-btn" title="Delete" data-id="${r.id}" data-type="reviews"><i class="fas fa-trash"></i></button>');

appJs = appJs.replace(/<button class="btn-sm btn-delete" onclick="deleteQuery\('\$\{q\.id\}'\)"><i class="fas fa-trash"><\/i><\/button>/g,
    '<button class="btn-sm btn-delete js-delete-btn" data-id="${q.id}" data-type="contact"><i class="fas fa-trash"></i></button>');

appJs = appJs.replace(/<button class="btn btn-danger" onclick="deleteQuery\('\$\{query\.id\}', true\)">Delete<\/button>/g,
    '<button class="btn btn-danger js-delete-btn" data-id="${query.id}" data-type="contact">Delete</button>');

appJs = appJs.replace(/<button class="btn-sm btn-delete" onclick="deleteProject\('\$\{p\.id\}'\)"><i class="fas fa-trash"><\/i><\/button>/g,
    '<button class="btn-sm btn-delete js-delete-btn" data-id="${p.id}" data-type="projects"><i class="fas fa-trash"></i></button>');

appJs = appJs.replace(/<button class="btn-sm btn-delete" onclick="deleteVacancy\('\$\{v\.id\}'\)" title="Delete">\s*<i class="fas fa-trash"><\/i>\s*<\/button>/g,
    '<button class="btn-sm btn-delete js-delete-btn" title="Delete" data-id="${v.id}" data-type="vacancies"><i class="fas fa-trash"></i></button>');

appJs = appJs.replace(/<a href="#" class="dropdown-item text-danger" onclick="deleteCareer\('\$\{app\.id\}'\); return false;">Delete<\/a>/g,
    '<a href="#" class="dropdown-item text-danger js-delete-btn" data-id="${app.id}" data-type="careers">Delete</a>');

appJs = appJs.replace(/<button class="btn-sm btn-delete" onclick="deleteUser\('\$\{u\.id\}'\)"><i class="fas fa-trash"><\/i><\/button>/g,
    '<button class="btn-sm btn-delete js-delete-btn" data-id="${u.id}" data-type="users"><i class="fas fa-trash"></i></button>');

// Remove the inline global functions to avoid duplicate/confusion
appJs = appJs.replace(/window\.deleteReview = async \(id\) => \{[\s\S]*?^\};/m, '// deleteReview removed, using event delegation');
appJs = appJs.replace(/window\.deleteQuery = async \(id, fromModal = false\) => \{[\s\S]*?^\};/m, '// deleteQuery removed, using event delegation');
appJs = appJs.replace(/window\.deleteProject = async \(id\) => \{[\s\S]*?^\};/m, '// deleteProject removed, using event delegation');
appJs = appJs.replace(/window\.deleteVacancy = async \(id\) => \{[\s\S]*?^\};/m, '// deleteVacancy removed, using event delegation');
appJs = appJs.replace(/window\.deleteCareer = async \(id\) => \{[\s\S]*?^\};/m, '// deleteCareer removed, using event delegation');
appJs = appJs.replace(/window\.deleteUser = async \(id\) => \{[\s\S]*?^\};/m, '// deleteUser removed, using event delegation');


// Save the file back
fs.writeFileSync(appJsPath, appJs, 'utf8');
console.log('Refactoring complete!');
