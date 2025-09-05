import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: 'blue' | 'emerald' | 'purple' | 'amber';
  trend?: string;
  description?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  trend,
  description
}) => {
  const colorClasses = {
    blue: {
      bg: 'from-blue-500 via-indigo-500 to-purple-600',
      icon: 'from-blue-500 to-indigo-600',
      text: 'from-blue-600 to-indigo-600',
      glow: 'from-blue-400/20 to-indigo-400/20'
    },
    emerald: {
      bg: 'from-emerald-500 via-teal-500 to-cyan-600',
      icon: 'from-emerald-500 to-teal-600',
      text: 'from-emerald-600 to-teal-600',
      glow: 'from-emerald-400/20 to-teal-400/20'
    },
    purple: {
      bg: 'from-purple-500 via-violet-500 to-fuchsia-600',
      icon: 'from-purple-500 to-fuchsia-600',
      text: 'from-purple-600 to-fuchsia-600',
      glow: 'from-purple-400/20 to-fuchsia-400/20'
    },
    amber: {
      bg: 'from-amber-500 via-orange-500 to-red-600',
      icon: 'from-amber-500 to-orange-600',
      text: 'from-amber-600 to-orange-600',
      glow: 'from-amber-400/20 to-orange-400/20'
    }
  };

  const colors = colorClasses[color];

  return (
    <div className="group relative bg-gradient-to-br from-white via-white to-gray-50/50 rounded-3xl shadow-xl border border-white/50 p-8 hover:shadow-2xl hover:scale-105 transition-all duration-500 overflow-hidden">
      {/* Animated Background Elements */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
      <div className={`absolute -top-10 -right-10 w-20 h-20 bg-gradient-to-br ${colors.bg} rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500`}></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colors.icon} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
            <Icon className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
          {trend && (
            <div className={`px-4 py-2 bg-gradient-to-r ${colors.bg} rounded-full shadow-lg animate-pulse`}>
              <span className="text-sm font-bold text-white">
                📈 {trend}
              </span>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className={`text-4xl font-bold bg-gradient-to-r ${colors.text} bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </h3>
          <p className="text-lg font-semibold text-gray-700 group-hover:text-gray-800 transition-colors">{title}</p>
          {description && (
            <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
};