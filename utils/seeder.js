const bcrypt = require('bcrypt');
const JSONStore = require('./jsonStore');
const userStore = new JSONStore('users.json');

const seedSuperAdmin = async () => {
    try {
        const users = await userStore.getAll();
        const superAdmin = users.find(u => u.role === 'SUPER_ADMIN');

        if (!superAdmin) {
            console.log('No Super Admin found. Seeding default Super Admin...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const newSuperAdmin = {
                id: 'superadmin_1',
                name: 'Super Admin',
                email: 'admin@hostinger.com',
                userId: 'admin',
                password: hashedPassword,
                role: 'SUPER_ADMIN'
            };
            await userStore.create(newSuperAdmin);
            console.log('Super Admin seeded. UserID: admin, Pass: admin123');
        } else {
            console.log('Super Admin already exists.');
        }
    } catch (error) {
        console.error('Error seeding Super Admin:', error);
    }
};

module.exports = seedSuperAdmin;
