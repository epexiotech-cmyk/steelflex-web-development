const JSONStore = require('../utils/jsonStore');
const reviewStore = new JSONStore('reviews.json');

const getAllReviews = async (req, res) => {
    try {
        const reviews = await reviewStore.getAll();
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const createReview = async (req, res) => {
    try {
        const { clientName, companyName, reviewText, rating, status } = req.body;
        const newReview = {
            id: Date.now().toString(),
            clientName,
            companyName,
            reviewText,
            rating: parseInt(rating),
            status: status || 'Hidden',
            createdAt: new Date()
        };
        await reviewStore.create(newReview);
        res.status(201).json(newReview);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await reviewStore.update(id, req.body);
        if (!updated) return res.status(404).json({ message: 'Review not found' });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const deleteReview = async (req, res) => {
    try {
        const success = await reviewStore.delete(req.params.id);
        if (!success) return res.status(404).json({ message: 'Review not found' });
        res.json({ message: 'Review deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { getAllReviews, createReview, updateReview, deleteReview };
