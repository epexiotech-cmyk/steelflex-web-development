const { createQuery } = require('./controllers/contactController');

const req = {
    body: {
        name: "Test User",
        email: "test@example.com",
        phone: "1234567890",
        message: "Test query from CLI",
        projectType: "Factory"
    }
};

const res = {
    status: (code) => {
        console.log("Status:", code);
        return res;
    },
    json: (data) => {
        console.log("JSON:", data);
    }
};

async function test() {
    try {
        await createQuery(req, res);
    } catch (err) {
        console.error("Caught error:", err);
    }
}
test();
