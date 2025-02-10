const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());
const GHL_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6IjhvaFozbzR6Y2xhZ0tQaFpWMjFrIiwidmVyc2lvbiI6MSwiaWF0IjoxNzI4ODQ4NzE0Nzg4LCJzdWIiOiJSdW1ZWDNCRXBQT0VkRERPSTA2ViJ9.iJhME3wcuxqEZcJPJzzW3de1ylwtTG_Egf595_lCcZY';
const GHL_BASE_URL = 'https://rest.gohighlevel.com/v1';
app.use((req, res, next) => {
   console.log(`Received request body: ${JSON.stringify(req.body)}`);
   next();
});
app.post('/decode-vin', async (req, res) => {
   try {
       // Log full request details for debugging
       console.log('Full request details:', JSON.stringify(req.body, null, 2));
       
       // Check if body exists and has required fields
       if (!req.body || !req.body.id || !req.body.vin_of_trade) {
           console.error('Invalid request: Missing required fields');
           return res.status(400).json({ 
               success: false, 
               error: 'Invalid request: Missing contact information' 
           });
       }
       
       const contact_id = req.body.id;
       const vin_of_trade = req.body.vin_of_trade;
       
       // Additional validation
       if (vin_of_trade === 'null' || !vin_of_trade) {
           console.error('Invalid VIN');
           return res.status(400).json({ 
               success: false, 
               error: 'Invalid or missing VIN' 
           });
       }
       
       console.log(`Decoding VIN: ${vin_of_trade} for contact: ${contact_id}`);
       
       const vinData = await decodeVIN(vin_of_trade);
       const updateResult = await updateGHLContact(contact_id, vinData);
       
       console.log(`Successfully processed VIN for contact ${contact_id}`);
       
       res.json({ 
           success: true, 
           data: vinData,
           updateResult: updateResult
       });
   } catch (error) {
       console.error(`Comprehensive error processing VIN: ${error.message}`);
       console.error('Full error:', error);
       
       res.status(500).json({ 
           success: false, 
           error: error.message,
           details: error.response ? error.response.data : null 
       });
   }
});
async function decodeVIN(vin) {
   try {
       const response = await axios.get(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`);
       const results = response.data.Results;
       
       const extractResult = (variableName) => 
           results.find(item => item.Variable === variableName)?.Value || null;

       return {
           'year_of_trade': extractResult('Model Year'),
           'make_of_trade': extractResult('Make'),
           'model_of_trade': extractResult('Model'),
           'trade_in_trim': extractResult('Trim')
       };
   } catch (error) {
       console.error('NHTSA VIN Decode Error:', error);
       throw error;
   }
}
async function updateGHLContact(contactId, vehicleData) {
   try {
       const response = await axios.put(
           `${GHL_BASE_URL}/contacts/${contactId}`,
           { customField: vehicleData },
           { 
               headers: { 
                   'Authorization': `Bearer ${GHL_API_KEY}`,
                   'Content-Type': 'application/json'
               } 
           }
       );
       return response.data;
   } catch (error) {
       console.error('GHL Update Error:', error.response ? error.response.data : error.message);
       throw error;
   }
}
   }
}
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
   console.log(`Server running on port ${PORT}`);
});
