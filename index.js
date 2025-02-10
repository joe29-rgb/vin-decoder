async function decodeVIN(vin) {
   try {
       const response = await axios.get(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`);
       const results = response.data.Results;
       
       // Enhanced logging for debugging
       console.log('Full VIN Decode Results:', JSON.stringify(results, null, 2));

       // Original logic with added logging
       const year = results.find(item => item.Variable === 'Model Year')?.Value || null;
       const make = results.find(item => item.Variable === 'Make')?.Value || null;
       const model = results.find(item => item.Variable === 'Model')?.Value || null;
       const trim = results.find(item => item.Variable === 'Trim')?.Value || null;

       // Log each extracted value
       console.log('Extracted Values:', {
           year: year,
           make: make,
           model: model,
           trim: trim
       });

       return {
           year_of_trade: year,
           make_of_trade: make,
           model_of_trade: model,
           trade_in_trim: trim
       };
   } catch (error) {
       console.error('NHTSA VIN Decode Error:', error);
       throw error;
   }
}
