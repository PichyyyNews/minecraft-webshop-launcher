const http = require('http');

console.log('Fetching http://localhost:5000/api/products ...');
http.get('http://localhost:5000/api/products', (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Content Type: ${res.headers['content-type']}`);

    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        console.log('Body length:', rawData.length);
        console.log('Body start:', rawData.substring(0, 500));
    });
}).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
});
