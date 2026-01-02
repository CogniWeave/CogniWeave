/**
 * Agent 1: Intent Extraction
 * 
 * Uses a free LLM API (Groq LLaMA-3) to:
 * 1. Extract semantic intent from raw browser events
 * 2. Identify the end goal of the workflow
 * 3. Return structured steps and goal
 */

import axios from 'axios';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Converts raw browser events to a natural language description
 */
function eventsToDescription(events) {
    if (!events || events.length === 0) {
        return 'No events recorded';
    }

    const eventSummary = events.map((event, idx) => {
        const type = event.type || 'unknown';
        const target = event.target?.tagName || 'element';
        const text = event.target?.innerText || event.target?.textContent || '';
        const value = event.value || '';
        
        let description = `Event ${idx + 1}: ${type} on ${target}`;
        if (text) description += ` with text "${text.substring(0, 50)}"`;
        if (value) description += ` value="${value.substring(0, 50)}"`;
        
        return description;
    }).join('\n');

    return eventSummary;
}

/**
 * Extracts intent and goal from raw events using Groq LLaMA-3
 */
export async function extractIntentFromEvents(events) {
    if (!GROQ_API_KEY) {
        console.warn('⚠️  GROQ_API_KEY not configured, using fallback');
        return generateFallbackIntent(events);
    }

    const eventDescription = eventsToDescription(events);

    const systemPrompt = `You are an expert UI/UX analyst. Analyze browser events and extract:
1. The semantic intent of each logical step
2. The overall end goal

Return ONLY valid JSON:
{
  "goal": "end goal",
  "steps": ["step 1", "step 2"]
}`;

    const userPrompt = `Analyze these browser events:\n\n${eventDescription}`;

    try {
        const response = await axios.post(GROQ_API_URL, {
            model: 'mixtral-8x7b-32768',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.3,
            max_tokens: 1000
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        const content = response.data.choices[0].message.content.trim();
        
        // Parse the JSON response
        const result = JSON.parse(content);
        
        if (!result.goal || !Array.isArray(result.steps)) {
            throw new Error('Invalid response format from Agent 1');
        }

        return result;

    } catch (error) {
        console.error('❌ Intent Extraction failed:', error.response?.status, error.response?.data?.error || error.message);
        console.log('📦 Using fallback intent extraction');
        return generateFallbackIntent(events);
    }
}

/**
 * Fallback intent extraction when API fails
 */
function generateFallbackIntent(events) {
    const steps = [];
    const eventTypes = {};
    
    // Count event types
    events.forEach(event => {
        eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
    });

    // Generate steps based on event patterns
    if (eventTypes.click) {
        steps.push('Navigate to target element');
    }
    if (eventTypes.input || eventTypes.change) {
        steps.push('Enter or modify data');
    }
    if (eventTypes.submit) {
        steps.push('Submit form');
    }
    if (eventTypes.scroll) {
        steps.push('Scroll through content');
    }

    if (steps.length === 0) {
        steps.push('User interaction with page');
    }

    return {
        goal: 'Complete workflow task',
        steps: steps.slice(0, 10)
    };
}

export default { extractIntentFromEvents };
