import React, { useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

interface SystemStats {
  version: string;
  codename: string;
  status: string;
  brain: {
    capabilities: number;
    total_keywords: number;
  };
  database: {
    tables: number;
    total_records: number;
  };
  cache: {
    entries: number;
    hit_rate: number;
  };
  server: {
    uptime_seconds: number;
    requests_handled: number;
  };
}

export default function StatusPage() {
  const { data, loading, error, get } = useApi<SystemStats>();

  useEffect(() => {
    get('/stats');
    const interval = setInterval(() => get('/stats'), 30000);
    return () => clearInterval(interval);
  }, [get]);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Status</h1>
        <Badge variant={data?.status === 'operational' ? 'default' : 'destructive'}>
          {data?.status || 'Unknown'}
        </Badge>
      </div>

      {loading && <div className="text-gray-500">Loading status...</div>}
      {error && <div className="text-red-500">Error: {error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Version</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.version}</div>
                <p className="text-xs text-gray-500">{data.codename}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Capabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.brain?.capabilities}</div>
                <p className="text-xs text-gray-500">{data.brain?.total_keywords} keywords</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Database Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.database?.total_records?.toLocaleString()}</div>
                <p className="text-xs text-gray-500">{data.database?.tables} tables</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.cache?.hit_rate}%</div>
                <p className="text-xs text-gray-500">{data.cache?.entries} entries</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Server Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Uptime</span>
                <span>{formatUptime(data.server?.uptime_seconds || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Requests Handled</span>
                <span>{data.server?.requests_handled?.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
