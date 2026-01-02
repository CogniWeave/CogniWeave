#!/usr/bin/env node

/**
 * Validation script for AI Workflow Optimization setup
 * Checks API keys, dependencies, and connectivity
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('\n🔍 Autopattern Optimization Setup Validator\n');
console.log('═'.repeat(50));

let errors = [];
let warnings = [];
let success = [];

// ---- 1. Check .env file ----
console.log('\n1️⃣  Checking configuration...');

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
    errors.push('❌ .env file not found');
    console.log('   ❌ .env file not found');
    console.log('   Solution: cp .env.example .env');
} else {
    console.log('   ✅ .env file exists');
    success.push('Environment file found');

    const envContent = fs.readFileSync(envPath, 'utf-8');
    
    if (!envContent.includes('GROQ_API_KEY') || envContent.includes('GROQ_API_KEY=your_')) {
        warnings.push('⚠️  GROQ_API_KEY not configured');
        console.log('   ⚠️  GROQ_API_KEY not set or has placeholder value');
    } else {
        console.log('   ✅ GROQ_API_KEY configured');
        success.push('Groq API key set');
    }

    if (!envContent.includes('GEMINI_API_KEY') || envContent.includes('GEMINI_API_KEY=your_')) {
        warnings.push('⚠️  GEMINI_API_KEY not configured');
        console.log('   ⚠️  GEMINI_API_KEY not set or has placeholder value');
    } else {
        console.log('   ✅ GEMINI_API_KEY configured');
        success.push('Gemini API key set');
    }
}

// ---- 2. Check node_modules ----
console.log('\n2️⃣  Checking dependencies...');

const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
    errors.push('❌ node_modules not found');
    console.log('   ❌ Dependencies not installed');
    console.log('   Solution: npm install');
} else {
    const requiredModules = [
        'express',
        'cors',
        'dotenv',
        '@google/generative-ai',
        'axios'
    ];

    let allInstalled = true;
    requiredModules.forEach(mod => {
        const modPath = path.join(nodeModulesPath, mod);
        if (fs.existsSync(modPath)) {
            console.log(`   ✅ ${mod}`);
        } else {
            console.log(`   ❌ ${mod} missing`);
            allInstalled = false;
        }
    });

    if (allInstalled) {
        success.push('All dependencies installed');
    } else {
        errors.push('❌ Some dependencies missing');
    }
}

// ---- 3. Check files ----
console.log('\n3️⃣  Checking backend files...');

const requiredFiles = [
    { path: 'server.js', name: 'Main server' },
    { path: 'agents/intentExtractor.js', name: 'Intent Extractor agent' },
    { path: 'agents/workflowOptimizer.js', name: 'Optimizer agent' },
    { path: 'routes/optimization.js', name: 'Optimization endpoint' },
];

requiredFiles.forEach(file => {
    const fullPath = path.join(__dirname, file.path);
    if (fs.existsSync(fullPath)) {
        console.log(`   ✅ ${file.name}`);
        success.push(`${file.name} exists`);
    } else {
        console.log(`   ❌ ${file.name} missing`);
        errors.push(`Missing: ${file.path}`);
    }
});

// ---- 4. Check frontend changes ----
console.log('\n4️⃣  Checking frontend changes...');

const dashboardPath = path.join(__dirname, '..', 'extension', 'src', 'ui', 'dashboard.js');
if (fs.existsSync(dashboardPath)) {
    const content = fs.readFileSync(dashboardPath, 'utf-8');
    if (content.includes('optimizeWorkflow')) {
        console.log('   ✅ Dashboard.js has optimize function');
        success.push('Frontend updated');
    } else {
        console.log('   ❌ Dashboard.js missing optimize function');
        warnings.push('Frontend may not be updated');
    }
} else {
    console.log('   ⚠️  Dashboard.js not found');
}

// ---- Results ----
console.log('\n═'.repeat(50));
console.log('\n📊 Summary:\n');

if (success.length > 0) {
    console.log(`✅ Success (${success.length}):`);
    success.forEach(s => console.log(`   • ${s}`));
}

if (warnings.length > 0) {
    console.log(`\n⚠️  Warnings (${warnings.length}):`);
    warnings.forEach(w => console.log(`   • ${w}`));
}

if (errors.length > 0) {
    console.log(`\n❌ Errors (${errors.length}):`);
    errors.forEach(e => console.log(`   • ${e}`));
}

// ---- Recommendations ----
console.log('\n💡 Next Steps:\n');

if (errors.length === 0 && warnings.length === 0) {
    console.log('🎉 Everything looks good!');
    console.log('   1. Start backend: npm run dev');
    console.log('   2. Load extension in Chrome');
    console.log('   3. Record a workflow');
    console.log('   4. Click Optimize button');
} else {
    console.log('⚠️  Please fix the issues above:');
    if (errors.some(e => e.includes('node_modules'))) {
        console.log('   • Run: npm install');
    }
    if (errors.some(e => e.includes('.env'))) {
        console.log('   • Run: cp .env.example .env');
        console.log('   • Edit .env with your API keys');
    }
    if (warnings.some(w => w.includes('API_KEY'))) {
        console.log('   • Get API keys from:');
        console.log('     - Groq: https://console.groq.com');
        console.log('     - Gemini: https://aistudio.google.com/apikey');
    }
}

console.log('\n📖 Documentation:');
console.log('   • Setup Guide: OPTIMIZATION_SETUP.md');
console.log('   • Quick Start: QUICK_START.md');
console.log('   • Backend Docs: backend/README.md');
console.log('\n' + '═'.repeat(50) + '\n');

// Exit with error code if there are blocking errors
process.exit(errors.length > 0 ? 1 : 0);
