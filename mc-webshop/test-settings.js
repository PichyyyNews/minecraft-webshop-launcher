

async function testSettings() {
    try {
        const res = await fetch('http://localhost:5000/api/settings');
        const data = await res.json();
        console.log('siteTitle:', data.siteTitle);
        console.log('faviconUrl:', data.faviconUrl);
        console.log('Full Settings Keys:', Object.keys(data));
    } catch (error) {
        console.error('Error:', error);
    }
}

testSettings();
