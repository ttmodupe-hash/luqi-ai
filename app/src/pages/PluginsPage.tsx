import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

interface Plugin {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'active' | 'inactive' | 'error';
  version: string;
}

const PLUGINS: Plugin[] = [
  {
    id: 'financial_literacy',
    name: 'Financial Literacy',
    description: 'Budgeting, saving, investing, stokvels, and wealth building guidance.',
    category: 'Finance',
    status: 'active',
    version: '3.2.0',
  },
  {
    id: 'educational_companion',
    name: 'Educational Companion',
    description: 'Study help, course recommendations, exam preparation, and tutoring.',
    category: 'Education',
    status: 'active',
    version: '3.2.0',
  },
  {
    id: 'vocational_companion',
    name: 'Vocational Companion',
    description: 'Career advice, job search, resume building, and skill development.',
    category: 'Career',
    status: 'active',
    version: '3.2.0',
  },
  {
    id: 'african_languages',
    name: 'African Languages',
    description: 'Translation and learning for Zulu, Xhosa, Sotho, and more.',
    category: 'Language',
    status: 'active',
    version: '3.2.0',
  },
  {
    id: 'tax_engine',
    name: 'Tax Engine',
    description: 'South African tax calculations, VAT, income tax, and rebates.',
    category: 'Finance',
    status: 'active',
    version: '3.2.0',
  },
  {
    id: 'deep_research',
    name: 'Deep Research',
    description: 'Comprehensive research on markets, industries, and trends.',
    category: 'Research',
    status: 'active',
    version: '3.2.0',
  },
  {
    id: 'scheduler',
    name: 'Scheduler',
    description: 'Task planning, habit tracking, and routine management.',
    category: 'Productivity',
    status: 'active',
    version: '3.2.0',
  },
  {
    id: 'reminders',
    name: 'Reminders',
    description: 'Set and manage reminders, alerts, and notifications.',
    category: 'Productivity',
    status: 'active',
    version: '3.2.0',
  },
  {
    id: 'calc_engine',
    name: 'Calculator Engine',
    description: 'Advanced calculations, conversions, and financial formulas.',
    category: 'Tools',
    status: 'active',
    version: '3.2.0',
  },
  {
    id: 'knowledge_base',
    name: 'Knowledge Base',
    description: 'FAQ system with natural language matching.',
    category: 'Core',
    status: 'active',
    version: '3.2.0',
  },
  {
    id: 'email_assistant',
    name: 'Email Assistant',
    description: 'Email composition, templates, and management.',
    category: 'Communication',
    status: 'inactive',
    version: '3.2.0',
  },
  {
    id: 'stokvel_manager',
    name: 'Stokvel Manager',
    description: 'Stokvel creation, member management, and payout tracking.',
    category: 'Finance',
    status: 'active',
    version: '3.2.0',
  },
];

export default function PluginsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(PLUGINS.map(p => p.category)))];
  const filteredPlugins = selectedCategory === 'All'
    ? PLUGINS
    : PLUGINS.filter(p => p.category === selectedCategory);

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-400';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Plugins</h1>
        <div className="text-sm text-gray-500">
          {PLUGINS.filter(p => p.status === 'active').length} of {PLUGINS.length} active
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
              selectedCategory === cat
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-gray-800 border hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Plugin Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlugins.map(plugin => (
          <Card key={plugin.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{plugin.name}</CardTitle>
                <div className={`w-2 h-2 rounded-full ${statusColor(plugin.status)}`} />
              </div>
              <Badge variant="outline">{plugin.category}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {plugin.description}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>v{plugin.version}</span>
                <Badge className={plugin.status === 'active' ? 'bg-green-100 text-green-800' : ''}>
                  {plugin.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
