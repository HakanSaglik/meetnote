import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Brain, Calendar, MessageCircleQuestion, Settings, FileText, Home, Menu, AlertTriangle, CheckCircle, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  const navItems = [
    { path: '/', icon: Home, label: 'Ana Sayfa' },
    { path: '/add-meeting', icon: Calendar, label: 'Toplantı Ekle' },
    { path: '/ask-question', icon: MessageCircleQuestion, label: 'Soru Sor' },
    { path: '/meetings', icon: FileText, label: 'Toplantılar' },
    { path: '/completed-tasks', icon: CheckCircle, label: 'Görevler' },
    { path: '/settings', icon: Settings, label: 'Ayarlar' },
  ];

  return (
    <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50 transition-colors duration-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
              <Brain className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">Toplantı Hafızası</span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center space-x-4">
            <nav className="hidden md:flex items-center space-x-1">
            {navItems.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 shadow-sm' 
                      : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden lg:block">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
            title={isDark ? 'Açık Tema' : 'Karanlık Tema'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Sidebar Toggle Button */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors flex items-center gap-2"
              title="Önemli Görevler"
            >
              <AlertTriangle className="w-5 h-5" />
              <span className="hidden lg:block text-sm font-medium">Görevler</span>
            </button>
          )}

          {/* Mobile Navigation Button */}
          <div className="md:hidden">
            <button className="p-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
              <Menu className="w-6 h-6" />
            </button>
          </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200/50 dark:border-gray-700/50 py-2">
          <div className="flex justify-between space-x-1">
            {navItems.slice(0, 4).map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`
                    flex flex-col items-center space-y-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex-1
                    ${isActive 
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' 
                      : 'text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{label.split(' ')[0]}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;