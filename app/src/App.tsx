import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

// Lazy load pages
const Home = React.lazy(() => import('./pages/Home'));
const StatusPage = React.lazy(() => import('./pages/StatusPage'));
const KBPage = React.lazy(() => import('./pages/KBPage'));
const PluginsPage = React.lazy(() => import('./pages/PluginsPage'));
const WisdomPage = React.lazy(() => import('./pages/WisdomPage'));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Navigation */}
        <nav className="bg-white dark:bg-gray-800 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  Luqi AI
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link to="/" className="text-gray-700 dark:text-gray-300 hover:text-blue-600">Home</Link>
                <Link to="/status" className="text-gray-700 dark:text-gray-300 hover:text-blue-600">Status</Link>
                <Link to="/kb" className="text-gray-700 dark:text-gray-300 hover:text-blue-600">Knowledge</Link>
                <Link to="/plugins" className="text-gray-700 dark:text-gray-300 hover:text-blue-600">Plugins</Link>
                <Link to="/wisdom" className="text-gray-700 dark:text-gray-300 hover:text-blue-600">Wisdom</Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/status" element={<StatusPage />} />
              <Route path="/kb" element={<KBPage />} />
              <Route path="/plugins" element={<PluginsPage />} />
              <Route path="/wisdom" element={<WisdomPage />} />
            </Routes>
          </Suspense>
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-gray-800 shadow-inner mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-4 text-center text-gray-500 dark:text-gray-400">
            <p>Luqi AI v25.2.0 "Modular LUQI" — Built with React + TypeScript + Tailwind</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
