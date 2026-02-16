const JSONStore = require('../utils/jsonStore');
const vacancyStore = new JSONStore('vacancies.json');

const getAllVacancies = async (req, res) => {
    try {
        const vacancies = await vacancyStore.getAll();
        res.json(vacancies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const createVacancy = async (req, res) => {
    try {
        const { title, department, location, employmentType, experience, salary, description, status } = req.body;

        if (!title) {
            return res.status(400).json({ message: 'Job Title is required' });
        }

        const newVacancy = {
            id: Date.now().toString(),
            title,
            department,
            location,
            employmentType,
            experience,
            salary,
            description,
            status: status || 'Open',
            createdAt: new Date()
        };

        await vacancyStore.create(newVacancy);
        res.status(201).json(newVacancy);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateVacancy = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        delete updates.createdAt; // Prevent updating creation date

        const updatedVacancy = await vacancyStore.update(id, updates);

        if (updatedVacancy) {
            res.json(updatedVacancy);
        } else {
            res.status(404).json({ message: 'Vacancy not found' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const deleteVacancy = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await vacancyStore.delete(id);

        if (deleted) {
            res.json({ message: 'Vacancy deleted' });
        } else {
            res.status(404).json({ message: 'Vacancy not found' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const toggleStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const vacancy = await vacancyStore.getById(id);

        if (!vacancy) {
            return res.status(404).json({ message: 'Vacancy not found' });
        }

        const newStatus = vacancy.status === 'Open' ? 'Closed' : 'Open';
        const updatedVacancy = await vacancyStore.update(id, { status: newStatus });
        res.json(updatedVacancy);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getPublicVacancies = async (req, res) => {
    try {
        const vacancies = await vacancyStore.getAll();
        const openVacancies = vacancies
            .filter(v => v.status === 'Open')
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(openVacancies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getAllVacancies,
    getPublicVacancies,
    createVacancy,
    updateVacancy,
    deleteVacancy,
    toggleStatus
};
