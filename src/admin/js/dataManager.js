// src/admin/js/dataManager.js
// Centralized Data Management for Admin Panel

const DataManager = {
    endpoints: {
        'reviews': '/data/reviews.json',
        'contact': '/data/contact.json',
        'projects': '/data/projects.json',
        'careers': '/data/careers.json',
        'vacancies': '/data/vacancies.json',
        'users': '/data/users.json'
    },

    // 1. Fetch data from localStorage or initialize from JSON
    async getAll(type) {
        const stored = localStorage.getItem(`steelflex_${type}`);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error(`Error parsing localStorage for ${type}`, e);
            }
        }

        // Initialize if empty from static JSON
        if (this.endpoints[type]) {
            try {
                const res = await fetch(this.endpoints[type]);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const data = await res.json();
                this._save(type, data);
                return data;
            } catch (err) {
                console.warn(`Failed to fetch initial ${type} data, using empty array`, err);
                this._save(type, []);
                return [];
            }
        }
        return [];
    },

    // 2. Internal save
    _save(type, data) {
        try {
            localStorage.setItem(`steelflex_${type}`, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error(`Error saving ${type} to localStorage`, e);
            return false;
        }
    },

    // 3. Add a new item
    async add(type, item) {
        const data = await this.getAll(type);
        if (!item.id) {
            item.id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        }
        if (!item.createdAt && !item.date) {
            item.createdAt = new Date().toISOString();
        }

        data.push(item);
        const success = this._save(type, data);
        if (!success) throw new Error("Storage Quota Exceeded.");
        return item;
    },

    // 4. Update an existing item
    async update(type, id, updatedData) {
        const data = await this.getAll(type);
        const index = data.findIndex(item => item.id == id);

        if (index !== -1) {
            data[index] = { ...data[index], ...updatedData, updatedAt: new Date().toISOString() };
            const success = this._save(type, data);
            if (!success) throw new Error("Storage Quota Exceeded.");
            return data[index];
        } else {
            throw new Error(`${type} item with id ${id} not found`);
        }
    },

    // 5. Delete an item
    async delete(type, id) {
        const data = await this.getAll(type);
        const filteredData = data.filter(item => item.id != id);

        if (filteredData.length < data.length) {
            this._save(type, filteredData);
            return true; // Successfully deleted
        }
        return false; // Item not found
    },

    // 6. Get by ID
    async getById(type, id) {
        const data = await this.getAll(type);
        return data.find(item => item.id == id) || null;
    }
};

window.DataManager = DataManager;
