const express = require('express');
const cors = require('cors');

const app = express();
const port = 3002; // Use different port to avoid conflicts

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  console.log('Health check request received');
  res.json({ status: 'ok', message: 'Test server running' });
});

app.post('/api/v1/auth/login', (req, res) => {
  console.log('Login request received:', req.body);
  res.json({ 
    success: true, 
    data: { 
      user: { id: 'test', name: 'Test User' },
      accessToken: 'test-token',
      refreshToken: 'test-refresh'
    }
  });
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Test server running on port ${port}`);
  console.log(`❤️ Health: http://localhost:${port}/health`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});