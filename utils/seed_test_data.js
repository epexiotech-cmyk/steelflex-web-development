const fs = require('fs-extra');
const path = require('path');

const seedTestData = async () => {
    try {
        const dataPath = (file) => path.join(__dirname, '../data', file);

        // 1. Projects
        const projects = [
            {
                id: "proj_1",
                title: "Skyline Tower Foundation",
                location: "Downtown Metropolis",
                description: "Deep foundation work for a 50-story commercial tower, involving extensive excavation and piling.",
                status: "Ongoing",
                area: "12000",
                images: ["https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop"],
                youtubeUrl: ""
            },
            {
                id: "proj_2",
                title: "Harbor Bridge Retrofit",
                location: "Bay Area",
                description: "Seismic retrofitting and structural reinforcement of the historic harbor bridge.",
                status: "Completed",
                area: "5000",
                images: ["https://images.unsplash.com/photo-1590644365607-1c5a2e91a317?q=80&w=2650&auto=format&fit=crop"],
                youtubeUrl: ""
            },
            {
                id: "proj_3",
                title: "Green Valley Office Park",
                location: "Suburban Heights",
                description: "Construction of an eco-friendly office complex with sustainable materials.",
                status: "Ongoing",
                area: "25000",
                images: ["https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=2831&auto=format&fit=crop"],
                youtubeUrl: ""
            }
        ];
        await fs.writeJson(dataPath('projects.json'), projects, { spaces: 2 });
        console.log('Seeded Projects');

        // 2. Reviews
        const reviews = [
            {
                id: "rev_1",
                clientName: "John Smith",
                companyName: "Urban Developers Inc.",
                reviewText: "Steelflex delivered exceptional quality on our foundation project. Their team was professional and on schedule.",
                rating: "5",
                status: "Active"
            },
            {
                id: "rev_2",
                clientName: "Sarah Connor",
                companyName: "SkyNet Logistics",
                reviewText: "Solid work and great communication throughout easier than expected.",
                rating: "4",
                status: "Active"
            },
            {
                id: "rev_3",
                clientName: "Michael Chang",
                companyName: "Chang Properties",
                reviewText: "Very reliable partners for large-scale infrastructure projects.",
                rating: "5",
                status: "Active"
            }
        ];
        await fs.writeJson(dataPath('reviews.json'), reviews, { spaces: 2 });
        console.log('Seeded Reviews');

        // 3. Contact Queries
        const queries = [
            {
                id: "query_1",
                name: "Alice Johnson",
                email: "alice@example.com",
                message: "We are looking for a quote for a new warehouse foundation in the industrial park.",
                date: new Date().toISOString(),
                status: "new"
            },
            {
                id: "query_2",
                name: "Bob Builder",
                email: "bob@construction.co",
                message: "Do you handle residential retrofitting projects?",
                date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                status: "read"
            }
        ];
        await fs.writeJson(dataPath('contact_queries.json'), queries, { spaces: 2 });
        console.log('Seeded Queries');

        // 4. Careers
        const careers = [
            {
                id: "app_1",
                name: "David Lee",
                email: "david.lee@email.com",
                appliedRole: "Site Engineer",
                cvFile: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", // Dummy PDF
                status: "new",
                date: new Date().toISOString()
            }
        ];
        await fs.writeJson(dataPath('careers.json'), careers, { spaces: 2 });
        console.log('Seeded Careers');

    } catch (error) {
        console.error('Seeding failed:', error);
    }
};

seedTestData();
