const JSONStore = require('../utils/jsonStore');
const projectStore = new JSONStore('projects.json');
const path = require('path');
const fs = require('fs-extra');

const getAllProjects = async (req, res) => {
    try {
        const projects = await projectStore.getAll();
        res.json(projects);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const sharp = require('sharp');

// Helper: Process images (Resize to FHD, Convert to WebP)
const processImages = async (files) => {
    const processedPaths = [];
    for (const file of files) {
        const uniqueName = `${path.parse(file.filename).name}.webp`; // Use same basename, change ext
        const outputPath = path.join(file.destination, uniqueName);

        try {
            await sharp(file.path)
                .resize(1440, 1080, { fit: 'cover' }) // FHD, cover to maintain aspect ratio
                .toFormat('webp', { quality: 80 })
                .toFile(outputPath);

            processedPaths.push(`/uploads/projects/${uniqueName}`);

            // Delete original file
            await fs.unlink(file.path).catch(err => console.error("Failed to delete temp file:", err));
        } catch (err) {
            console.error("Error processing image:", err);
            // If error, maybe keep original? Or skip. Let's skip and log.
        }
    }
    return processedPaths;
};

const createProject = async (req, res) => {
    try {
        const { title, location, area, status, description, youtubeUrl } = req.body;

        // Handle Images
        let images = [];
        if (req.files && req.files.length > 0) {
            images = await processImages(req.files);
        }

        const newProject = {
            id: Date.now().toString(),
            title,
            location,
            area,
            status,
            description,
            images, // Array of strings
            youtubeUrl,
            createdAt: new Date()
        };
        await projectStore.create(newProject);
        res.status(201).json(newProject);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, location, area, status, description, youtubeUrl } = req.body;
        let { existingImages } = req.body;

        const project = await projectStore.getById(id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        // Parse existing images (FormData sends arrays as multiple fields or sometimes strings)
        // If it's a string, make it an array. If undefined, empty array.
        let finalImages = [];
        if (existingImages) {
            if (Array.isArray(existingImages)) {
                finalImages = existingImages;
            } else {
                finalImages = [existingImages];
            }
        }

        // Process New Images
        if (req.files && req.files.length > 0) {
            const newImages = await processImages(req.files);
            finalImages = [...finalImages, ...newImages];
        }

        const updates = {
            title, location, area, status, description, youtubeUrl,
            images: finalImages
        };

        // Cleanup: Ideally check which images were removed from 'project.images' and delete them from disk.
        // Identify deleted images
        const oldImages = project.images || (project.image ? [project.image] : []);
        const toDelete = oldImages.filter(img => !finalImages.includes(img));

        for (const imgPath of toDelete) {
            const fullPath = path.join(__dirname, '../public', imgPath);
            await fs.remove(fullPath).catch(err => console.error("Failed to delete old image:", err));
        }

        const updated = await projectStore.update(id, updates);
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
};

const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await projectStore.getById(id);

        if (project) {
            await projectStore.delete(id);

            // Attempt to delete image file
            if (project.image) {
                const imagePath = path.join(__dirname, '../public', project.image);
                await fs.remove(imagePath).catch(err => console.error("Failed to delete image:", err));
            }

            res.json({ message: 'Project deleted' });
        } else {
            res.status(404).json({ message: 'Project not found' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { getAllProjects, createProject, updateProject, deleteProject };
