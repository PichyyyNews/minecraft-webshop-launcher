const TeamMember = require('../models/TeamMember');

// @desc    Get all team members
// @route   GET /api/team
// @access  Public
exports.getTeamMembers = async (req, res) => {
    try {
        const members = await TeamMember.find().sort({ order: 1 });
        res.json(members);
    } catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a team member
// @route   POST /api/team
// @access  Private (Admin)
exports.createTeamMember = async (req, res) => {
    try {
        const { name, role, description, image, avatar, order } = req.body;

        const newMember = new TeamMember({
            name,
            role,
            description,
            image,
            avatar,
            order
        });

        const savedMember = await newMember.save();
        res.status(201).json(savedMember);
    } catch (error) {
        console.error('Error creating team member:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a team member
// @route   PUT /api/team/:id
// @access  Private (Admin)
exports.updateTeamMember = async (req, res) => {
    try {
        const { name, role, description, image, avatar, order } = req.body;
        const member = await TeamMember.findById(req.params.id);

        if (!member) {
            return res.status(404).json({ message: 'Team member not found' });
        }

        member.name = name || member.name;
        member.role = role || member.role;
        member.description = description || member.description;
        member.image = image || member.image;
        member.avatar = avatar || member.avatar;
        member.order = order !== undefined ? order : member.order;

        const updatedMember = await member.save();
        res.json(updatedMember);
    } catch (error) {
        console.error('Error updating team member:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a team member
// @route   DELETE /api/team/:id
// @access  Private (Admin)
exports.deleteTeamMember = async (req, res) => {
    try {
        const member = await TeamMember.findById(req.params.id);

        if (!member) {
            return res.status(404).json({ message: 'Team member not found' });
        }

        await member.deleteOne();
        res.json({ message: 'Team member removed' });
    } catch (error) {
        console.error('Error deleting team member:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
