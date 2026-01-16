const axios = require('axios');

async function checkSettings() {
    try {
        console.log('Fetching settings...');
        const response = await axios.get('http://localhost:5000/api/settings');
        // Check both root level and nested if structure varies, based on controller it is flattened
        console.log('Social Image URL:', response.data.socialImageUrl);
        console.log('Full Settings:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkSettings();
