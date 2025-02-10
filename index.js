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
       if (!req.body || !req.body.contact) {
           console.error('Invalid request: Missing contact information');
           return res.status(400).json({ 
               success: false, 
               error: 'Invalid request: Missing contact information' 
           });
       }

       const { id: contact_id, vin_of_trade } = req.body.contact;
       
       if (!contact_id) {
           console.error('Invalid contact ID');
           return res.status(422).json({ 
               success: false, 
               error: 'Invalid contact ID' 
           });
       }

       if (!vin_of_trade) {
           console.error('No VIN provided');
           return res.status(400).json({ 
               success: false, 
               error: 'No VIN provided' 
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
       
       return {
           year_of_trade: results.find(item => item.Variable === 'Model Year')?.Value || null,
           make_of_trade: results.find(item => item.Variable === 'Make')?.Value || null,
           model_of_trade: results.find(item => item.Variable === 'Model')?.Value || null,
           trade_in_trim: results.find(item => item.Variable === 'Trim')?.Value || null
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
   console.log(`Server running on port ${PORT}`);
});
