const JSONStore = require('../utils/jsonStore');
const careerStore = new JSONStore('careers.json');
const path = require('path');
const fs = require('fs-extra');

const getAllApplications = async (req, res) => {
    try {
        const apps = await careerStore.getAll();
        res.json(apps);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const submitApplication = async (req, res) => {
    try {
        const { name, email, phone, appliedRole } = req.body;
        const cvFile = req.file ? `/uploads/cvs/${req.file.filename}` : null;

        if (!cvFile) {
            return res.status(400).json({ message: 'CV file is required' });
        }

        const newApp = {
            id: Date.now().toString(),
            name,
            email,
            phone,
            appliedRole,
            cvFile,
            submittedAt: new Date()
        };
        await careerStore.create(newApp);
        res.status(201).json({ message: 'Application submitted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const deleteApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const app = await careerStore.getById(id);

        if (app) {
            await careerStore.delete(id);

            // Attempt to delete CV file
            if (app.cvFile) {
                const cvPath = path.join(__dirname, '../public', app.cvFile);
                await fs.remove(cvPath).catch(err => console.error("Failed to delete CV:", err));
            }

            res.json({ message: 'Application deleted' });
        } else {
            res.status(404).json({ message: 'Application not found' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { getAllApplications, submitApplication, deleteApplication };
