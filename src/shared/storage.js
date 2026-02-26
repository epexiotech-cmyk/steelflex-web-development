// src/shared/storage.js
// Centralized Data Management for Steelflex Admin Panel and Website

const StorageManager = {
    // Map data types to their initial static JSON files
    endpoints: {
        'reviews': '/data/reviews.json',
        'contact': '/data/contact.json',
        'projects': '/data/projects.json',
        'careers': '/data/careers.json',
        'vacancies': '/data/vacancies.json',
        'users': '/data/users.json'
    },

    // 1. Fetch data from localStorage or initialize from JSON
    async getData(type) {
        const stored = localStorage.getItem(`steelflex_${type}`);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error(`Error parsing localStorage for ${type}`, e);
            }
        }

        // Initialize if empty
        if (this.endpoints[type]) {
            try {
                const res = await fetch(this.endpoints[type]);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const data = await res.json();
                this.setData(type, data);
                return data;
            } catch (err) {
                console.warn(`Failed to fetch initial ${type} data, using empty array`, err);
                this.setData(type, []);
                return [];
            }
        }
        return [];
    },

    // 2. Save data to localStorage
    setData(type, data) {
        try {
            localStorage.setItem(`steelflex_${type}`, JSON.stringify(data));
        } catch (e) {
            console.error(`Error saving ${type} to localStorage`, e);
        }
    },

    // 3. Add a new item
    async addItem(type, item) {
        const data = await this.getData(type);
        // Generate a unique ID if not provided
        if (!item.id) {
            item.id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        }
        // Ensure creation date if not provided
        if (!item.createdAt && !item.date) {
            item.createdAt = new Date().toISOString();
        }

        data.push(item);
        this.setData(type, data);
        return item;
    },

    // 4. Update an existing item
    async updateItem(type, id, updatedData) {
        const data = await this.getData(type);
        const index = data.findIndex(item => item.id == id); // Loose equality in case of string/number mix

        if (index !== -1) {
            data[index] = { ...data[index], ...updatedData, updatedAt: new Date().toISOString() };
            this.setData(type, data);
            return data[index];
        } else {
            throw new Error(`${type} item with id ${id} not found`);
        }
    },

    // 5. Delete an item
    async deleteItem(type, id) {
        const data = await this.getData(type);
        const filteredData = data.filter(item => item.id != id);

        if (filteredData.length < data.length) {
            this.setData(type, filteredData);
            return true; // Successfully deleted
        }
        return false; // Item not found
    },

    // Helper to get a singular item by ID
    async getById(type, id) {
        const data = await this.getData(type);
        return data.find(item => item.id == id) || null;
    }
};

// Make it globally available on the window object so both the website and admin can access it
window.StorageManager = StorageManager;
