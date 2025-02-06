from flask import Flask, request, jsonify
import requests
import os

app = Flask(__name__)

@app.route('/decode-vin', methods=['POST'])
def decode_vin():
    print("Webhook received:", request.json)
    
    GHL_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6IjhvaFozbzR6Y2xhZ0tQaFpWMjFrIiwidmVyc2lvbiI6MSwiaWF0IjoxNzI4ODQ4NzE0Nzg4LCJzdWIiOiJSdW1ZWDNCRXBQT0VkRERPSTA2ViJ9.iJhME3wcuxqEZcJPJzzW3de1ylwtTG_Egf595_lCcZY'
    
    data = request.json
    vin = data['contact']['vin_of_trade']
    contact_id = data['contact']['id']
    
    nhtsa_url = f"https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/{vin}?format=json"
    vehicle_data = requests.get(nhtsa_url).json()
    results = vehicle_data['Results']
    
    update_data = {
        'customField': {
            'year_of_trade': next((item['Value'] for item in results if item['Variable'] == 'Model Year'), None),
            'make_of_trade': next((item['Value'] for item in results if item['Variable'] == 'Make'), None),
            'model_of_trade': next((item['Value'] for item in results if item['Variable'] == 'Model'), None),
            'trade_in_trim': next((item['Value'] for item in results if item['Variable'] == 'Trim'), None)
        }
    }
    
    headers = {'Authorization': f'Bearer {GHL_API_KEY}'}
    ghl_url = f'https://rest.gohighlevel.com/v1/contacts/{contact_id}'
    response = requests.put(ghl_url, headers=headers, json=update_data)
    
    return jsonify({"status": "success"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)
