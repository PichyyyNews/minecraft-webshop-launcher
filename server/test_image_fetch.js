const http = require('http');

const url = 'http://localhost:5000/uploads/settings/2026/01/4e705b2e-2d6c-4bb8-9a80-cde55df51189.webp';

console.log(`Fetching ${url} ...`);
http.get(url, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Content Type: ${res.headers['content-type']}`);
    console.log(`Content Length: ${res.headers['content-length']}`);
}).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
});
