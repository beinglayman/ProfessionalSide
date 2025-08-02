import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  error?: string;
  lastChecked: string;
}

interface ServiceBinding {
  service: string;
  requiredFor: string[];
  envVars: string[];
  status: 'configured' | 'missing' | 'partial';
}

export function RailwayStatus() {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'Frontend',
      url: 'https://hearty-prosperity-production-6047.up.railway.app',
      status: 'unknown',
      lastChecked: new Date().toISOString()
    },
    {
      name: 'Backend API',
      url: 'https://professionalside-production.up.railway.app/api/v1/test',
      status: 'unknown',
      lastChecked: new Date().toISOString()
    },
    {
      name: 'Backend Health',
      url: 'https://professionalside-production.up.railway.app/health',
      status: 'unknown',
      lastChecked: new Date().toISOString()
    },
    {
      name: 'PostgreSQL',
      url: 'postgres.railway.internal:5432',
      status: 'unknown',
      lastChecked: new Date().toISOString()
    }
  ]);

  const [bindings, setBindings] = useState<ServiceBinding[]>([
    {
      service: 'Frontend',
      requiredFor: ['API Communication', 'User Interface'],
      envVars: ['VITE_API_URL', 'PORT'],
      status: 'configured'
    },
    {
      service: 'Backend',
      requiredFor: ['Database Access', 'API Endpoints', 'Authentication'],
      envVars: [
        'DATABASE_URL',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'FRONTEND_URL',
        'CORS_ORIGINS',
        'NODE_ENV'
      ],
      status: 'configured'
    },
    {
      service: 'PostgreSQL',
      requiredFor: ['Data Storage', 'User Management', 'Application State'],
      envVars: ['DATABASE_URL'],
      status: 'configured'
    }
  ]);

  const [isChecking, setIsChecking] = useState(false);

  const checkServiceHealth = async (service: ServiceStatus): Promise<ServiceStatus> => {
    if (service.name === 'PostgreSQL') {
      // Can't directly check PostgreSQL from frontend
      return {
        ...service,
        status: 'unknown',
        lastChecked: new Date().toISOString()
      };
    }

    try {
      const startTime = Date.now();
      const response = await fetch(service.url, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        },
      });
      const responseTime = Date.now() - startTime;

      return {
        ...service,
        status: response.ok ? 'healthy' : 'unhealthy',
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status}`,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        ...service,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString()
      };
    }
  };

  const checkAllServices = async () => {
    setIsChecking(true);
    const updatedServices = await Promise.all(
      services.map(service => checkServiceHealth(service))
    );
    setServices(updatedServices);
    setIsChecking(false);
  };

  useEffect(() => {
    checkAllServices();
    const interval = setInterval(checkAllServices, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'configured':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'unhealthy':
      case 'missing':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'partial':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'configured':
        return 'text-green-600 bg-green-50';
      case 'unhealthy':
      case 'missing':
        return 'text-red-600 bg-red-50';
      case 'partial':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Railway Services Status</h1>
          <p className="text-gray-600">Monitor the health and configuration of your Railway deployment</p>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={checkAllServices}
            disabled={isChecking}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Refresh All'}
          </button>
          
          <a
            href="https://railway.app/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <ExternalLink className="w-4 h-4" />
            Railway Dashboard
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Service Health Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              Service Health
            </h2>
            
            <div className="space-y-4">
              {services.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <h3 className="font-medium">{service.name}</h3>
                      <p className="text-sm text-gray-500">{service.url}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                      {service.status}
                    </span>
                    {service.responseTime && (
                      <p className="text-xs text-gray-500 mt-1">{service.responseTime}ms</p>
                    )}
                    {service.error && (
                      <p className="text-xs text-red-500 mt-1">{service.error}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(service.lastChecked).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Service Bindings & Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Service Configuration</h2>
            
            <div className="space-y-4">
              {bindings.map((binding, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium flex items-center gap-2">
                      {getStatusIcon(binding.status)}
                      {binding.service}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(binding.status)}`}>
                      {binding.status}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Required for:</strong> {binding.requiredFor.join(', ')}
                  </div>
                  
                  <div className="text-sm">
                    <strong>Environment Variables:</strong>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {binding.envVars.map((envVar, envIndex) => (
                        <span
                          key={envIndex}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono"
                        >
                          {envVar}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Railway URLs */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="https://hearty-prosperity-production-6047.up.railway.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm">Frontend App</span>
            </a>
            
            <a
              href="https://professionalside-production.up.railway.app/health"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm">Backend Health</span>
            </a>
            
            <a
              href="https://professionalside-production.up.railway.app/api/v1/test"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm">API Test</span>
            </a>
            
            <a
              href="https://railway.app/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm">Railway Dashboard</span>
            </a>
          </div>
        </div>

        {/* Environment Variables Checklist */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Environment Variables Checklist</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Frontend Service</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-mono">VITE_API_URL</span>
                  <span className="text-gray-500">= professionalside-production.up.railway.app/api/v1</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-mono">PORT</span>
                  <span className="text-gray-500">= 4173</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Backend Service</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-mono">DATABASE_URL</span>
                  <span className="text-gray-500">Auto-generated</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-mono">FRONTEND_URL</span>
                  <span className="text-gray-500">= hearty-prosperity-production-6047.up.railway.app</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-mono">CORS_ORIGINS</span>
                  <span className="text-gray-500">= hearty-prosperity-production-6047.up.railway.app</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-mono">JWT_SECRET</span>
                  <span className="text-gray-500">Configured</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-mono">NODE_ENV</span>
                  <span className="text-gray-500">= production</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}