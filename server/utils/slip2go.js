const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

/**
 * Verify slip using Slip2Go API
 * @param {string} filePath - Path to the slip image file
 * @param {string} apiKey - Slip2Go API Key
 * @param {string} branchId - Slip2Go Branch ID
 * @param {number} expectedAmount - Expected transaction amount
 * @returns {Promise<{success: boolean, data?: object, message?: string}>}
 */


/**
 * Verify slip using Slip2Go API
 * @param {string} filePath - Path to the slip image file
 * @param {string} apiKey - Slip2Go API Key
 * @param {string} branchId - Slip2Go Branch ID
 * @param {number} expectedAmount - Expected transaction amount
 * @param {string} expectedReceiverNumber - Expected receiver account number (PromptPay/Account Number)
 * @returns {Promise<{success: boolean, data?: object, message?: string}>}
 */
const verifySlip2Go = async (filePath, apiKey, expectedAmount, expectedReceiverNumber = null) => {
    const path = require('path');
    try {
        const absolutePath = path.resolve(filePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Slip file not found at ${absolutePath}`);
        }

        const formData = new FormData();
        formData.append('file', fs.createReadStream(absolutePath), {
            filename: 'slip.jpg',
            contentType: 'image/jpeg',
        });

        // Construct payload object
        const payload = {
            checkDuplicate: true,
            checkAmount: {
                type: 'eq',
                amount: Number(expectedAmount)
            }
        };



        formData.append('payload', JSON.stringify(payload));

        const response = await axios.post(`https://connect.slip2go.com/api/verify-slip/qr-image/info`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${apiKey}`,
            }
        });

        const data = response.data;

        // User specific response structure: { code: '200000' or '200200', message: 'Slip is valid.', ... }
        if (data && (data.code === '200000' || data.code === '200200')) {
            const slipData = data.data;
            const amount = slipData.amount || 0;

            // 1. Check Amount Strictness
            // Use loose equality for float safe buffer or strict? 
            // User said: "Amount matches package". 
            // Usually >= is safer for small diffs, but let's do close match.
            if (parseFloat(amount) < parseFloat(expectedAmount)) {
                return {
                    success: false,
                    message: `ยอดเงินไม่ถูกต้อง (สลิป: ${amount}, ต้องการ: ${expectedAmount})`
                };
            }

            return { success: true, data: slipData };
        }

        return {
            success: false,
            message: data.message || 'ไม่พบข้อมูลสลิปที่ถูกต้อง (Verification Failed)'
        };

    } catch (error) {
        console.error('Slip2Go Error:', error.response ? error.response.data : error.message);
        return {
            success: false,
            message: error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ (Connection Error)'
        };
    }
};

module.exports = { verifySlip2Go };
