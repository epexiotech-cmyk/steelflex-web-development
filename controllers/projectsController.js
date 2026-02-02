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

const createProject = async (req, res) => {
    try {
        const { title, location, area, status, description } = req.body;
        const image = req.file ? `/uploads/projects/${req.file.filename}` : null;

        const newProject = {
            id: Date.now().toString(),
            title,
            location,
            area,
            status,
            description,
            image,
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
        const updates = req.body;

        if (req.file) {
            updates.image = `/uploads/projects/${req.file.filename}`;
            // Optional: consistency - delete old image? 
            // Skipping for simplicity/safety unless requested.
        }

        const updated = await projectStore.update(id, updates);
        if (!updated) return res.status(404).json({ message: 'Project not found' });
        res.json(updated);
    } catch (err) {
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
