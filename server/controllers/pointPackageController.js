const PointPackage = require('../models/PointPackage');
const path = require('path');
const fs = require('fs');

// @desc    Get all point packages
// @route   GET /api/point-packages
// @access  Public
const getPackages = async (req, res) => {
    try {
        const packages = await PointPackage.find({}).sort({ price: 1 });
        res.json(packages);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a new point package
// @route   POST /api/point-packages
// @access  Admin
const createPackage = async (req, res) => {
    try {
        const { name, price, points, tag, tagColor } = req.body;
        let imageUrl = '';

        if (req.file) {
            imageUrl = `/${req.file.path}`; // Store specific relative path (e.g. /uploads/packages/...)
        }

        const pointPackage = new PointPackage({
            name,
            price,
            points,
            imageUrl,
            tag,
            tagColor,
        });

        const createdPackage = await pointPackage.save();
        res.status(201).json(createdPackage);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a point package
// @route   PUT /api/point-packages/:id
// @access  Admin
const updatePackage = async (req, res) => {
    try {
        const { name, price, points, tag, tagColor } = req.body;
        const pointPackage = await PointPackage.findById(req.params.id);

        if (pointPackage) {
            pointPackage.name = name || pointPackage.name;
            pointPackage.price = price || pointPackage.price;
            pointPackage.points = points || pointPackage.points;
            pointPackage.tag = tag !== undefined ? tag : pointPackage.tag;
            pointPackage.tagColor = tagColor || pointPackage.tagColor;

            if (req.file) {
                // Delete old image if exists
                if (pointPackage.imageUrl) {
                    // Handle both legacy (full URL) and new (relative) paths
                    let oldPath = pointPackage.imageUrl;
                    if (oldPath.startsWith('http')) {
                        const filename = oldPath.split('/').pop();
                        // Assuming legacy files are in uploads/ root
                        oldPath = path.join(__dirname, '../uploads', filename);
                    } else if (oldPath.startsWith('/')) {
                        // Remove leading slash for path.join
                        oldPath = path.join(__dirname, '..', oldPath.substring(1));
                    }

                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                }
                pointPackage.imageUrl = `/${req.file.path}`;
            }

            const updatedPackage = await pointPackage.save();
            res.json(updatedPackage);
        } else {
            res.status(404).json({ message: 'Package not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a point package
// @route   DELETE /api/point-packages/:id
// @access  Admin
const deletePackage = async (req, res) => {
    try {
        const pointPackage = await PointPackage.findById(req.params.id);

        if (pointPackage) {
            if (pointPackage.imageUrl) {
                let imagePath = pointPackage.imageUrl;
                if (imagePath.startsWith('http')) {
                    const filename = imagePath.split('/').pop();
                    imagePath = path.join(__dirname, '../uploads', filename);
                } else if (imagePath.startsWith('/')) {
                    imagePath = path.join(__dirname, '..', imagePath.substring(1));
                }

                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            if (pointPackage.qrCodeUrl) {
                const filename = pointPackage.qrCodeUrl.split('/').pop();
                const qrPath = path.join(__dirname, '../uploads', filename);
                if (fs.existsSync(qrPath)) {
                    fs.unlinkSync(qrPath);
                }
            }

            await pointPackage.deleteOne();
            res.json({ message: 'Package removed' });
        } else {
            res.status(404).json({ message: 'Package not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getPackages,
    createPackage,
    updatePackage,
    deletePackage,
};
