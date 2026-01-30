import express, { Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const execAsync = promisify(exec);

interface ServiceInfo {
  status: 'running' | 'stopped' | 'error' | 'unknown';
  pid?: number;
  port?: number;
  uptime?: string;
  memory?: string;
  cpu?: string;
}

const checkProcessByPort = async (port: number): Promise<{ pid?: number; status: string }> => {
  try {
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    const pid = parseInt(stdout.trim());
    if (pid) {
      return { pid, status: 'running' };
    }
  } catch (error) {
    // Port not in use
  }
  return { status: 'stopped' };
};

const checkProcessByName = async (processName: string): Promise<{ pid?: number; status: string }> => {
  try {
    console.log(`Checking process by name: ${processName}`);
    const { stdout } = await execAsync(`pgrep -f "${processName}"`);
    console.log(`pgrep output: "${stdout}"`);
    const pids = stdout.trim().split('\n').filter(pid => pid);
    console.log(`Filtered PIDs: ${JSON.stringify(pids)}`);
    if (pids.length > 0) {
      const pid = parseInt(pids[0]);
      console.log(`Found running process with PID: ${pid}`);
      return { pid, status: 'running' };
    }
  } catch (error) {
    console.log(`pgrep error: ${error}`);
    // Process not found
  }
  console.log(`Process ${processName} not found, returning stopped`);
  return { status: 'stopped' };
};

const getProcessStats = async (pid: number): Promise<{ uptime?: string; memory?: string; cpu?: string }> => {
  try {
    // Get process stats using ps
    const { stdout } = await execAsync(`ps -p ${pid} -o etime,rss,%cpu --no-headers`);
    const [uptime, rss, cpu] = stdout.trim().split(/\s+/);
    
    const memory = rss ? `${Math.round(parseInt(rss) / 1024)}MB` : undefined;
    
    return {
      uptime: uptime || undefined,
      memory,
      cpu: cpu ? `${cpu}%` : undefined
    };
  } catch (error) {
    return {};
  }
};

const checkHealthEndpoint = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { 
      method: 'GET',
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

router.post('/status', async (req: Request, res: Response) => {
  try {
    const { serviceId, port, healthEndpoint } = req.body;
    let serviceInfo: ServiceInfo = { status: 'unknown' };

    switch (serviceId) {
      case 'frontend':
        if (port) {
          const portCheck = await checkProcessByPort(port);
          serviceInfo.pid = portCheck.pid;
          serviceInfo.port = port;
          serviceInfo.status = portCheck.status as any;
        }
        break;

      case 'backend':
        // First check by port (more reliable)
        if (port) {
          const portCheck = await checkProcessByPort(port);
          serviceInfo.pid = portCheck.pid;
          serviceInfo.port = port;
          serviceInfo.status = portCheck.status as any;
        }
        
        // If port check didn't work, check by process name pattern
        if (serviceInfo.status !== 'running') {
          const backendCheck = await checkProcessByName('tsx.*src/app.ts');
          if (backendCheck.status === 'running') {
            serviceInfo.pid = backendCheck.pid;
            serviceInfo.status = backendCheck.status as any;
          }
        }
        
        if (serviceInfo.pid) {
          const stats = await getProcessStats(serviceInfo.pid);
          serviceInfo = { ...serviceInfo, ...stats };
        }

        // Double-check with health endpoint if available
        if (healthEndpoint && serviceInfo.status === 'running') {
          const isHealthy = await checkHealthEndpoint(healthEndpoint);
          if (!isHealthy) {
            serviceInfo.status = 'error';
          }
        }
        break;

      case 'prisma-studio':
        if (port) {
          const studioCheck = await checkProcessByPort(port);
          serviceInfo.pid = studioCheck.pid;
          serviceInfo.port = port;
          serviceInfo.status = studioCheck.status as any;
        }
        break;

      default:
        serviceInfo.status = 'unknown';
    }

    res.json(serviceInfo);
  } catch (error) {
    console.error('Error checking service status:', error);
    res.status(500).json({ error: 'Failed to check service status' });
  }
});

router.post('/control', async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId, action, command } = req.body;

    if (!['start', 'stop', 'restart'].includes(action)) {
      res.status(400).json({ error: 'Invalid action' });
      return;
    }

    console.log(`Executing ${action} command for ${serviceId}: ${command}`);

    // For start commands, run in background
    if (action === 'start' || action === 'restart') {
      // Use nohup to run the process in background
      const backgroundCommand = `nohup ${command} > /dev/null 2>&1 &`;
      exec(backgroundCommand, { cwd: process.cwd() });
      
      res.json({ 
        success: true, 
        message: `${action} command executed for ${serviceId}`,
        command: backgroundCommand
      });
    } else {
      // For stop commands, execute directly
      try {
        await execAsync(command);
        res.json({ 
          success: true, 
          message: `${action} command executed for ${serviceId}`,
          command
        });
      } catch (error: any) {
        // Some stop commands may "fail" but actually work (when process is already stopped)
        res.json({ 
          success: true, 
          message: `${action} command executed for ${serviceId}`,
          command,
          note: 'Process may have already been stopped'
        });
      }
    }
  } catch (error) {
    console.error('Error controlling service:', error);
    res.status(500).json({ error: 'Failed to control service' });
  }
});

router.get('/logs/:serviceId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId } = req.params;
    const lines = parseInt(req.query.lines as string) || 100;

    let logPath: string;
    
    switch (serviceId) {
      case 'backend':
        logPath = path.join(process.cwd(), 'logs', 'combined.log');
        break;
      default:
        res.status(404).json({ error: 'Log file not found for this service' });
        return;
    }

    try {
      await fs.access(logPath);
      const { stdout } = await execAsync(`tail -n ${lines} "${logPath}"`);
      const logLines = stdout.split('\n').filter(line => line.trim());
      
      res.json({ 
        serviceId,
        logPath,
        lines: logLines,
        totalLines: logLines.length
      });
    } catch (error) {
      res.json({ 
        serviceId,
        logPath,
        lines: [],
        totalLines: 0,
        error: 'Log file not accessible'
      });
    }
  } catch (error) {
    console.error('Error reading logs:', error);
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// System overview endpoint
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const services = ['frontend', 'backend', 'prisma-studio'];
    const overview = {
      total: services.length,
      running: 0,
      stopped: 0,
      error: 0,
      unknown: 0,
      systemUptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage()
    };

    // This would ideally check all services, but for now return basic info
    res.json(overview);
  } catch (error) {
    console.error('Error getting system overview:', error);
    res.status(500).json({ error: 'Failed to get system overview' });
  }
});

export default router;