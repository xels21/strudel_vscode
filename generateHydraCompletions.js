const fs = require('fs');
const path = require('path');

// Read the hydra functions file
const hydraFunctionsPath = path.join(__dirname, 'hydra', 'node_modules', 'hydra-synth', 'src', 'glsl', 'glsl-functions.js');

if (!fs.existsSync(hydraFunctionsPath)) {
    console.error('Hydra functions file not found. Please ensure hydra dependencies are installed.');
    process.exit(1);
}

const functionsCode = fs.readFileSync(hydraFunctionsPath, 'utf8');

// Parse the export default function to extract the array
let functions;
try {
    // Use a simpler approach - the file exports a function that returns an array
    // Let's extract the array directly by finding the pattern
    const arrayMatch = functionsCode.match(/export default \(\) => (\[[\s\S]*\])/);
    if (arrayMatch) {
        const arrayString = arrayMatch[1];
        // Safely evaluate the array
        functions = eval(arrayString);
    } else {
        throw new Error('Could not find function array in export');
    }
} catch (error) {
    console.error('Failed to parse hydra functions:', error);
    console.log('Trying alternative parsing method...');
    
    // Alternative: try to import it as ES module
    try {
        // Extract just the array part manually
        const lines = functionsCode.split('\n');
        let inArray = false;
        let arrayLines = [];
        let braceCount = 0;
        
        for (const line of lines) {
            if (line.includes('export default () => [')) {
                inArray = true;
                arrayLines.push('[');
                continue;
            }
            if (inArray) {
                arrayLines.push(line);
                if (line.includes('{')) braceCount++;
                if (line.includes('}') && braceCount > 0) braceCount--;
                if (line.includes(']') && braceCount === 0) break;
            }
        }
        
        const arrayCode = arrayLines.join('\n');
        functions = eval(arrayCode);
    } catch (altError) {
        console.error('Alternative parsing also failed:', altError);
        process.exit(1);
    }
}

// Extract completion data
const completionData = {
    functions: [],
    lastGenerated: new Date().toISOString()
};

for (const func of functions) {
    if (!func.name) continue;

    const entry = {
        name: func.name,
        description: `Hydra ${func.type} function` + (func.description ? `: ${func.description}` : ''),
        type: func.type || 'unknown',
        params: func.inputs ? func.inputs.map(input => ({
            name: input.name,
            type: input.type || 'float',
            description: `${input.name} parameter`,
            default: input.default
        })) : [],
        examples: [],
        category: 'hydra'
    };

    completionData.functions.push(entry);
}

// Add some common Hydra output and setup functions
const commonHydraFunctions = [
    {
        name: 'out',
        description: 'Output to buffer (o0, o1, o2, o3)',
        type: 'output',
        params: [{
            name: 'buffer',
            type: 'output',
            description: 'Output buffer (o0, o1, o2, o3)',
            default: 'o0'
        }],
        examples: ['.out(o0)', '.out()'],
        category: 'hydra'
    },
    {
        name: 'render',
        description: 'Render all outputs',
        type: 'utility',
        params: [],
        examples: ['render()'],
        category: 'hydra'
    },
    {
        name: 'hush',
        description: 'Clear all outputs',
        type: 'utility', 
        params: [],
        examples: ['hush()'],
        category: 'hydra'
    },
    {
        name: 'setResolution',
        description: 'Set canvas resolution',
        type: 'utility',
        params: [{
            name: 'width',
            type: 'float',
            description: 'Width in pixels',
            default: 1920
        }, {
            name: 'height',
            type: 'float',
            description: 'Height in pixels',
            default: 1080
        }],
        examples: ['setResolution(1920, 1080)'],
        category: 'hydra'
    },
    {
        name: 'time',
        description: 'Global time variable',
        type: 'variable',
        params: [],
        examples: ['osc(10, 0.1, () => time * 0.1)'],
        category: 'hydra'
    }
];

completionData.functions.push(...commonHydraFunctions);

// Sort functions alphabetically
completionData.functions.sort((a, b) => a.name.localeCompare(b.name));

// Write hydra completion data
const outputPath = path.join(__dirname, 'src', 'hydraCompletions.json');
fs.writeFileSync(outputPath, JSON.stringify(completionData, null, 2));

console.log(`Generated Hydra completion data for ${completionData.functions.length} functions`);
console.log(`Saved to: ${outputPath}`);

// Show some sample functions
console.log('\nSample functions extracted:');
completionData.functions.slice(0, 10).forEach(func => {
    console.log(`- ${func.name} (${func.type}): ${func.description}`);
});