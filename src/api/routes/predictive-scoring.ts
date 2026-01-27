import { Router, Request, Response } from 'express';
import { scoreInventory } from '../../modules/approvals-engine';
import { fetchInventoryFromSupabase } from '../../modules/supabase';
import { ApprovalSpec, TradeInfo } from '../../types/types';
import { getLenderProgram } from '../../modules/lender-programs';

const router = Router();

/**
 * POST /api/predictive-scoring/analyze
 * Proactive inventory profit analysis - scores all inventory against multiple lender programs
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const dealershipId = req.dealershipId;
    
    if (!dealershipId) {
      return res.status(401).json({
        success: false,
        error: 'Dealership context required'
      });
    }

    // Fetch inventory
    const inventory = await fetchInventoryFromSupabase(dealershipId);
    
    if (!inventory || inventory.length === 0) {
      return res.json({
        success: true,
        analysis: [],
        message: 'No inventory available'
      });
    }

    // Define common approval scenarios to test
    const testScenarios = [
      { bank: 'TD', program: '4-Key', paymentMax: 900 },
      { bank: 'TD', program: '5-Key', paymentMax: 800 },
      { bank: 'Santander', program: 'Tier6', paymentMax: 850 },
      { bank: 'SDA', program: 'Star5', paymentMax: 900 },
    ];

    const analysis: any[] = [];

    // Score each vehicle against all scenarios
    for (const vehicle of inventory.slice(0, 50)) { // Limit to 50 vehicles for performance
      const vehicleAnalysis: any = {
        vehicleId: vehicle.id,
        vin: vehicle.vin,
        title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        imageUrl: vehicle.imageUrl,
        scenarios: []
      };

      for (const scenario of testScenarios) {
        const lenderProgram = getLenderProgram(scenario.bank as any, scenario.program);
        
        if (!lenderProgram) continue;

        const approvalSpec: ApprovalSpec = {
          bank: scenario.bank,
          program: scenario.program,
          apr: lenderProgram.rate,
          termMonths: lenderProgram.maxTerm || 84,
          paymentMin: 0,
          paymentMax: scenario.paymentMax,
          downPayment: 0,
          province: 'AB'
        };

        const tradeInfo: TradeInfo = {
          allowance: 0,
          acv: 0,
          lienBalance: 0
        };

        const scoredRows = scoreInventory([vehicle], approvalSpec, tradeInfo);
        
        if (scoredRows.length > 0) {
          const result = scoredRows[0];
          vehicleAnalysis.scenarios.push({
            bank: scenario.bank,
            program: scenario.program,
            paymentMax: scenario.paymentMax,
            totalGross: result.totalGross,
            monthlyPayment: result.monthlyPayment,
            salePrice: result.salePrice,
            compliant: result.flags.length === 0,
            flags: result.flags
          });
        }
      }

      // Calculate best scenario
      const compliantScenarios = vehicleAnalysis.scenarios.filter((s: any) => s.compliant);
      if (compliantScenarios.length > 0) {
        const bestScenario = compliantScenarios.sort((a: any, b: any) => b.totalGross - a.totalGross)[0];
        vehicleAnalysis.bestScenario = bestScenario;
        vehicleAnalysis.maxGross = bestScenario.totalGross;
      } else {
        vehicleAnalysis.maxGross = 0;
      }

      analysis.push(vehicleAnalysis);
    }

    // Sort by max gross potential
    analysis.sort((a, b) => b.maxGross - a.maxGross);

    res.json({
      success: true,
      analysis: analysis.slice(0, 20), // Return top 20
      totalAnalyzed: analysis.length,
      scenariosTested: testScenarios.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/predictive-scoring/recommendations
 * Get recommended vehicles to prioritize based on profit potential
 */
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const dealershipId = req.dealershipId;
    
    if (!dealershipId) {
      return res.status(401).json({
        success: false,
        error: 'Dealership context required'
      });
    }

    // Fetch inventory
    const inventory = await fetchInventoryFromSupabase(dealershipId);
    
    if (!inventory || inventory.length === 0) {
      return res.json({
        success: true,
        recommendations: [],
        message: 'No inventory available'
      });
    }

    const recommendations: any[] = [];

    // Analyze inventory characteristics
    for (const vehicle of inventory) {
      const grossPotential = vehicle.suggestedPrice - vehicle.yourCost;
      const margin = vehicle.yourCost > 0 ? (grossPotential / vehicle.yourCost) * 100 : 0;
      const age = new Date().getFullYear() - vehicle.year;
      
      let priority = 'low';
      let reasons: string[] = [];
      
      // High margin
      if (margin > 25) {
        priority = 'high';
        reasons.push(`${margin.toFixed(1)}% margin`);
      }
      
      // New vehicle (2024-2026) - gets 96-month terms
      if (vehicle.year >= 2024 && vehicle.year <= 2026) {
        priority = 'high';
        reasons.push('96-month term eligible');
      }
      
      // Low mileage
      if (vehicle.mileage < 50000 && age < 5) {
        if (priority !== 'high') priority = 'medium';
        reasons.push('Low mileage');
      }
      
      // High gross potential
      if (grossPotential > 5000) {
        priority = 'high';
        reasons.push(`$${grossPotential.toFixed(0)} gross potential`);
      }

      if (priority !== 'low') {
        recommendations.push({
          vehicleId: vehicle.id,
          vin: vehicle.vin,
          title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
          imageUrl: vehicle.imageUrl,
          priority,
          reasons,
          grossPotential,
          margin,
          suggestedPrice: vehicle.suggestedPrice,
          yourCost: vehicle.yourCost
        });
      }
    }

    // Sort by priority then gross potential
    const priorityOrder: any = { high: 3, medium: 2, low: 1 };
    recommendations.sort((a, b) => {
      if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.grossPotential - a.grossPotential;
    });

    res.json({
      success: true,
      recommendations: recommendations.slice(0, 20),
      totalRecommendations: recommendations.length,
      highPriority: recommendations.filter(r => r.priority === 'high').length,
      mediumPriority: recommendations.filter(r => r.priority === 'medium').length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
