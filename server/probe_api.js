const https = require('https');

const checkDomain = (domain) => {
    return new Promise((resolve) => {
        const req = https.request({
            hostname: domain,
            port: 443,
            path: '/',
            method: 'HEAD',
            timeout: 5000
        }, (res) => {
            console.log(`${domain}: Responded with ${res.statusCode}`);
            resolve(true);
        });

        req.on('error', (e) => {
            console.log(`${domain}: Error - ${e.message}`);
            resolve(false);
        });

        req.on('timeout', () => {
            console.log(`${domain}: Timeout`);
            req.destroy();
            resolve(false);
        });

        req.end();
    });
};

const run = async () => {
    await checkDomain('api.slip2go.com');
    await checkDomain('connect.slip2go.com');
};

run();
