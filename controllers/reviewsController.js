const JSONStore = require('../utils/jsonStore');
const reviewStore = new JSONStore('reviews.json');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs-extra');

// Helper: Process single image
const processImage = async (file, width, height) => {
    if (!file) return null;
    const uniqueName = `${path.parse(file.filename).name}.webp`;
    const outputPath = path.join(file.destination, uniqueName);

    try {
        await sharp(file.path)
            .resize(width, height, { fit: 'cover' })
            .toFormat('webp', { quality: 80 })
            .toFile(outputPath);

        // Delete original
        await fs.unlink(file.path).catch(console.error);
        return `/uploads/reviews/${uniqueName}`;
    } catch (err) {
        console.error("Error processing review image:", err);
        return null; // Or handle error
    }
};

const getAllReviews = async (req, res) => {
    try {
        const reviews = await reviewStore.getAll();

        // Check if admin request (via route middleware or path)
        // Since we reuse this controller for public and admin, we can check req.path or user
        const isAdminRoute = req.path.includes('/admin') || (req.user && req.user.role === 'ADMIN'); // Simple check

        if (isAdminRoute) {
            res.json(reviews);
        } else {
            // Public: Only Accepted
            const visible = reviews.filter(r => r.status === 'Accepted');
            res.json(visible);
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const createReview = async (req, res) => {
    try {
        const { clientName, companyName, reviewText, rating, status } = req.body;

        // Handle Files
        let reviewerPhoto = null;
        let companyLogo = null;
        let reviewImages = [];

        if (req.files) {
            if (req.files.reviewerPhoto) {
                reviewerPhoto = await processImage(req.files.reviewerPhoto[0], 400, 400);
            }
            if (req.files.companyLogo) {
                companyLogo = await processImage(req.files.companyLogo[0], 300, 300);
            }
            if (req.files.reviewImages) {
                for (const file of req.files.reviewImages) {
                    const imgPath = await processImage(file, 800, 600);
                    if (imgPath) reviewImages.push(imgPath);
                }
            }
        }

        const newReview = {
            id: Date.now().toString(),
            clientName,
            companyName,
            reviewText,
            rating: parseInt(rating),
            status: status || 'Pending', // Default Pending
            reviewerPhoto,
            companyLogo,
            reviewImages, // New field
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
        const review = await reviewStore.getById(id);
        if (!review) return res.status(404).json({ message: 'Review not found' });

        const { clientName, companyName, reviewText, rating, status } = req.body;
        let { existingReviewImages } = req.body; // Handle existing images

        // Handle Files
        let reviewerPhoto = review.reviewerPhoto;
        let companyLogo = review.companyLogo;
        let reviewImages = [];

        // Parse existing images
        if (existingReviewImages) {
            if (Array.isArray(existingReviewImages)) {
                reviewImages = existingReviewImages;
            } else {
                reviewImages = [existingReviewImages];
            }
        }

        if (req.files) {
            if (req.files.reviewerPhoto) {
                // Delete old if exists
                if (reviewerPhoto) {
                    await fs.remove(path.join(__dirname, '../public', reviewerPhoto)).catch(console.error);
                }
                reviewerPhoto = await processImage(req.files.reviewerPhoto[0], 400, 400);
            }
            if (req.files.companyLogo) {
                // Delete old if exists
                if (companyLogo) {
                    await fs.remove(path.join(__dirname, '../public', companyLogo)).catch(console.error);
                }
                companyLogo = await processImage(req.files.companyLogo[0], 300, 300);
            }
            if (req.files.reviewImages) {
                for (const file of req.files.reviewImages) {
                    const imgPath = await processImage(file, 800, 600);
                    if (imgPath) reviewImages.push(imgPath);
                }
            }
        }

        // Cleanup: Check which images were removed
        const oldImages = review.reviewImages || [];
        const toDelete = oldImages.filter(img => !reviewImages.includes(img));
        for (const imgPath of toDelete) {
            await fs.remove(path.join(__dirname, '../public', imgPath)).catch(console.error);
        }

        const safeUpdates = {};
        if (clientName !== undefined) safeUpdates.clientName = clientName;
        if (companyName !== undefined) safeUpdates.companyName = companyName;
        if (reviewText !== undefined) safeUpdates.reviewText = reviewText;
        if (rating !== undefined) safeUpdates.rating = parseInt(rating);
        if (status !== undefined) safeUpdates.status = status;
        if (reviewerPhoto !== undefined) safeUpdates.reviewerPhoto = reviewerPhoto;
        if (companyLogo !== undefined) safeUpdates.companyLogo = companyLogo;
        safeUpdates.reviewImages = reviewImages; // Always update array

        const updated = await reviewStore.update(id, safeUpdates);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const deleteReview = async (req, res) => {
    try {
        const review = await reviewStore.getById(req.params.id);
        if (!review) return res.status(404).json({ message: 'Review not found' });

        // Delete images
        if (review.reviewerPhoto) await fs.remove(path.join(__dirname, '../public', review.reviewerPhoto)).catch(console.error);
        if (review.companyLogo) await fs.remove(path.join(__dirname, '../public', review.companyLogo)).catch(console.error);
        if (review.reviewImages) {
            for (const img of review.reviewImages) {
                await fs.remove(path.join(__dirname, '../public', img)).catch(console.error);
            }
        }

        await reviewStore.delete(req.params.id);
        res.json({ message: 'Review deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { getAllReviews, createReview, updateReview, deleteReview };
