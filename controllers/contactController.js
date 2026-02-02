const JSONStore = require('../utils/jsonStore');
const contactStore = new JSONStore('contact_queries.json');

const getAllQueries = async (req, res) => {
    try {
        const queries = await contactStore.getAll();
        res.json(queries);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Public endpoint to submit a query
const createQuery = async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        const newQuery = {
            id: Date.now().toString(),
            name,
            email,
            phone,
            message,
            date: new Date(),
            isRead: false
        };
        await contactStore.create(newQuery);
        res.status(201).json({ message: 'Query submitted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await contactStore.update(id, { isRead: true });
        if (!updated) return res.status(404).json({ message: 'Query not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const deleteQuery = async (req, res) => {
    try {
        const success = await contactStore.delete(req.params.id);
        if (!success) return res.status(404).json({ message: 'Query not found' });
        res.json({ message: 'Query deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { getAllQueries, createQuery, markAsRead, deleteQuery };
