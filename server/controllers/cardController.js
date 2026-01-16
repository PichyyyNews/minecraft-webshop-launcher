const Card = require('../models/Card');
const path = require('path');
const fs = require('fs');

// @desc    Get all cards
// @route   GET /api/cards
// @access  Public
const getCards = async (req, res) => {
    try {
        const cards = await Card.find({}).sort({ createdAt: 1 });
        res.json(cards);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a new card
// @route   POST /api/cards
// @access  Public (Protected by frontend admin check)
const createCard = async (req, res) => {
    try {
        const { title, description, color } = req.body;
        let imageUrl = '';

        if (req.file) {
            imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
        }

        const card = new Card({
            title,
            description,
            color,
            imageUrl,
        });

        const createdCard = await card.save();
        res.status(201).json(createdCard);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a card
// @route   DELETE /api/cards/:id
// @access  Public (Protected by frontend admin check)
const deleteCard = async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);

        if (card) {
            // Optional: Delete image file if it exists
            if (card.imageUrl) {
                const filename = card.imageUrl.split('/').pop();
                const imagePath = path.join(__dirname, '../uploads', filename);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            await card.deleteOne();
            res.json({ message: 'Card removed' });
        } else {
            res.status(404).json({ message: 'Card not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getCards,
    createCard,
    deleteCard,
};
