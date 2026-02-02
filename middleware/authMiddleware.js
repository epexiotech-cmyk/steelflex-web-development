const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        req.user = decoded; // { id: '...', role: '...' }
        next();
    });
};

const isSuperAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'SUPER_ADMIN') {
        next();
    } else {
        res.status(403).json({ message: 'Require Super Admin Role!' });
    }
};

const isAdmin = (req, res, next) => {
    // Both SUPER_ADMIN and ADMIN can access "admin" level modules usually, 
    // strictly speaking the prompt says SUPER ADMIN has full control. 
    // ADMIN has restricted control.
    // If a route is for "Any Admin", we check if role is present.
    if (req.user && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN')) {
        next();
    } else {
        res.status(403).json({ message: 'Require Admin Role!' });
    }
};

module.exports = {
    verifyToken,
    isSuperAdmin,
    isAdmin
};
