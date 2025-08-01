import React, { useState, useEffect } from 'react';
import { RefreshCw, Play, Square, RotateCcw, Activity, Database, Server, Globe } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'unknown';
  port?: number;
  pid?: number;
  uptime?: string;
  memory?: string;
  cpu?: string;
  lastChecked: Date;
}

interface Service {
  id: string;
  name: string;
  displayName: string;
  type: 'frontend' | 'backend' | 'database' | 'external';
  port?: number;
  healthEndpoint?: string;
  startCommand: string;
  stopCommand: string;
  restartCommand: string;
  logPath?: string;
  icon: React.ReactNode;
}

const SERVICES: Service[] = [
  {
    id: 'frontend',
    name: 'frontend',
    displayName: 'Frontend (Vite)',
    type: 'frontend',
    port: 5173,
    healthEndpoint: 'http://localhost:5173',
    startCommand: 'npm run dev',
    stopCommand: 'pkill -f "vite"',
    restartCommand: 'pkill -f "vite" && npm run dev',
    icon: <Globe className="w-5 h-5" />
  },
  {
    id: 'backend',
    name: 'inchronicle-backend',
    displayName: 'Backend API',
    type: 'backend',
    port: 3002,
    healthEndpoint: 'http://localhost:3002/health',
    startCommand: 'cd backend && npm run dev',
    stopCommand: 'pkill -f "tsx.*src/app.ts"',
    restartCommand: 'pkill -f "tsx.*src/app.ts" && cd backend && npm run dev',
    logPath: 'backend/logs/combined.log',
    icon: <Server className="w-5 h-5" />
  },
  {
    id: 'prisma-studio',
    name: 'prisma-studio',
    displayName: 'Prisma Studio',
    type: 'database',
    port: 5555,
    healthEndpoint: 'http://localhost:5555',
    startCommand: 'cd backend && npm run db:studio',
    stopCommand: 'pkill -f "prisma studio"',
    restartCommand: 'pkill -f "prisma studio" && cd backend && npm run db:studio',
    icon: <Database className="w-5 h-5" />
  }
];

export default function ServiceStatusPage() {
  const [services, setServices] = useState<Record<string, ServiceStatus>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [logs, setLogs] = useState<Record<string, string[]>>({});
  const [autoRefresh, setAutoRefresh] = useState(true);

  const checkServiceStatus = async (service: Service): Promise<ServiceStatus> => {
    const now = new Date();
    
    try {
      // Check if process is running by port or process name
      const response = await fetch('/api/services/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          serviceId: service.id,
          port: service.port,
          healthEndpoint: service.healthEndpoint
        })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          name: service.name,
          status: data.status,
          port: data.port,
          pid: data.pid,
          uptime: data.uptime,
          memory: data.memory,
          cpu: data.cpu,
          lastChecked: now
        };
      }
    } catch (error) {
      console.error(`Error checking ${service.name}:`, error);
    }

    return {
      name: service.name,
      status: 'unknown',
      lastChecked: now
    };
  };

  const executeServiceAction = async (service: Service, action: 'start' | 'stop' | 'restart') => {
    setLoading(prev => ({ ...prev, [service.id]: true }));
    
    try {
      const command = action === 'start' ? service.startCommand : 
                    action === 'stop' ? service.stopCommand : 
                    service.restartCommand;

      const response = await fetch('/api/services/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          serviceId: service.id,
          action,
          command
        })
      });

      if (response.ok) {
        // Refresh status after action
        setTimeout(() => {
          refreshServiceStatus(service);
        }, 2000);
      }
    } catch (error) {
      console.error(`Error ${action}ing ${service.name}:`, error);
    } finally {
      setLoading(prev => ({ ...prev, [service.id]: false }));
    }
  };

  const refreshServiceStatus = async (service: Service) => {
    const status = await checkServiceStatus(service);
    setServices(prev => ({ ...prev, [service.id]: status }));
  };

  const refreshAllServices = async () => {
    const promises = SERVICES.map(async (service) => {
      const status = await checkServiceStatus(service);
      return { [service.id]: status };
    });

    const results = await Promise.all(promises);
    const newServices = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
    setServices(newServices);
  };

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-50 border-green-200';
      case 'stopped': return 'text-red-600 bg-red-50 border-red-200';
      case 'error': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'running': return <Activity className="w-4 h-4 text-green-600" />;
      case 'stopped': return <Square className="w-4 h-4 text-red-600" />;
      case 'error': return <RefreshCw className="w-4 h-4 text-orange-600" />;
      default: return <RefreshCw className="w-4 h-4 text-gray-600" />;
    }
  };

  useEffect(() => {
    refreshAllServices();
    
    if (autoRefresh) {
      const interval = setInterval(refreshAllServices, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Service Status Dashboard</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-600">Auto-refresh (5s)</span>
          </label>
          <button
            onClick={refreshAllServices}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SERVICES.map((service) => {
          const status = services[service.id];
          const isLoading = loading[service.id];

          return (
            <div key={service.id} className="bg-white border rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {service.icon}
                  <div>
                    <h3 className="font-semibold text-gray-900">{service.displayName}</h3>
                    <p className="text-sm text-gray-500">
                      {service.port && `Port ${service.port}`}
                    </p>
                  </div>
                </div>
                {status && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(status.status)}`}>
                    {getStatusIcon(status.status)}
                    {status.status}
                  </div>
                )}
              </div>

              {status && (
                <div className="space-y-2 mb-4 text-sm text-gray-600">
                  {status.pid && <div>PID: {status.pid}</div>}
                  {status.uptime && <div>Uptime: {status.uptime}</div>}
                  {status.memory && <div>Memory: {status.memory}</div>}
                  {status.cpu && <div>CPU: {status.cpu}</div>}
                  <div>Last checked: {status.lastChecked.toLocaleTimeString()}</div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => executeServiceAction(service, 'start')}
                  disabled={isLoading || status?.status === 'running'}
                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-3 h-3" />
                  Start
                </button>
                <button
                  onClick={() => executeServiceAction(service, 'stop')}
                  disabled={isLoading || status?.status === 'stopped'}
                  className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Square className="w-3 h-3" />
                  Stop
                </button>
                <button
                  onClick={() => executeServiceAction(service, 'restart')}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restart
                </button>
              </div>

              {isLoading && (
                <div className="mt-2 text-sm text-blue-600">
                  Executing action...
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h2>
        <div className="bg-white border rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {Object.values(services).filter(s => s.status === 'running').length}
              </div>
              <div className="text-sm text-gray-600">Running</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {Object.values(services).filter(s => s.status === 'stopped').length}
              </div>
              <div className="text-sm text-gray-600">Stopped</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {Object.values(services).filter(s => s.status === 'error').length}
              </div>
              <div className="text-sm text-gray-600">Errors</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {SERVICES.length}
              </div>
              <div className="text-sm text-gray-600">Total Services</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}