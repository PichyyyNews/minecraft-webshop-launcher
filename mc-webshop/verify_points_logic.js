const mongoose = require('mongoose');
const User = require('./server/models/User');
const Transaction = require('./server/models/Transaction');
const PointPackage = require('./server/models/PointPackage');
const dotenv = require('dotenv');

dotenv.config({ path: './server/.env' });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mcwebshop', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const verifyPoints = async () => {
    await connectDB();

    try {
        // 1. Create Test User
        const testUser = await User.create({
            name: 'Test User',
            email: `testuser_${Date.now()}@example.com`,
            password: 'password123',
            points: 100
        });
        console.log('Test User Created:', testUser.email, 'Points:', testUser.points);

        // 2. Create Test Package
        const testPackage = await PointPackage.create({
            name: 'Test Package',
            price: 100,
            points: 50
        });
        console.log('Test Package Created:', testPackage.name, 'Points:', testPackage.points);

        // 3. Create Test Transaction
        const testTransaction = await Transaction.create({
            user: testUser._id,
            package: testPackage._id,
            slipUrl: 'http://example.com/slip.jpg',
            status: 'pending'
        });
        console.log('Test Transaction Created:', testTransaction._id);

        // 4. Simulate Approval Logic (copy-paste logic from controller for verification or call API if server running)
        // Since we want to test the controller logic, ideally we'd call the controller function, but that requires req/res mocks.
        // For simplicity and direct verification of the *logic* flow we just modified, we can replicate the core logic here
        // OR better, we can actually import the controller if we can mock req/res.
        // Let's try to mock req/res to test the ACTUAL controller function.

        const { updateTransactionStatus } = require('./server/controllers/transactionController');

        const req = {
            params: { id: testTransaction._id },
            body: { status: 'approved' },
            user: { role: 'admin' } // Mock admin user if needed by middleware (though controller doesn't use it for this func)
        };

        const res = {
            status: function (code) {
                this.statusCode = code;
                return this;
            },
            json: function (data) {
                this.data = data;
                return this;
            }
        };

        console.log('Calling updateTransactionStatus...');
        await updateTransactionStatus(req, res);

        if (res.statusCode && res.statusCode !== 200) {
            console.error('Controller returned error:', res.statusCode, res.data);
        } else {
            console.log('Controller executed successfully.');
        }

        // 5. Verify Points
        const updatedUser = await User.findById(testUser._id);
        console.log('Updated User Points:', updatedUser.points);

        if (updatedUser.points === 150) {
            console.log('SUCCESS: Points added correctly!');
        } else {
            console.error('FAILURE: Points not added correctly. Expected 150, got ' + updatedUser.points);
        }

        // Cleanup
        await User.findByIdAndDelete(testUser._id);
        await PointPackage.findByIdAndDelete(testPackage._id);
        await Transaction.findByIdAndDelete(testTransaction._id);
        console.log('Cleanup done.');

    } catch (error) {
        console.error('Verification Error:', error);
    } finally {
        mongoose.connection.close();
    }
};

verifyPoints();
