// Test MCP Simple Controller instantiation
const { MCPSimpleController } = require('./dist/controllers/mcp-simple.controller.js');

console.log('Testing MCP Simple Controller...\n');

try {
  console.log('1. Creating controller instance...');
  const controller = new MCPSimpleController();
  console.log('✅ Controller created successfully\n');

  console.log('2. Checking controller properties...');
  console.log('- Controller type:', typeof controller);
  console.log('- Is instance of MCPSimpleController:', controller instanceof MCPSimpleController);
  console.log('');

  console.log('3. Checking methods...');
  const methods = [
    'getAvailableTools',
    'initiateOAuth',
    'handleOAuthCallback',
    'getIntegrationStatus',
    'disconnectIntegration'
  ];

  for (const method of methods) {
    const hasMethod = method in controller;
    const methodType = typeof controller[method];
    console.log(`- ${method}: ${hasMethod ? '✅' : '❌'} (type: ${methodType})`);
  }

  console.log('\n4. Testing method binding...');
  const getTools = controller.getAvailableTools;
  console.log('- getAvailableTools extracted:', typeof getTools);
  console.log('- Is function:', typeof getTools === 'function');

  console.log('\n5. Checking method prototype...');
  console.log('- getAvailableTools.name:', controller.getAvailableTools?.name);
  console.log('- getAvailableTools.length:', controller.getAvailableTools?.length);

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}