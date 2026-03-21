// src/admin/js/dataManager.js
// Centralized Data Management for Admin Panel

const DataManager = {
    // 1. Fetch data from backend API
    async getAll(type) {
        try {
            const res = await fetch(`/api/data/${type}`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error(`Failed to fetch ${type} data`, err);
            return [];
        }
    },

    // 2. Add a new item
    async add(type, item) {
        if (!item.id) {
            item.id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        }
        if (!item.createdAt && !item.date) {
            item.createdAt = new Date().toISOString();
        }

        const res = await fetch(`/api/data/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        
        if (!res.ok) throw new Error("Failed to add data to server");
        const data = await res.json();
        return data.item;
    },

    // 3. Update an existing item
    async update(type, id, updatedData) {
        updatedData.updatedAt = new Date().toISOString();
        const res = await fetch(`/api/data/${type}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        if (!res.ok) throw new Error("Failed to update data on server");
        const data = await res.json();
        return data.item;
    },

    // 4. Delete an item
    async delete(type, id) {
        const res = await fetch(`/api/data/${type}/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error("Failed to delete data on server");
        return true;
    },

    // 5. Get by ID
    async getById(type, id) {
        const data = await this.getAll(type);
        return data.find(item => item.id == id) || null;
    }
};

window.DataManager = DataManager;
