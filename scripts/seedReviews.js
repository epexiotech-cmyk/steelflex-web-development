const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');

const REVIEWS_FILE = path.join(__dirname, '../data/reviews.json');
const UPLOAD_DIR = path.join(__dirname, '../public/uploads/reviews');

fs.ensureDirSync(UPLOAD_DIR);

const sampleReviews = [
    {
        clientName: "Emily Clarke",
        companyName: "Zenith Architecture",
        reviewText: "Steelflex provided outstanding structural steel components for our latest high-rise project. The precision and quality were top-notch, and the delivery was right on schedule.",
        rating: 5,
        status: "Accepted",
        reviewerPhotoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
        companyLogoUrl: "https://ui-avatars.com/api/?name=ZA&background=0D8ABC&color=fff&size=300",
        projectImageUrls: [
            "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&h=600&fit=crop"
        ]
    },
    {
        clientName: "David Ross",
        companyName: "Ross Constructions",
        reviewText: "We've been working with Steelflex for over 5 years. Their consistency and attention to client needs are what keep us coming back.",
        rating: 5,
        status: "Accepted",
        reviewerPhotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
        companyLogoUrl: "https://ui-avatars.com/api/?name=RC&background=critical&color=fff&size=300", // 'critical' invalid color keyword likely black/grey fallback?
        projectImageUrls: [
            "https://images.unsplash.com/photo-1590644365607-1c5a38fc4306?w=800&h=600&fit=crop"
        ]
    },
    {
        clientName: "Sophia Martinez",
        companyName: "Modern Living Spaces",
        reviewText: "The custom fabrication work was exactly what we needed for the unique design of the community center. Highly recommended!",
        rating: 4,
        status: "Accepted",
        reviewerPhotoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop",
        companyLogoUrl: "https://ui-avatars.com/api/?name=ML&background=22c55e&color=fff&size=300",
        projectImageUrls: [
            "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1464938050520-ef2270bb8ce8?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1448630360428-65456885c650?w=800&h=600&fit=crop"
        ]
    }
];

async function downloadImage(url, filename) {
    try {
        const response = await axios({ url, responseType: 'arraybuffer' });
        const outputPath = path.join(UPLOAD_DIR, filename);

        await sharp(response.data)
            .toFormat('webp')
            .toFile(outputPath);

        return `/uploads/reviews/${filename}`;
    } catch (error) {
        console.error(`Failed to download ${url}:`, error.message);
        return null;
    }
}

async function seed() {
    console.log("Seeding reviews...");
    let existingdata = [];
    try {
        existingdata = await fs.readJson(REVIEWS_FILE);
    } catch (e) {
        console.log("Creating new reviews.json");
    }

    const newReviews = [];

    for (const sample of sampleReviews) {
        console.log(`Processing review from ${sample.clientName}...`);

        const id = Date.now().toString() + Math.floor(Math.random() * 1000);
        let reviewerPhoto = null;
        let companyLogo = null;
        let reviewImages = [];

        if (sample.reviewerPhotoUrl) {
            reviewerPhoto = await downloadImage(sample.reviewerPhotoUrl, `seed-${id}-rp.webp`);
        }

        if (sample.companyLogoUrl) {
            companyLogo = await downloadImage(sample.companyLogoUrl, `seed-${id}-cl.webp`);
        }

        if (sample.projectImageUrls) {
            let idx = 0;
            for (const url of sample.projectImageUrls) {
                const imgPath = await downloadImage(url, `seed-${id}-pi-${idx}.webp`);
                if (imgPath) reviewImages.push(imgPath);
                idx++;
            }
        }

        newReviews.push({
            id,
            clientName: sample.clientName,
            companyName: sample.companyName,
            reviewText: sample.reviewText,
            rating: sample.rating,
            status: sample.status,
            reviewerPhoto,
            companyLogo,
            reviewImages,
            createdAt: new Date()
        });
    }

    const finalData = [...existingdata, ...newReviews];
    await fs.writeJson(REVIEWS_FILE, finalData, { spaces: 2 });
    console.log(`Added ${newReviews.length} reviews. Total: ${finalData.length}`);
}

seed();
