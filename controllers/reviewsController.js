const JSONStore = require('../utils/jsonStore');
const reviewStore = new JSONStore('reviews.json');
const path = require('path');
const fs = require('fs');

// Helper to format file paths relative to public
const formatFilePath = (file) => {
    if (!file) return null;
    return '/uploads/reviews/' + file.filename;
};

// Private method to delete local file
const deleteLocalFile = (filePath) => {
    if (!filePath) return;
    const fullPath = path.join(__dirname, '../public', filePath);
    if (fs.existsSync(fullPath)) {
        try {
            fs.unlinkSync(fullPath);
        } catch (e) {
            console.error('Failed to delete file:', fullPath, e);
        }
    }
};

const getAllReviews = async (req, res) => {
    try {
        const reviews = await reviewStore.getAll();
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getAcceptedReviews = async (req, res) => {
    try {
        const reviews = await reviewStore.getAll();
        const accepted = reviews.filter(r => r.status === 'approved' || r.status === 'Accepted');
        res.json(accepted);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const createReview = async (req, res) => {
    try {
        const { clientName, company, reviewText, rating, status } = req.body;

        if (!clientName || !reviewText || !rating) {
            return res.status(400).json({ message: 'Client name, review text, and rating are required.' });
        }

        const files = req.files || {};
        const reviewerPhotoPath = files['reviewerPhoto'] ? formatFilePath(files['reviewerPhoto'][0]) : null;
        const companyLogoPath = files['companyLogo'] ? formatFilePath(files['companyLogo'][0]) : null;
        const projectImagesPaths = files['projectImages'] ? files['projectImages'].map(f => formatFilePath(f)) : [];

        const newReview = {
            id: Date.now().toString(),
            clientName,
            companyName: company || '',
            reviewText,
            rating: parseInt(rating, 10),
            reviewerPhoto: reviewerPhotoPath,
            companyLogo: companyLogoPath,
            projectImages: projectImagesPaths,
            status: status || 'pending',
            createdAt: new Date().toISOString()
        };

        const created = await reviewStore.create(newReview);
        res.status(201).json({ success: true, message: 'Review created successfully', data: created });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateReviewStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // Expecting "approved", "rejected", "Pending" etc

        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        const updated = await reviewStore.update(id, { status });

        if (!updated) {
            return res.status(404).json({ message: 'Review not found' });
        }

        res.json({ success: true, message: 'Review updated', data: updated });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const review = await reviewStore.getById(id);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // 1. Delete associated media files
        if (review.reviewerPhoto) deleteLocalFile(review.reviewerPhoto);
        if (review.companyLogo) deleteLocalFile(review.companyLogo);
        if (review.projectImages && review.projectImages.length > 0) {
            review.projectImages.forEach(deleteLocalFile);
        }

        // 2. Remove from JSON
        const success = await reviewStore.delete(id);

        if (!success) {
            return res.status(404).json({ message: 'Failed to delete from store' });
        }
        res.json({ success: true, message: 'Review deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getAllReviews,
    getAcceptedReviews,
    createReview,
    updateReviewStatus,
    deleteReview
};
