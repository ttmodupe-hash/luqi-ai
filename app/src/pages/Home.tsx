import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function Home() {
  const [query, setQuery] = useState('');
  const { data, loading, error, post } = useApi<any>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      await post('/chat', { message: query, use_tools: true });
    } catch {
      // Error handled by hook
    }
  };

  const quickQueries = [
    "What government services are available?",
    "Help me create a budget",
    "What careers are in demand?",
    "How do I say hello in Zulu?",
    "What is a stokvel?",
  ];

  return (
    <div className="space-y-6">
      <div className="text-center py-10">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to Luqi AI
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Your intelligent assistant for government services, careers, education,
          and more. Ask me anything!
        </p>
      </div>

      {/* Chat Input */}
      <Card className="max-w-3xl mx-auto">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask Luqi AI anything..."
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Thinking...' : 'Ask'}
            </Button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded">
              Error: {error}
            </div>
          )}

          {data?.message && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{data.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Queries */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">
          Quick Questions
        </h2>
        <div className="flex flex-wrap gap-2">
          {quickQueries.map((q) => (
            <button
              key={q}
              onClick={() => { setQuery(q); }}
              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border rounded-full
                         hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors
                         text-gray-600 dark:text-gray-300"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Government Services</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              Access information about SASSA grants, home affairs, driver's licenses,
              housing, and municipal services across South Africa.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Career & Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              Explore in-demand careers, salary benchmarks, interview preparation,
              resume building, and free learning resources.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Literacy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              Learn about budgeting, saving, investing, stokvels, taxes,
              and building wealth for your future.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
