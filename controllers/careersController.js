const JSONStore = require('../utils/jsonStore');
const careerStore = new JSONStore('careers.json');
const path = require('path');
const fs = require('fs-extra');

const getAllApplications = async (req, res) => {
    try {
        const apps = await careerStore.getAll();
        // Sort by submittedAt desc
        apps.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        res.json(apps);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const submitApplication = async (req, res) => {
    try {
        console.log('Body:', req.body);
        console.log('File:', req.file);

        const { name, email, mobile, position, message } = req.body;
        // Map frontend fields to backend schema
        const appliedRole = position;
        const phone = mobile;
        const introduction = message;

        const cvFile = req.file ? `/uploads/cvs/${req.file.filename}` : null;

        if (!name || !email || !phone || !appliedRole || !cvFile) {
            // Cleanup file if validation fails
            if (req.file) {
                await fs.remove(req.file.path).catch(console.error);
            }
            return res.status(400).json({ message: 'All fields including CV are required.' });
        }

        const newApp = {
            id: Date.now().toString(),
            name,
            email,
            phone,
            appliedRole,
            introduction,
            cvFile,
            status: 'New', // Default status
            submittedAt: new Date().toISOString()
        };
        await careerStore.create(newApp);
        res.status(201).json({ message: 'Application submitted successfully' });
    } catch (err) {
        // Cleanup file on error
        if (req.file) {
            await fs.remove(req.file.path).catch(console.error);
        }
        res.status(500).json({ message: err.message });
    }
};

const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['New', 'Reviewed', 'Rejected', 'Interview'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const updated = await careerStore.update(id, { status });
        if (!updated) return res.status(404).json({ message: 'Application not found' });
        res.json(updated);
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

module.exports = { getAllApplications, submitApplication, updateStatus, deleteApplication };
