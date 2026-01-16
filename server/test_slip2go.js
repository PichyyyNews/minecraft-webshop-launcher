const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_KEY = 'F0N9tHUnEJNrcLFBdMHMCalPouZ+Yj5okwwoa+yFKcg=';
const URL = 'https://connect.slip2go.com/api/verify-slip/qr-image/info'; // Checking this domain

// Create a dummy file to test multipart requirements
const dummyPath = path.join(__dirname, 'dummy_test.txt');
fs.writeFileSync(dummyPath, 'test content');

const testApi = async () => {
    try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(dummyPath));
        formData.append('payload', JSON.stringify({ checkAmount: { type: 'eq', amount: '100' } }));

        console.log(`Sending request to ${URL}...`);
        const response = await axios.post(URL, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${API_KEY}`,
            }
        });

        console.log('Response Status:', response.status);
        console.log('Response Data:', response.data);
    } catch (error) {
        if (error.response) {
            console.log('Error Status:', error.response.status);
            console.log('Error Data:', error.response.data);
        } else {
            console.log('Error:', error.message);
        }
    } finally {
        fs.unlinkSync(dummyPath);
    }
};

testApi();
