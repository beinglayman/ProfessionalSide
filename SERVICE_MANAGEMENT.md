# Service Management Dashboard

This project now includes a comprehensive service management system that helps you monitor and control your application services.

## 🚀 Features

### 1. Web Dashboard (`/services`)
- **Real-time service status monitoring**
- **Start/Stop/Restart controls** for each service
- **System overview** with running/stopped service counts
- **Service health checks** and endpoint monitoring
- **Auto-refresh every 5 seconds** (configurable)

### 2. Command-Line Management Script
- **Unified service control** from terminal
- **Color-coded status output**
- **Log viewing** for each service
- **Cross-platform compatibility**

## 📊 Monitored Services

| Service | Port | Description | Health Check |
|---------|------|-------------|--------------|
| **Frontend** | 5173 | React/Vite development server | Port check |
| **Backend** | 3002 | Node.js/Express API server | `/health` endpoint |
| **Prisma Studio** | 5555 | Database browser interface | Port check |

## 🛠️ Usage

### Web Dashboard
1. Navigate to `/services` in your application
2. View real-time status of all services
3. Use start/stop/restart buttons to control services
4. Toggle auto-refresh on/off as needed

### Command Line Script
```bash
# Show status of all services
./manage-services.sh status

# Start all services
./manage-services.sh start

# Start a specific service
./manage-services.sh start backend

# Stop all services
./manage-services.sh stop

# Restart a specific service
./manage-services.sh restart frontend

# View logs for a service
./manage-services.sh logs backend

# Show help
./manage-services.sh help
```

## 🔧 API Endpoints

The service management system provides these API endpoints:

- `POST /api/services/status` - Check service status
- `POST /api/services/control` - Start/stop/restart services
- `GET /api/services/logs/:serviceId` - Get service logs
- `GET /api/services/overview` - System overview

## 📝 Service Configuration

Services are configured with:
- **Process patterns** for identification
- **Port numbers** for health checks
- **Start/stop commands** for control
- **Log file paths** for debugging

## 🚨 Troubleshooting

### Common Issues

1. **Service won't start**
   - Check if port is already in use
   - Verify dependencies are installed
   - Check logs for error messages

2. **Service shows as running but not accessible**
   - Verify health endpoint is responding
   - Check firewall/network settings
   - Review service logs

3. **Permission errors**
   - Ensure script is executable: `chmod +x manage-services.sh`
   - Run with appropriate permissions

### Debugging Commands

```bash
# Check what's running on specific ports
lsof -ti:5173  # Frontend
lsof -ti:3002  # Backend
lsof -ti:5555  # Prisma Studio

# View running Node processes
ps aux | grep node

# Kill stuck processes
pkill -f "vite"
pkill -f "tsx.*src/app.ts"
```

## 🔄 Enhancement Suggestions

The service management system can be enhanced further with:

1. **Docker Integration**
   - Add support for Docker containers
   - Container health monitoring
   - Docker Compose orchestration

2. **Advanced Monitoring**
   - CPU and memory usage graphs
   - Response time monitoring
   - Error rate tracking
   - Uptime statistics

3. **Notifications**
   - Email/Slack alerts for service failures
   - Custom notification webhooks
   - Service dependency tracking

4. **Database Monitoring**
   - PostgreSQL connection status
   - Query performance metrics
   - Database size and health

5. **CI/CD Integration**
   - Deployment status tracking
   - Build pipeline monitoring
   - Environment management

6. **Security Features**
   - Authentication for service controls
   - Audit logging for actions
   - Role-based access control

## 🎯 Quick Start

1. **Access the dashboard**: Navigate to `http://localhost:5173/services`
2. **Use the CLI**: Run `./manage-services.sh status` to see current status
3. **Start development**: Run `./manage-services.sh start` to start all services
4. **Monitor in real-time**: The dashboard auto-refreshes every 5 seconds

This service management system will help eliminate the debugging struggles you've been facing by providing clear visibility into your service states and easy controls to manage them.