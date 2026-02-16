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
        const { name, email, phone, message, projectType } = req.body;

        // Validation
        if (!name || !email || !phone || !message) {
            return res.status(400).json({ message: 'Name, email, phone, and message are required.' });
        }

        const newQuery = {
            id: Date.now().toString(), // Using timestamp as unique ID for simplicity
            name,
            email,
            phone,
            projectType: projectType || 'Not Specified',
            message,
            status: "Unread", // User requested "Unread"
            createdAt: new Date().toISOString()
        };
        await contactStore.create(newQuery);
        res.status(201).json({ success: true, message: 'Query submitted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        // User requested changing status to "Read"
        const updated = await contactStore.update(id, { status: "Read", isRead: true });
        // Keeping isRead for backward compatibility if needed, but status is primary
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
