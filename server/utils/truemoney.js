const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

let sharedBrowser = null;

const getBrowser = async () => {
    if (sharedBrowser && sharedBrowser.isConnected()) {
        return sharedBrowser;
    }

    console.log('Starting new shared browser instance...');
    sharedBrowser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Memory optimization
            '--disable-gpu'
        ],
        userDataDir: path.join(__dirname, '../../.puppeteer_data') // Persist session/cookies
    });
    return sharedBrowser;
};

const redeemAngpao = async (link, mobileNumber, expectedAmount = null) => {
    let page = null;
    const capturedResponses = [];
    let verifiedAmount = null;

    try {
        if (!link || !link.includes('gift.truemoney.com')) {
            return { success: false, message: 'Invalid Angpao link format' };
        }

        const cleanMobile = mobileNumber.replace(/[^0-9]/g, '');
        if (cleanMobile.length !== 10) {
            return { success: false, message: 'Invalid merchant phone number configuration' };
        }

        console.log(`Processing Angpao: ${link} (Expected: ${expectedAmount})`);

        const browser = await getBrowser();
        page = await browser.newPage(); // Open new tab only

        // Random User Agent rotation could be added here if needed, but keeping consistent is also good for cookies.
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        page.on('response', async response => {
            try {
                const contentType = response.headers()['content-type'];
                const url = response.url();

                if (contentType && contentType.includes('application/json')) {
                    const json = await response.json();
                    capturedResponses.push({ url, body: json });

                    if (url.includes('verify') && json.data && json.data.voucher) {
                        if (json.data.voucher.amount_baht) {
                            verifiedAmount = parseFloat(json.data.voucher.amount_baht);
                            console.log('Detected Amount:', verifiedAmount);
                        }
                    }
                }
            } catch (e) { /* ignore */ }
        });

        // Step 1: Visit Page
        await page.goto(link, { waitUntil: 'networkidle0' });

        // Check for "Already Redeemed" or "Over Limit" text immediately
        let bodyText = await page.evaluate(() => document.body.innerText);
        if (bodyText.includes('ถูกรับไปแล้ว') || bodyText.includes('Redeemed') || bodyText.includes('หมดอายุ')) {
            return { success: false, message: 'Voucher already redeemed or expired', code: 'ALREADY_REDEEMED' };
        }
        if (bodyText.includes('Over limit') || bodyText.includes('limit')) {
            return { success: false, message: 'Cloudflare Rate Limit Hit (Wait 1 min)', code: 'RATE_LIMIT' };
        }

        // EARLY AMOUNT CHECK
        if (expectedAmount !== null) {
            if (verifiedAmount === null) await new Promise(r => setTimeout(r, 2000));

            if (verifiedAmount !== null && verifiedAmount < expectedAmount) {
                console.warn(`Amount Check Failed (Early)! Angpao has ${verifiedAmount}, expected ${expectedAmount}. Aborting.`);
                return {
                    success: false,
                    message: `ยอดเงินไม่ถูกต้อง (ซอง ${verifiedAmount} บาท, ต้องใช้ ${expectedAmount} บาท)`,
                    code: 'WRONG_AMOUNT',
                    amount: verifiedAmount
                };
            }
        }

        const inputSelector = '#mobile-text-field';
        const buttonSelector = '#footer_button';

        const inputExists = await page.$(inputSelector);
        if (inputExists) {
            await page.type(inputSelector, cleanMobile);
            await page.keyboard.press('Tab');
            await new Promise(r => setTimeout(r, 1000)); // Natural pause
            await page.click(buttonSelector);
            console.log('Submitted phone number...');
            await new Promise(r => setTimeout(r, 5000));
        }

        // LATE AMOUNT CHECK
        if (expectedAmount !== null && verifiedAmount !== null && verifiedAmount < expectedAmount) {
            console.warn(`Amount Check Failed (Late)!`);
            return {
                success: false,
                message: `ยอดเงินไม่ถูกต้อง`,
                code: 'WRONG_AMOUNT',
                amount: verifiedAmount
            };
        }

        // Step 2: Handle "Pick an Envelope" (Lucky Draw)
        try {
            const cardSelector = '#card_0, .acard, [data-testid="card_0"]';
            // Wait up to 10s
            await page.waitForSelector(cardSelector, { timeout: 10000 });
            console.log('Found lucky draw envelope! Clicking...');

            await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (el) el.click();
            }, cardSelector);

            await new Promise(r => setTimeout(r, 5000));
        } catch (e) {
            console.log('No lucky draw screen found (Checking next steps)');
        }

        // OPTIMIZATION: Check Logs BEFORE Reloading
        const checkLogs = (logs) => {
            for (const res of [...logs].reverse()) {
                const data = res.body;
                if (data.data && data.data.my_ticket && data.data.my_ticket.amount_baht) return data;
                if (data.status && data.status.code === 'SUCCESS' && data.data && data.data.my_ticket) return data;
            }
            return null;
        };

        const earlySuccess = checkLogs(capturedResponses);
        if (earlySuccess) {
            console.log('Success captured via logs!');
            return {
                success: true,
                amount: parseFloat(earlySuccess.data.my_ticket.amount_baht),
                ownerName: earlySuccess.data.owner_profile.full_name
            };
        }

        // Check UI Text before reloading
        bodyText = await page.evaluate(() => document.body.innerText);
        if (bodyText.includes('บาท') && (bodyText.includes('ได้รับเงิน') || bodyText.includes('Received') || bodyText.includes('Congrat'))) {
            const amountMatch = bodyText.match(/(\d+\.?\d*)\s*บาท/);
            const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
            console.log('Success captured via UI Text!');
            return { success: true, amount: amount, message: 'Success (UI)', code: 'SUCCESS_UI' };
        }

        // Step 3: Reload to verify (Last Resort)
        console.log('Reloading to verify...');
        await page.reload({ waitUntil: 'networkidle0' });
        await new Promise(r => setTimeout(r, 3000));

        // Step 4: Analyze Response (Again)
        const reversedResponses = [...capturedResponses].reverse();
        let successData = null;
        let alreadyRedeemedData = null;

        for (const res of reversedResponses) {
            const data = res.body;

            if (data.data && data.data.my_ticket && data.data.my_ticket.amount_baht) {
                successData = data;
                break;
            }
            if (data.status && data.status.code === 'SUCCESS' && data.data && data.data.my_ticket) {
                successData = data;
                break;
            }
            if (data.status && data.status.code === 'ALREADY_REDEEMED') {
                alreadyRedeemedData = data;
            }
            if (data.status && data.status.code === 'CANNOT_GET_OWN_VOUCHER') {
                return { success: false, message: 'Cannot redeem your own voucher', code: 'OWN_VOUCHER' };
            }
        }

        if (successData) {
            return {
                success: true,
                amount: parseFloat(successData.data.my_ticket.amount_baht),
                ownerName: successData.data.owner_profile.full_name
            };
        }

        if (alreadyRedeemedData) {
            return { success: false, message: 'Voucher already redeemed', code: 'ALREADY_REDEEMED' };
        }

        // Debug Save
        const debugDir = path.join(__dirname, '../../public/debug');
        if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
        fs.writeFileSync(path.join(debugDir, 'network_log.json'), JSON.stringify(capturedResponses, null, 2));
        await page.screenshot({ path: path.join(debugDir, 'final_result.png') });
        const html = await page.content();
        fs.writeFileSync(path.join(debugDir, 'final_page.html'), html);

        return { success: false, message: 'Redemption failed', code: 'NO_CAPTURE' };

    } catch (error) {
        console.error('Puppeteer Error:', error);
        return { success: false, message: 'Browser Error', code: 'PUPPETEER_ERROR' };
    } finally {
        if (page) await page.close(); // Only close the page, NOT the browser
    }
};

module.exports = { redeemAngpao };
