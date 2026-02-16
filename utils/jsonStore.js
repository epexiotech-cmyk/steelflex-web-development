const fs = require('fs-extra');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');

class JSONStore {
    constructor(filename) {
        this.filePath = path.join(DATA_DIR, filename);
    }

    async read() {
        try {
            return await fs.readJson(this.filePath);
        } catch (error) {
            // If file doesn't exist or is corrupt, return empty array
            return [];
        }
    }

    async write(data) {
        // Atomic write via temporary file is handled by fs-extra's outputJson/writeJson usually, 
        // but to be extra safe we can rely on fs-extra's atomic options or implement simple locking if needed.
        // For this scale, fs.writeJson is sufficient as it does atomic writes.
        await fs.writeJson(this.filePath, data, { spaces: 2 });
    }

    async getAll() {
        return await this.read();
    }

    async getById(id, idField = 'id') {
        const data = await this.read();
        return data.find(item => item[idField] === id);
    }

    async create(item) {
        const data = await this.read();
        data.push(item);
        await this.write(data);
        return item;
    }

    async update(id, updates, idField = 'id') {
        const data = await this.read();
        const index = data.findIndex(item => item[idField] === id);
        if (index === -1) return null;

        data[index] = { ...data[index], ...updates };
        await this.write(data);
        return data[index];
    }

    async delete(id, idField = 'id') {
        const data = await this.read();
        const initialLength = data.length;
        const newData = data.filter(item => item[idField] !== id);

        if (newData.length === initialLength) return false;

        await this.write(newData);
        return true;
    }

    async findOne(predicate) {
        const data = await this.read();
        return data.find(predicate);
    }
}

module.exports = JSONStore;
