const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const JSONStore = require('../utils/jsonStore');
const userStore = new JSONStore('users.json');

const login = async (req, res) => {
    try {
        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({ message: 'User ID and Password are required' });
        }

        const user = await userStore.findOne(u => u.userId === userId);
        if (!user) {
            return res.status(401).json({ message: 'Invalid User ID or Password' });
        }

        const passwordIsValid = await bcrypt.compare(password, user.password);
        if (!passwordIsValid) {
            return res.status(401).json({ message: 'Invalid User ID or Password' });
        }

        const token = jwt.sign(
            { id: user.id || user.userId, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            id: user.id || user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            accessToken: token
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = {
    login
};
