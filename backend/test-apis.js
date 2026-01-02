#!/usr/bin/env node

/**
 * Quick test to verify Groq and Gemini APIs work
 */

import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log('\n🧪 Testing AI APIs...\n');

// Test Groq
async function testGroq() {
    console.log('Testing Groq API...');
    try {
        const response = await axios.post('https://api.groq.com/v1/chat/completions', {
            model: 'mixtral-8x7b-32768',
            messages: [
                { role: 'user', content: 'Say hello in one word' }
            ],
            max_tokens: 100
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Groq API works!');
        console.log(`   Response: ${response.data.choices[0].message.content}`);
        return true;
    } catch (error) {
        console.error('❌ Groq API failed:', error.response?.status, error.response?.data?.error || error.message);
        return false;
    }
}

// Test Gemini
async function testGemini() {
    console.log('\nTesting Gemini API...');
    try {
        const client = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = client.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent('Say hello in one word');
        
        console.log('✅ Gemini API works!');
        console.log(`   Response: ${result.response.text()}`);
        return true;
    } catch (error) {
        console.error('❌ Gemini API failed:', error.message);
        return false;
    }
}

async function runTests() {
    const groqOk = await testGroq();
    const geminiOk = await testGemini();
    
    console.log('\n' + '='.repeat(50));
    console.log('Results:');
    console.log(`  Groq:  ${groqOk ? '✅' : '❌'}`);
    console.log(`  Gemini: ${geminiOk ? '✅' : '❌'}`);
    console.log('='.repeat(50) + '\n');
    
    process.exit(groqOk && geminiOk ? 0 : 1);
}

runTests();
