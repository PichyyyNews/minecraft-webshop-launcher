const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Card = require('./models/Card');
const connectDB = require('./config/db');

dotenv.config();

const seedCards = async () => {
    await connectDB();

    try {
        const count = await Card.countDocuments();
        if (count === 0) {
            const defaultCards = [
                {
                    title: 'Premium Ranks',
                    description: 'Unlock exclusive perks, commands, and kits with our premium ranks designed for the ultimate experience.',
                    color: '#FFAA00',
                    imageUrl: '/defaults/1.png'
                },
                {
                    title: 'Rare Items',
                    description: 'Get your hands on powerful weapons, armor, and tools to dominate the game and stand out from the crowd.',
                    color: '#55FF55',
                    imageUrl: '/defaults/2.png'
                },
                {
                    title: 'Instant Delivery',
                    description: 'Your purchases are delivered automatically within seconds, so you can get back to playing without delay.',
                    color: '#55FFFF',
                    imageUrl: '/defaults/3.png'
                }
            ];

            await Card.insertMany(defaultCards);
            console.log('Default cards seeded successfully.');
        } else {
            console.log('Cards already exist. Skipping seed.');
        }
    } catch (error) {
        console.error('Error seeding cards:', error);
    } finally {
        process.exit();
    }
};

seedCards();
