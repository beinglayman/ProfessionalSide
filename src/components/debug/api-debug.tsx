import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../lib/api';

export const ApiDebugComponent: React.FC = () => {
  const [apiTest, setApiTest] = useState<{
    url: string;
    skillsEndpoint: string;
    working: boolean;
    error?: string;
  }>({
    url: API_BASE_URL,
    skillsEndpoint: '',
    working: false
  });

  useEffect(() => {
    const testApi = async () => {
      const skillsUrl = `${API_BASE_URL}/reference/skills`;
      setApiTest(prev => ({ ...prev, skillsEndpoint: skillsUrl }));
      
      try {
        const response = await fetch(skillsUrl);
        const data = await response.json();
        setApiTest(prev => ({ 
          ...prev, 
          working: response.ok && data.success,
          error: response.ok ? undefined : `HTTP ${response.status}: ${data.message || 'Unknown error'}`
        }));
      } catch (error) {
        setApiTest(prev => ({ 
          ...prev, 
          working: false, 
          error: error instanceof Error ? error.message : 'Network error'
        }));
      }
    };

    testApi();
  }, []);

  return (
    <div className="fixed top-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-md z-50">
      <div className="font-bold mb-2">API Debug Info</div>
      <div><strong>API URL:</strong> {apiTest.url}</div>
      <div><strong>Skills Endpoint:</strong> {apiTest.skillsEndpoint}</div>
      <div><strong>Working:</strong> <span className={apiTest.working ? 'text-green-400' : 'text-red-400'}>
        {apiTest.working ? 'YES' : 'NO'}
      </span></div>
      {apiTest.error && <div><strong>Error:</strong> <span className="text-red-400">{apiTest.error}</span></div>}
      <div><strong>Env:</strong> {import.meta.env.MODE}</div>
      <div><strong>VITE_API_URL:</strong> {import.meta.env.VITE_API_URL || 'undefined'}</div>
    </div>
  );
};