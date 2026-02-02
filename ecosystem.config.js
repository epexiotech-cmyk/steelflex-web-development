module.exports = {
    apps: [{
        name: "steelflex-admin",
        script: "./server.js",
        env: {
            NODE_ENV: "production",
            PORT: 3000
        }
    }]
}
