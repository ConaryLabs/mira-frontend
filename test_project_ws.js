// test_project_ws.js
// Test script for Phase 4: Project Management via WebSocket
// Run with: node test_project_ws.js

import WebSocket from 'ws';

const WS_URL = 'ws://localhost:3001/ws';

// Test data
let testProjectId = null;
let testArtifactId = null;

// Color output for better readability
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Connect to WebSocket
function connectWebSocket() {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_URL);
        
        ws.on('open', () => {
            log('✅ Connected to WebSocket', 'green');
            resolve(ws);
        });
        
        ws.on('error', (error) => {
            log(`❌ WebSocket error: ${error}`, 'red');
            reject(error);
        });
    });
}

// Send message and wait for response
function sendMessage(ws, message) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Response timeout'));
        }, 5000);
        
        const handler = (data) => {
            clearTimeout(timeout);
            ws.removeListener('message', handler);
            
            try {
                const response = JSON.parse(data);
                resolve(response);
            } catch (e) {
                reject(e);
            }
        };
        
        ws.on('message', handler);
        
        log(`\n📤 Sending: ${JSON.stringify(message, null, 2)}`, 'blue');
        ws.send(JSON.stringify(message));
    });
}

// Test functions
async function testCreateProject(ws) {
    log('\n=== Testing Project Creation ===', 'magenta');
    
    const message = {
        type: 'project_command',
        method: 'project.create',
        params: {
            name: 'Test Project ' + Date.now(),
            description: 'A test project created via WebSocket',
            tags: ['test', 'websocket', 'phase4']
        }
    };
    
    const response = await sendMessage(ws, message);
    log(`📥 Response: ${JSON.stringify(response, null, 2)}`, 'yellow');
    
    if (response.data && response.data.project) {
        testProjectId = response.data.project.id;
        log(`✅ Project created with ID: ${testProjectId}`, 'green');
        return true;
    }
    
    log('❌ Failed to create project', 'red');
    return false;
}

async function testListProjects(ws) {
    log('\n=== Testing Project List ===', 'magenta');
    
    const message = {
        type: 'project_command',
        method: 'project.list',
        params: {}
    };
    
    const response = await sendMessage(ws, message);
    log(`📥 Response: ${JSON.stringify(response, null, 2)}`, 'yellow');
    
    if (response.data && response.data.projects) {
        log(`✅ Found ${response.data.projects.length} projects`, 'green');
        return true;
    }
    
    log('❌ Failed to list projects', 'red');
    return false;
}

async function testGetProject(ws) {
    log('\n=== Testing Get Project ===', 'magenta');
    
    if (!testProjectId) {
        log('⚠️  No project ID to test with', 'yellow');
        return false;
    }
    
    const message = {
        type: 'project_command',
        method: 'project.get',
        params: {
            id: testProjectId
        }
    };
    
    const response = await sendMessage(ws, message);
    log(`📥 Response: ${JSON.stringify(response, null, 2)}`, 'yellow');
    
    if (response.data && response.data.project) {
        log(`✅ Retrieved project: ${response.data.project.name}`, 'green');
        return true;
    }
    
    log('❌ Failed to get project', 'red');
    return false;
}

async function testUpdateProject(ws) {
    log('\n=== Testing Update Project ===', 'magenta');
    
    if (!testProjectId) {
        log('⚠️  No project ID to test with', 'yellow');
        return false;
    }
    
    const message = {
        type: 'project_command',
        method: 'project.update',
        params: {
            id: testProjectId,
            name: 'Updated Test Project',
            tags: ['updated', 'modified', 'phase4']
        }
    };
    
    const response = await sendMessage(ws, message);
    log(`📥 Response: ${JSON.stringify(response, null, 2)}`, 'yellow');
    
    if (response.data && response.data.project) {
        log(`✅ Project updated: ${response.data.project.name}`, 'green');
        return true;
    }
    
    log('❌ Failed to update project', 'red');
    return false;
}

async function testCreateArtifact(ws) {
    log('\n=== Testing Artifact Creation ===', 'magenta');
    
    if (!testProjectId) {
        log('⚠️  No project ID to test with', 'yellow');
        return false;
    }
    
    const message = {
        type: 'project_command',
        method: 'artifact.create',
        params: {
            project_id: testProjectId,
            name: 'Test Artifact',
            artifact_type: 'code',
            content: '// This is a test artifact\nconsole.log("Hello from WebSocket!");'
        }
    };
    
    const response = await sendMessage(ws, message);
    log(`📥 Response: ${JSON.stringify(response, null, 2)}`, 'yellow');
    
    if (response.data && response.data.artifact) {
        testArtifactId = response.data.artifact.id;
        log(`✅ Artifact created with ID: ${testArtifactId}`, 'green');
        return true;
    }
    
    log('❌ Failed to create artifact', 'red');
    return false;
}

