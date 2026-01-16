const Wiki = require('../models/Wiki');
const fs = require('fs');
const path = require('path');

// Get all wiki articles
exports.getWikis = async (req, res) => {
    try {
        const wikis = await Wiki.find().sort({ createdAt: -1 });
        res.json(wikis);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get latest wiki articles
exports.getLatestWikis = async (req, res) => {
    try {
        const wikis = await Wiki.find().sort({ createdAt: -1 }).limit(5);
        res.json(wikis);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Get single wiki article by ID
exports.getWikiById = async (req, res) => {
    try {
        const wiki = await Wiki.findById(req.params.id);
        if (!wiki) return res.status(404).json({ message: 'Wiki not found' });
        res.json(wiki);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Create new wiki article
exports.createWiki = async (req, res) => {
    const { title, content, author } = req.body;
    let imageUrl = '';

    if (req.file) {
        imageUrl = `/${req.file.path}`;
    }

    const wiki = new Wiki({
        title,
        content,
        imageUrl,
        author
    });

    try {
        const newWiki = await wiki.save();
        res.status(201).json(newWiki);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Update wiki article
exports.updateWiki = async (req, res) => {
    try {
        const { title, content, author } = req.body;
        const wiki = await Wiki.findById(req.params.id);

        if (!wiki) return res.status(404).json({ message: 'Wiki not found' });

        wiki.title = title || wiki.title;
        wiki.content = content || wiki.content;
        wiki.author = author || wiki.author;

        if (req.file) {
            // Delete old image if it exists
            if (wiki.imageUrl) {
                try {
                    let urlPath = wiki.imageUrl;
                    if (urlPath.startsWith('http')) {
                        urlPath = urlPath.split('uploads/')[1];
                        if (urlPath) urlPath = 'uploads/' + urlPath;
                    } else if (urlPath.startsWith('/')) {
                        urlPath = urlPath.substring(1);
                    }

                    if (urlPath) {
                        const oldImagePath = path.join(__dirname, '..', urlPath);
                        if (fs.existsSync(oldImagePath)) {
                            fs.unlinkSync(oldImagePath);
                        }
                    }
                } catch (err) {
                    console.error('Error deleting old wiki image:', err);
                }
            }
            wiki.imageUrl = `/${req.file.path}`;
        }

        const updatedWiki = await wiki.save();
        res.json(updatedWiki);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

// Delete wiki article
exports.deleteWiki = async (req, res) => {
    try {
        const wiki = await Wiki.findById(req.params.id);
        if (!wiki) return res.status(404).json({ message: 'Wiki not found' });

        // Delete image file if it exists
        if (wiki.imageUrl) {
            try {
                let urlPath = wiki.imageUrl;
                if (urlPath.startsWith('http')) {
                    urlPath = urlPath.split('uploads/')[1];
                    if (urlPath) urlPath = 'uploads/' + urlPath;
                } else if (urlPath.startsWith('/')) {
                    urlPath = urlPath.substring(1);
                }

                if (urlPath) {
                    const imagePath = path.join(__dirname, '..', urlPath);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                }
            } catch (err) {
                console.error('Error deleting wiki image:', err);
            }
        }

        await wiki.deleteOne();
        res.json({ message: 'Wiki deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
