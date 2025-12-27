/**
 * EXPRESS SERVER ENTRY POINT
 * Starts Finance-in-a-Box API server
 */

import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import router from './api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', router);

app.get('/health', (req, res) => {
  res.json({ status: 'Finance-in-a-Box API is running' });
});

app.listen(PORT, () => {
  console.log(`✅ Finance-in-a-Box API listening on port ${PORT}`);
  console.log(`📊 Endpoints:`);
  console.log(`   POST   /api/deals/find         - Find best deals`);
  console.log(`   GET    /api/lenders            - List all lenders`);
  console.log(`   POST   /api/inventory/upload   - Upload CSV inventory`);
  console.log(`   GET    /api/inventory          - Get current inventory`);
  console.log(`   POST   /api/deals/save-to-ghl  - Save to GoHighLevel`);
});

export default app;
