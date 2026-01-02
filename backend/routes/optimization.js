/**
 * POST /optimize-workflow
 * 
 * Orchestrates the two-agent workflow optimization pipeline:
 * 1. Agent 1 (Intent Extraction): Extract goal and semantic steps from raw events
 * 2. Agent 2 (Workflow Optimization): Suggest optimized workflow
 */

import { extractIntentFromEvents } from '../agents/intentExtractor.js';
import { optimizeWorkflow } from '../agents/workflowOptimizer.js';

export async function optimizeWorkflowHandler(req, res) {
    try {
        const { workflowId, workflowName, events } = req.body;

        // Validation
        if (!events || !Array.isArray(events)) {
            return res.status(400).json({
                error: 'Invalid request: events must be an array'
            });
        }

        if (events.length === 0) {
            return res.status(400).json({
                error: 'Cannot optimize empty workflow'
            });
        }

        console.log(`\n🔍 Optimizing workflow: "${workflowName}" (${events.length} events)`);

        // ---------- AGENT 1: Extract Intent ----------
        console.log('📍 Agent 1: Extracting intent from events...');
        
        const intentResult = await extractIntentFromEvents(events);
        
        console.log(`✅ Agent 1 Result:`);
        console.log(`   Goal: ${intentResult.goal}`);
        console.log(`   Steps extracted: ${intentResult.steps.length}`);

        // ---------- AGENT 2: Optimize Workflow ----------
        console.log('🎯 Agent 2: Optimizing workflow...');
        
        const optimizationResult = await optimizeWorkflow(
            intentResult.goal,
            intentResult.steps
        );
        
        console.log(`✅ Agent 2 Result:`);
        console.log(`   Original steps: ${optimizationResult.originalSteps.length}`);
        console.log(`   Optimized steps: ${optimizationResult.optimizedSteps.length}`);
        console.log(`   Removed steps: ${optimizationResult.removedSteps.length}`);
        console.log(`   Confidence: ${optimizationResult.confidence}%`);

        // ---------- Return Combined Result ----------
        const response = {
            workflowId: workflowId,
            workflowName: workflowName,
            goal: intentResult.goal,
            originalSteps: optimizationResult.originalSteps,
            optimizedSteps: optimizationResult.optimizedSteps,
            removedSteps: optimizationResult.removedSteps,
            explanation: optimizationResult.explanation,
            confidence: optimizationResult.confidence,
            optimization: {
                stepReduction: (
                    (1 - optimizationResult.optimizedSteps.length / optimizationResult.originalSteps.length) * 100
                ).toFixed(1)
            },
            timestamp: new Date().toISOString()
        };

        console.log(`\n✨ Optimization complete!`);
        console.log(`   Step reduction: ${response.optimization.stepReduction}%\n`);

        return res.json(response);

    } catch (error) {
        console.error('Optimization handler error:', error);
        
        return res.status(500).json({
            error: 'Workflow optimization failed',
            message: error.message,
            details: error.response?.data || null
        });
    }
}

export default { optimizeWorkflowHandler };
