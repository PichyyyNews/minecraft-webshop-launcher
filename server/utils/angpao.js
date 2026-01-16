const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

/**
 * Redeem TrueMoney Angpao
 * @param {string} link - The Angpao link
 * @param {string} mobileNumber - The mobile number to receive the money
 * @returns {Promise<{success: boolean, amount?: number, message?: string}>}
 */
const redeemAngpao = async (link, mobileNumber) => {
    if (!link || !link.includes('gift.truemoney.com')) {
        return { success: false, message: 'Invalid Link Format' };
    }

    let browser = null;
    try {
        console.log(`[Angpao] Starting redemption: ${link} -> ${mobileNumber}`);

        browser = await puppeteer.launch({
            headless: 'new', // or true
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1920,1080'
            ]
        });
        const page = await browser.newPage();

        // Use Desktop User Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        // 1. Navigate
        await page.goto(link, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait a bit for initial load
        await new Promise(r => setTimeout(r, 2000));

        // 2. Check for Cloudflare or "Redeemed / Expired"
        const content = await page.content();

        if (content.includes('Just a moment') || content.includes('Cloudflare')) {
            return { success: false, message: 'ติด Cloudflare (Bot Detected)' };
        }

        if (content.includes('ถูกรับไปหมดแล้ว')) {
            return { success: false, message: 'ซองนี้ถูกรับไปหมดแล้ว (Already Redeemed)' };
        }
        if (content.includes('หมดอายุ') || content.includes('Expired')) {
            return { success: false, message: 'ซองนี้หมดอายุแล้ว (Expired)' };
        }

        // 3. Find Input Field
        // Prioritize ID from debug html: mobile-text-field
        const inputSelectors = [
            '#mobile-text-field',
            'input[name="mobile-text-field"]',
            'input[placeholder*="08x"]',
            'input[type="tel"]',
            'input[name="mobile"]',
            'input.tmn-input',
            'input'
        ];

        let input = null;
        for (const sel of inputSelectors) {
            try {
                input = await page.waitForSelector(sel, { timeout: 3000, visible: true });
                if (input) {
                    console.log(`[Angpao] Found input using: ${sel}`);
                    break;
                }
            } catch (e) { continue; }
        }

        if (!input) {
            console.log('[Angpao] Failed to find input. Dumping content for debug...');
            // Optional: save content to a file for debugging if needed
            // fs.writeFileSync('debug_angpao_fail.html', content);
            return { success: false, message: 'ไม่พบช่องกรอกเบอร์โทร (Input Not Found)' };
        }

        // Type number
        await input.type(mobileNumber, { delay: 150 });

        // 4. Find "Redeem" Button
        await new Promise(r => setTimeout(r, 500)); // manual delay

        // Try to click using ID first
        let clicked = false;
        try {
            const btn = await page.$('#footer_button');
            if (btn) {
                await btn.click();
                clicked = true;
                console.log('[Angpao] Clicked button #footer_button');
            }
        } catch (e) { console.log('[Angpao] ID click failed, trying generic'); }

        if (!clicked) {
            clicked = await page.evaluate(async () => {
                const buttons = Array.from(document.querySelectorAll('button, div[role="button"], a[role="button"]'));
                const target = buttons.find(b => {
                    const t = b.innerText.trim();
                    return t.includes('รับซองเลย') || t.includes('ตกลง') || t.includes('Redeem');
                });
                if (target) {
                    target.click();
                    return true;
                }
                return false;
            });
        }

        if (!clicked) {
            // Fallback to last button
            await page.evaluate(() => {
                const allBtns = document.querySelectorAll('button');
                if (allBtns.length > 0) {
                    allBtns[allBtns.length - 1].click();
                }
            });
        }

        // 5. Wait for Result
        await new Promise(r => setTimeout(r, 5000)); // Increased wait time to 5s
        let finalContent = await page.content();

        // 5.1 Check for "Lucky Draw" envelope selection
        const isLuckyDraw = await page.evaluate(() => {
            const ticketTitle = document.getElementById('ticket_title');
            const card = document.getElementById('card_0');
            if ((ticketTitle && ticketTitle.innerText.includes('เลือกรับซอง')) || card) {
                if (card) {
                    card.click();
                    return true;
                }
            }
            return false;
        });

        if (isLuckyDraw) {
            console.log('[Angpao] Lucky Draw detected. Clicked envelope.');
            // Wait for open animation and result
            await new Promise(r => setTimeout(r, 4000));
            finalContent = await page.content();
        }

        // 5.2 Check if "Already Redeemed" but BY US (Success case)
        // Look for the user's mobile number in the list
        // Mobile format in DOM: 062-xxx-6990
        // Input format: 0623516990

        // Convert input 0623516990 to 062-xxx-6990 pattern for matching
        const formatMobileForCheck = (num) => {
            if (!num || num.length < 10) return num;
            // 0623516990 -> 062-xxx-6990
            return `${num.substring(0, 3)}-xxx-${num.substring(6)}`;
        };
        const maskedMobile = formatMobileForCheck(mobileNumber);

        const checkRedeemedByMe = await page.evaluate((targetMobile) => {
            const items = Array.from(document.querySelectorAll('[id^="detail-receiver-mobile-no-"]'));
            const myItem = items.find(el => el.innerText.includes(targetMobile));

            if (myItem) {
                // Found our number, get the amount
                // ID format: detail-receiver-mobile-no-0
                // Amount ID: detail-receiver-amount-0
                const index = myItem.id.split('-').pop(); // 0
                const amountEl = document.getElementById(`detail-receiver-amount-${index}`);
                if (amountEl) {
                    const amountText = amountEl.innerText; // "฿ 10.00"
                    // Parse amount
                    const match = amountText.match(/(\d+(\.\d+)?)/);
                    return match ? parseFloat(match[1]) : 0;
                }
            }
            return null;
        }, maskedMobile);

        if (checkRedeemedByMe !== null && checkRedeemedByMe > 0) {
            return { success: true, amount: checkRedeemedByMe, message: 'Redeemed Successfully (Verified in History)' };
        }

        // Check verification failure logic first
        if (finalContent.includes('เสียใจด้วย') ||
            finalContent.includes('หมดแล้ว') ||
            finalContent.includes('ถูกรับไปหมดแล้ว')) {
            return { success: false, message: 'ซองนี้ถูกรับไปหมดแล้ว (Already Redeemed)' };
        }

        // Check success logic
        // We look for amount pattern broadly first
        const amountRegex = /(\d+(\.\d{1,2})?)\s*บาท/;
        const amountMatch = finalContent.match(amountRegex);

        // Define success keywords
        const successKeywords = ['ยินดีด้วย', 'คุณได้รับเงิน', 'จำนวนเงิน', 'เรียบร้อย'];
        const isSuccessPage = successKeywords.some(kw => finalContent.includes(kw));

        if (isSuccessPage && amountMatch) {
            const amount = parseFloat(amountMatch[1]);
            return { success: true, amount: amount, message: 'Redeemed Successfully' };
        }

        // Fallback: If we found a valid amount format but no keywords, it might still be success.
        // We verify if it's NOT the input page anymore.
        const inputFieldExists = await page.$('#mobile-text-field');
        if (!inputFieldExists && amountMatch) {
            const amount = parseFloat(amountMatch[1]);
            return { success: true, amount: amount, message: 'Redeemed Successfully (Implicit)' };
        }

        // Check DOM amount as last resort for precise element match
        const domAmount = await page.evaluate(() => {
            const els = Array.from(document.querySelectorAll('*'));
            // Look for element starting with number and ending with บาท
            const el = els.find(e => e.innerText && /^\d+(\.\d+)?\s*บาท/.test(e.innerText.trim()));
            return el ? parseFloat(el.innerText) : 0;
        });

        if (domAmount > 0) {
            return { success: true, amount: domAmount, message: 'Redeemed Successfully (DOM)' };
        }

        // If unknown, save debug file
        console.log('[Angpao] Unknown Status. Saving debug file...');
        const fs = require('fs');
        const path = require('path');
        fs.writeFileSync(path.join(__dirname, '../debug_angpao_result.html'), finalContent);

        return { success: false, message: 'ไม่สามารถตรวจสอบสถานะได้ (Unknown Status) - Saved debug_angpao_result.html' };

    } catch (error) {
        console.error('[Angpao] Error:', error);
        return { success: false, message: `System Error: ${error.message}` };
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = { redeemAngpao };
