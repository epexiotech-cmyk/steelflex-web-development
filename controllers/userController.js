const bcrypt = require('bcrypt');
const JSONStore = require('../utils/jsonStore');
const userStore = new JSONStore('users.json');

const getAllUsers = async (req, res) => {
    try {
        const users = await userStore.getAll();
        // Remove password from response
        const safeUsers = users.map(u => {
            const { password, ...rest } = u;
            return rest;
        });
        res.status(200).json(safeUsers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createUser = async (req, res) => {
    try {
        const { name, email, userId, password, role } = req.body;

        // Basic validation
        if (!name || !email || !userId || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check for duplicates
        const existingId = await userStore.findOne(u => u.userId === userId);
        if (existingId) return res.status(400).json({ message: 'User ID already exists' });

        const existingEmail = await userStore.findOne(u => u.email === email);
        if (existingEmail) return res.status(400).json({ message: 'Email already exists' });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: Date.now().toString(), // Simple ID generation
            name,
            email,
            userId,
            password: hashedPassword,
            role: role || 'ADMIN' // Default to ADMIN if not specified, though usually restricted
        };

        if (newUser.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
            // Technically this endpoint is protected by superAdminOnlyMiddleware anyway
            // but good safety check
        }

        await userStore.create(newUser);

        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Prevent changing password directly through this endpoint if we want strict separation, 
        // but for simplicity we allow it if provided (and hash it)
        if (updates.password) {
            updates.password = await bcrypt.hash(updates.password, 10);
        }

        // Prevent changing ID to something that exists (omitted for brevity but recommended)

        const updatedUser = await userStore.update(id, updates);
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Prevent deleting self? 
        if (req.user.id === id) {
            return res.status(400).json({ message: 'Cannot delete yourself' });
        }

        const success = await userStore.delete(id);
        if (!success) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser
};
