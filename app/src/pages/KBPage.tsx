import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

interface KBEntry {
  id: number;
  question: string;
  answer: string;
  category: string;
  confidence: number;
}

export default function KBPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newCategory, setNewCategory] = useState('general');

  const { data: searchData, loading: searchLoading, get } = useApi<{ results: KBEntry[] }>();
  const { data: addData, loading: addLoading, post } = useApi<any>();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    await get(`/kb/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    try {
      await post('/kb/add', {
        question: newQuestion,
        answer: newAnswer,
        category: newCategory,
      });
      setNewQuestion('');
      setNewAnswer('');
    } catch {
      // Error handled by hook
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Knowledge Base</h1>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Knowledge Base</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions and answers..."
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searchLoading}>
              {searchLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {searchData?.results && (
            <div className="mt-4 space-y-3">
              {searchData.results.map((entry) => (
                <div key={entry.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
                  <p className="font-medium text-gray-900 dark:text-white">{entry.question}</p>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">{entry.answer}</p>
                  <span className="text-xs text-gray-400">{entry.category}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Entry */}
      <Card>
        <CardHeader>
          <CardTitle>Add Knowledge Base Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Question</label>
              <Input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Enter the question..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Answer</label>
              <textarea
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                placeholder="Enter the answer..."
                className="w-full p-2 border rounded-md bg-background"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Category..."
              />
            </div>
            <Button type="submit" disabled={addLoading}>
              {addLoading ? 'Adding...' : 'Add Entry'}
            </Button>
            {addData && (
              <p className="text-green-600 text-sm">{addData.message}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
