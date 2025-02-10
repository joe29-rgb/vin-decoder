const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const GHL_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6IjhvaFozbzR6Y2xhZ0tQaFpWMjFrIiwidmVyc2lvbiI6MSwiaWF0IjoxNzI4ODQ4NzE0Nzg4LCJzdWIiOiJSdW1ZWDNCRXBQT0VkRERPSTA2ViJ9.iJhME3wcuxqEZcJPJzzW3de1ylwtTG_Egf595_lCcZY';
const GHL_BASE_URL = 'https://rest.gohighlevel.com/v1';

app.post('/decode-vin', async (req, res) => {
    try {
        const { contact_id, vin_of_trade } = req.body;
        const vinData = await decodeVIN(vin_of_trade);
        await updateGHLContact(contact_id, vinData);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

async function decodeVIN(vin) {
    const response = await axios.get(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`);
    const results = response.data.Results;
    return {
        year_of_trade: results.find(item => item.Variable === 'Model Year')?.Value,
        make_of_trade: results.find(item => item.Variable === 'Make')?.Value,
        model_of_trade: results.find(item => item.Variable === 'Model')?.Value,
        trade_in_trim: results.find(item => item.Variable === 'Trim')?.Value
    };
}

async function updateGHLContact(contactId, vehicleData) {
    await axios.put(
        `${GHL_BASE_URL}/contacts/${contactId}`,
        { customField: vehicleData },
        { headers: { 'Authorization': `Bearer ${GHL_API_KEY}` } }
    );
}

app.listen(3000);
