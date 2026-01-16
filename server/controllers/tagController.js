const Tag = require('../models/Tag');

// Get all tags
exports.getAllTags = async (req, res) => {
    try {
        const tags = await Tag.find().sort({ name: 1 });
        res.json(tags);
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ message: 'Failed to fetch tags' });
    }
};

// Create new tag
exports.createTag = async (req, res) => {
    try {
        const { name, color } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Tag name is required' });
        }

        const tag = new Tag({ name, color });
        await tag.save();

        res.status(201).json({ success: true, tag });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Tag already exists' });
        }
        console.error('Error creating tag:', error);
        res.status(500).json({ message: 'Failed to create tag' });
    }
};

// Update tag
exports.updateTag = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, color } = req.body;

        const tag = await Tag.findByIdAndUpdate(
            id,
            { name, color },
            { new: true }
        );

        if (!tag) {
            return res.status(404).json({ message: 'Tag not found' });
        }

        res.json({ success: true, tag });
    } catch (error) {
        console.error('Error updating tag:', error);
        res.status(500).json({ message: 'Failed to update tag' });
    }
};

// Delete tag
exports.deleteTag = async (req, res) => {
    try {
        const { id } = req.params;
        const tag = await Tag.findByIdAndDelete(id);

        if (!tag) {
            return res.status(404).json({ message: 'Tag not found' });
        }

        res.json({ success: true, message: 'Tag deleted successfully' });
    } catch (error) {
        console.error('Error deleting tag:', error);
        res.status(500).json({ message: 'Failed to delete tag' });
    }
};
