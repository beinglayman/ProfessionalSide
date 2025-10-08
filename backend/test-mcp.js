// Quick test to check if MCP controller can be instantiated
const { MCPController } = require('./dist/controllers/mcp.controller.js');

try {
  console.log('Creating MCP Controller...');
  const controller = new MCPController();
  console.log('Controller created successfully');
  console.log('Methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(controller)));
} catch (error) {
  console.error('Error creating controller:', error.message);
  console.error(error.stack);
}