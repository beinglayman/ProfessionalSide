import React, { useState } from 'react';
import { Button } from '../ui/button';
import { useSearch } from '../../hooks/useSearch';

export function SearchDebug() {
  const [testQuery, setTestQuery] = useState('test');
  const { search, results, isLoading, error, clear } = useSearch();

  const setDemoToken = () => {
    localStorage.setItem('inchronicle_access_token', 'demo_user_12345');
    alert('Demo token set! Refresh the page and try searching.');
  };

  const clearToken = () => {
    localStorage.removeItem('inchronicle_access_token');
    alert('Token cleared!');
  };

  const testSearch = async () => {
    await search({ query: testQuery });
  };

  const checkAuth = () => {
    const token = localStorage.getItem('inchronicle_access_token');
    alert(`Auth token: ${token || 'Not found'}`);
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg p-4 shadow-lg max-w-sm">
      <h3 className="font-bold mb-2">Search Debug Tool</h3>
      
      <div className="space-y-2">
        <Button onClick={setDemoToken} className="w-full text-xs">
          Set Demo Token
        </Button>
        
        <Button onClick={clearToken} className="w-full text-xs" variant="outline">
          Clear Token
        </Button>
        
        <Button onClick={checkAuth} className="w-full text-xs" variant="outline">
          Check Auth Status
        </Button>
        
        <div className="flex gap-1">
          <input 
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            className="flex-1 px-2 py-1 border rounded text-xs"
            placeholder="Test query"
          />
          <Button onClick={testSearch} className="text-xs" disabled={isLoading}>
            Search
          </Button>
        </div>
        
        <Button onClick={clear} className="w-full text-xs" variant="outline">
          Clear Results
        </Button>
      </div>
      
      <div className="mt-2 text-xs">
        {isLoading && <p className="text-blue-600">Loading...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {(results?.length || 0) > 0 && (
          <p className="text-green-600">Found {results?.length || 0} results</p>
        )}
      </div>
    </div>
  );
}