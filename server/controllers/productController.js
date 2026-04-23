const Product = require('../models/Product');
const path = require('path');
const fs = require('fs');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
    try {
        const products = await Product.find({}).sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res) => {
    try {
        const products = await Product.find({}).sort({ createdAt: -1 }).limit(5);
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a new product
// @route   POST /api/products
// @access  Admin
const createProduct = async (req, res) => {
    try {
        const { name, description, price, category, tag, tagColor, command, allowGift, displayType, modelSettings, blockTextures, gltfModel } = req.body;
        let imageUrl = '';

        if (req.body.image) {
            imageUrl = req.body.image;
            // Ensure it starts with / if not already
            if (!imageUrl.startsWith('/')) imageUrl = `/${imageUrl}`;
        } else if (req.file) {
            // req.file.path is already normalized
            imageUrl = `/${req.file.path}`;
        }

        let parsedModelSettings = {};
        if (modelSettings) {
            try {
                parsedModelSettings = typeof modelSettings === 'string' ? JSON.parse(modelSettings) : modelSettings;
            } catch (error) {
                console.error('Error parsing modelSettings:', error);
            }
        }

        let parsedBlockTextures = {};
        if (blockTextures) {
            try {
                parsedBlockTextures = typeof blockTextures === 'string' ? JSON.parse(blockTextures) : blockTextures;
            } catch (error) {
                console.error('Error parsing blockTextures:', error);
            }
        }

        const product = new Product({
            name,
            description,
            price,
            category,
            imageUrl,
            tag,
            tagColor,
            command,
            allowGift: allowGift === 'true' || allowGift === true,
            displayType: displayType || 'image',
            modelSettings: parsedModelSettings,
            blockTextures: parsedBlockTextures,
            gltfModel: gltfModel || ''
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Admin
const updateProduct = async (req, res) => {
    try {
        const { name, description, price, category, tag, tagColor, command, allowGift, displayType, modelSettings, blockTextures, gltfModel } = req.body;
        const product = await Product.findById(req.params.id);

        if (product) {
            product.name = name || product.name;
            product.description = description || product.description;
            product.price = price || product.price;
            product.category = category || product.category;
            product.tag = tag !== undefined ? tag : product.tag;
            product.tagColor = tagColor || product.tagColor;
            product.command = command !== undefined ? command : product.command;
            product.allowGift = allowGift !== undefined ? (allowGift === 'true' || allowGift === true) : product.allowGift;
            product.displayType = displayType || product.displayType;

            if (modelSettings) {
                try {
                    product.modelSettings = typeof modelSettings === 'string' ? JSON.parse(modelSettings) : modelSettings;
                } catch (error) {
                    console.error('Error parsing modelSettings:', error);
                }
            }

            if (blockTextures) {
                try {
                    product.blockTextures = typeof blockTextures === 'string' ? JSON.parse(blockTextures) : blockTextures;
                } catch (error) {
                    console.error('Error parsing blockTextures:', error);
                }
            }

            if (req.body.image) {
                // Delete old image if exists
                if (product.imageUrl && product.imageUrl !== req.body.image) {
                    try {
                        let urlPath = product.imageUrl;
                        if (urlPath.startsWith('http')) {
                            // Handle legacy absolute URLs
                            urlPath = urlPath.split('uploads/')[1];
                            if (urlPath) urlPath = 'uploads/' + urlPath;
                        } else if (urlPath.startsWith('/')) {
                            // Handle new relative URLs (remove leading slash)
                            urlPath = urlPath.substring(1);
                        }

                        if (urlPath) {
                            const imagePath = path.join(__dirname, '../', urlPath);
                            if (fs.existsSync(imagePath)) {
                                fs.unlinkSync(imagePath);
                            }
                        }
                    } catch (err) {
                        console.error('Error deleting old image:', err);
                    }
                }
                // Set new image URL
                let newImageUrl = req.body.image;
                if (!newImageUrl.startsWith('/')) newImageUrl = `/${newImageUrl}`;
                product.imageUrl = newImageUrl;
            }

            // Handle gltfModel update
            if (gltfModel) {
                // Delete old gltfModel if exists and different
                if (product.gltfModel && product.gltfModel !== gltfModel) {
                    try {
                        let urlPath = product.gltfModel;
                        if (urlPath.startsWith('http')) {
                            urlPath = urlPath.split('uploads/')[1];
                            if (urlPath) urlPath = 'uploads/' + urlPath;
                        } else if (urlPath.startsWith('/')) {
                            urlPath = urlPath.substring(1);
                        }

                        if (urlPath) {
                            const filePath = path.join(__dirname, '../', urlPath);
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                            }
                        }
                    } catch (err) {
                        // console.error('Error deleting old gltfModel:', err);
                    }
                }
                product.gltfModel = gltfModel;
            }

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Admin
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            if (product.imageUrl) {
                try {
                    let urlPath = product.imageUrl;
                    if (urlPath.startsWith('http')) {
                        urlPath = urlPath.split('uploads/')[1];
                        if (urlPath) urlPath = 'uploads/' + urlPath;
                    } else if (urlPath.startsWith('/')) {
                        urlPath = urlPath.substring(1);
                    }

                    if (urlPath) {
                        const imagePath = path.join(__dirname, '../', urlPath);
                        if (fs.existsSync(imagePath)) {
                            fs.unlinkSync(imagePath);
                        }
                    }
                } catch (err) {
                    console.error('Error deleting product image:', err);
                }
            }

            if (product.gltfModel) {
                try {
                    let urlPath = product.gltfModel;
                    if (urlPath.startsWith('http')) {
                        urlPath = urlPath.split('uploads/')[1];
                        if (urlPath) urlPath = 'uploads/' + urlPath;
                    } else if (urlPath.startsWith('/')) {
                        urlPath = urlPath.substring(1);
                    }

                    if (urlPath) {
                        const filePath = path.join(__dirname, '../', urlPath);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    }
                } catch (err) {
                    console.error('Error deleting product GLTF model:', err);
                }
            }

            await product.deleteOne();
            res.json({ message: 'Product removed' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

const User = require('../models/User');
const Purchase = require('../models/Purchase');
const Setting = require('../models/Setting');
const RconLog = require('../models/RconLog');
const util = require('minecraft-server-util');

// Helper to get RCON settings
const getRconSettings = async () => {
    const settings = await Setting.find({ key: { $in: ['rconHost', 'rconPort', 'rconPassword'] } });
    const config = {};
    settings.forEach(s => config[s.key] = s.value);
    return config;
};

// @desc    Purchase a product
// @route   POST /api/products/:id/buy
// @access  Private
const purchaseProduct = async (req, res) => {
    let rconClient = null;
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Atomic deduction: Check balance AND deduct in one go
        const updatedUser = await User.findOneAndUpdate(
            { _id: user._id, points: { $gte: product.price } },
            { $inc: { points: -product.price } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(400).json({ message: 'Insufficient points or transaction failed' });
        }

        // Use updatedUser from here on
        // Create purchase record
        const purchase = new Purchase({
            user: updatedUser._id,
            product: product._id,
            productName: product.name,
            price: product.price,
            command: product.command
        });
        await purchase.save();

        // Execute RCON command if exists
        if (product.command) {
            try {
                const config = await getRconSettings();
                if (config.rconHost && config.rconPassword) {
                    const host = config.rconHost;
                    const port = parseInt(config.rconPort) || 25575;
                    const password = config.rconPassword;

                    // Replace [player] with target username or user's name
                    // If allowGift is true, use the provided targetUsername (if any), otherwise default to user.name
                    // If allowGift is false, ALWAYS use user.name (ignore targetUsername)
                    let targetName = updatedUser.name;
                    if (product.allowGift && req.body.targetUsername) {
                        targetName = req.body.targetUsername;
                    }

                    const commandToRun = product.command.replace(/\[player\]/g, targetName);

                    rconClient = new util.RCON();
                    await rconClient.connect(host, port);
                    await rconClient.login(password);
                    const response = await rconClient.execute(commandToRun);

                    // Log success
                    await RconLog.create({
                        command: commandToRun,
                        response: response,
                        sender: 'System (Purchase)'
                    });
                } else {
                    console.warn('RCON not configured, skipping command execution for purchase');
                }
            } catch (rconError) {
                console.error('RCON Execution Error:', rconError);
                // Log failure but don't fail the purchase as points are already deducted
                await RconLog.create({
                    command: product.command,
                    response: 'Error: ' + rconError.message,
                    sender: 'System (Purchase)'
                });
            } finally {
                if (rconClient) {
                    try {
                        await rconClient.close();
                    } catch (e) { }
                }
            }
        }

        res.json({
            message: 'Purchase successful',
            message: 'Purchase successful',
            points: updatedUser.points,
            purchase
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get user's purchase history
// @route   GET /api/products/purchases/me
// @access  Private
const getMyPurchases = async (req, res) => {
    try {
        const purchases = await Purchase.find({ user: req.user.id })
            .sort({ createdAt: -1 });
        res.json(purchases);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getProducts,
    getFeaturedProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    purchaseProduct,
    getMyPurchases
};