async function testListArtifacts(ws) {
    log('\n=== Testing List Artifacts ===', 'magenta');
    
    if (!testProjectId) {
        log('⚠️  No project ID to test with', 'yellow');
        return false;
    }
    
    const message = {
        type: 'project_command',
        method: 'artifact.list',
        params: {
            project_id: testProjectId
        }
    };
    
    const response = await sendMessage(ws, message);
    log(`📥 Response: ${JSON.stringify(response, null, 2)}`, 'yellow');
    
    if (response.data && response.data.artifacts) {
        log(`✅ Found ${response.data.artifacts.length} artifacts`, 'green');
        return true;
    }
    
    log('❌ Failed to list artifacts', 'red');
    return false;
}

async function testUpdateArtifact(ws) {
    log('\n=== Testing Update Artifact ===', 'magenta');
    
    if (!testArtifactId) {
        log('⚠️  No artifact ID to test with', 'yellow');
        return false;
    }
    
    const message = {
        type: 'project_command',
        method: 'artifact.update',
        params: {
            id: testArtifactId,
            content: '// Updated content\nconsole.log("Updated via WebSocket!");'
        }
    };
    
    const response = await sendMessage(ws, message);
    log(`📥 Response: ${JSON.stringify(response, null, 2)}`, 'yellow');
    
    if (response.data && response.data.artifact) {
        log(`✅ Artifact updated (version: ${response.data.artifact.version})`, 'green');
        return true;
    }
    
    log('❌ Failed to update artifact', 'red');
    return false;
}

async function testDeleteArtifact(ws) {
    log('\n=== Testing Delete Artifact ===', 'magenta');
    
    if (!testArtifactId) {
        log('⚠️  No artifact ID to test with', 'yellow');
        return false;
    }
    
    const message = {
        type: 'project_command',
        method: 'artifact.delete',
        params: {
            id: testArtifactId
        }
    };
    
    const response = await sendMessage(ws, message);
    log(`📥 Response: ${JSON.stringify(response, null, 2)}`, 'yellow');
    
    if (response.data && response.data.id) {
        log(`✅ Artifact deleted: ${response.data.id}`, 'green');
        return true;
    }
    
    log('❌ Failed to delete artifact', 'red');
    return false;
}

async function testDeleteProject(ws) {
    log('\n=== Testing Delete Project ===', 'magenta');
    
    if (!testProjectId) {
        log('⚠️  No project ID to test with', 'yellow');
        return false;
    }
    
    const message = {
        type: 'project_command',
        method: 'project.delete',
        params: {
            id: testProjectId
        }
    };
    
    const response = await sendMessage(ws, message);
    log(`📥 Response: ${JSON.stringify(response, null, 2)}`, 'yellow');
    
    if (response.data && response.data.id) {
        log(`✅ Project deleted: ${response.data.id}`, 'green');
        return true;
    }
    
    log('❌ Failed to delete project', 'red');
    return false;
}

// Main test runner
async function runTests() {
    try {
        const ws = await connectWebSocket();
        
        // Run tests in sequence
        const tests = [
            testCreateProject,
            testListProjects,
            testGetProject,
            testUpdateProject,
            testCreateArtifact,
            testListArtifacts,
            testUpdateArtifact,
            testDeleteArtifact,
            testDeleteProject
        ];
        
        let passed = 0;
        let failed = 0;
        
        for (const test of tests) {
            try {
                const result = await test(ws);
                if (result) passed++;
                else failed++;
            } catch (error) {
                log(`❌ Test error: ${error.message}`, 'red');
                failed++;
            }
        }
        
        // Summary
        log('\n' + '='.repeat(50), 'blue');
        log(`Test Results: ${passed} passed, ${failed} failed`, 
            failed === 0 ? 'green' : 'red');
        log('='.repeat(50), 'blue');
        
        ws.close();
        process.exit(failed === 0 ? 0 : 1);
        
    } catch (error) {
        log(`Fatal error: ${error}`, 'red');
        process.exit(1);
    }
}

// Run the tests
log('🚀 Starting WebSocket Project Management Tests', 'magenta');
log('='.repeat(50), 'blue');
runTests();
