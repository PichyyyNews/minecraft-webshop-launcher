const Social = require('../models/Social');

// @desc    Get all social links
// @route   GET /api/socials
// @access  Public
const getSocials = async (req, res) => {
    try {
        const socials = await Social.find().sort({ createdAt: 1 });
        res.json(socials);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add a social link
// @route   POST /api/socials
// @access  Public (Should be protected in production)
const addSocial = async (req, res) => {
    try {
        const { platform, url, icon } = req.body;

        const social = new Social({
            platform,
            url,
            icon,
        });

        const createdSocial = await social.save();
        res.status(201).json(createdSocial);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a social link
// @route   DELETE /api/socials/:id
// @access  Public (Should be protected in production)
const deleteSocial = async (req, res) => {
    try {
        const social = await Social.findById(req.params.id);

        if (social) {
            await social.deleteOne();
            res.json({ message: 'Social link removed' });
        } else {
            res.status(404).json({ message: 'Social link not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getSocials,
    addSocial,
    deleteSocial,
};
