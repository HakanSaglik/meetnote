import React, { useState } from 'react';
import { Clock, AlertTriangle, Calendar, CheckCircle, ChevronDown } from 'lucide-react';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  isUrgent: boolean;
  deadline?: string;
  category: 'action' | 'reminder' | 'deadline';
  meetingDate?: string;
  meetingTopic?: string;
}

interface TaskCardProps {
  task: Task;
  onMarkComplete?: (task: Task) => void;
  onPriorityChange?: (taskId: string, newPriority: 'high' | 'medium' | 'low') => void;
  compact?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onMarkComplete, onPriorityChange, compact = false }) => {
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Debug: Task ID'sini kontrol et
  React.useEffect(() => {
    console.log('🔍 TaskCard Debug - Task ID:', task.id, 'Task Title:', task.title);
    if (!task.id) {
      console.error('❌ Task ID eksik!', task);
    }
  }, [task]);

  const handlePriorityChange = async (newPriority: 'high' | 'medium' | 'low') => {
    console.log('🔄 Priority change başlatıldı:', {
      taskId: task.id,
      currentPriority: task.priority,
      newPriority,
      hasCallback: !!onPriorityChange
    });

    if (newPriority === task.priority) {
      console.log('⚠️ Aynı priority seçildi, işlem iptal edildi');
      setShowPriorityMenu(false);
      return;
    }

    if (!task.id) {
      console.error('❌ Task ID is missing:', task);
      toast.error('Görev ID\'si bulunamadı');
      setShowPriorityMenu(false);
      return;
    }

    if (!onPriorityChange) {
      console.error('❌ onPriorityChange callback is missing');
      toast.error('Öncelik değiştirme fonksiyonu bulunamadı');
      setShowPriorityMenu(false);
      return;
    }

    setIsUpdating(true);
    try {
      console.log('Updating task priority:', { taskId: task.id, newPriority });
      await apiService.updateTaskPriority(task.id, newPriority);
      onPriorityChange(task.id, newPriority);
      toast.success('Görev önceliği güncellendi!');
    } catch (error) {
      console.error('Priority update error:', error);
      toast.error('Öncelik güncellenirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setIsUpdating(false);
      setShowPriorityMenu(false);
    }
  };
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
      case 'medium':
        return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low':
        return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20';
      default:
        return 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800';
    }
  };

  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-700 dark:text-red-300';
      case 'medium':
        return 'text-yellow-700 dark:text-yellow-300';
      case 'low':
        return 'text-green-700 dark:text-green-300';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'action':
        return <CheckCircle className="w-4 h-4" />;
      case 'reminder':
        return <Clock className="w-4 h-4" />;
      case 'deadline':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'action':
        return 'Eylem';
      case 'reminder':
        return 'Hatırlatma';
      case 'deadline':
        return 'Son Tarih';
      default:
        return 'Görev';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('tr-TR');
    } catch {
      return dateString;
    }
  };

  const isOverdue = task.deadline && new Date(task.deadline) < new Date();

  if (compact) {
    return (
      <div className={`p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${
        getPriorityColor(task.priority)
      } ${isOverdue ? 'ring-1 ring-red-300' : ''}`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs rounded-full">
              {getCategoryIcon(task.category)}
              {getCategoryName(task.category)}
            </span>
            {task.isUrgent && (
              <AlertTriangle className="w-3 h-3 text-red-500" />
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowPriorityMenu(!showPriorityMenu)}
              disabled={isUpdating}
              className={`px-1.5 py-0.5 text-xs font-medium rounded flex items-center gap-1 hover:opacity-80 transition-opacity ${
                task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300' :
                task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300' :
                'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
              } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {task.priority === 'high' ? 'Y' :
               task.priority === 'medium' ? 'O' : 'D'}
              <ChevronDown className="w-2 h-2" />
            </button>
            
            {showPriorityMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 min-w-[80px]">
                <button
                  onClick={() => handlePriorityChange('high')}
                  className="w-full px-2 py-1 text-xs text-left hover:bg-red-50 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 border-b border-gray-100 dark:border-gray-700"
                >
                  Yüksek
                </button>
                <button
                  onClick={() => handlePriorityChange('medium')}
                  className="w-full px-2 py-1 text-xs text-left hover:bg-yellow-50 dark:hover:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-b border-gray-100 dark:border-gray-700"
                >
                  Orta
                </button>
                <button
                  onClick={() => handlePriorityChange('low')}
                  className="w-full px-2 py-1 text-xs text-left hover:bg-green-50 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300"
                >
                  Düşük
                </button>
              </div>
            )}
          </div>
        </div>

        <h3 className={`font-semibold text-xs mb-1 ${getPriorityTextColor(task.priority)} line-clamp-2`}>
          {task.title}
        </h3>

        <p className="text-gray-600 dark:text-gray-300 text-xs mb-2 leading-relaxed line-clamp-2">
          {task.description}
        </p>

        {task.deadline && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
            <Calendar className="w-2.5 h-2.5" />
            <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
              {formatDate(task.deadline)}
            </span>
          </div>
        )}

        {onMarkComplete && (
          <button
            onClick={() => onMarkComplete(task)}
            className="w-full px-2 py-1 text-xs font-medium text-white bg-blue-600 dark:bg-blue-700 rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center gap-1"
          >
            <CheckCircle className="w-2.5 h-2.5" />
            Tamamla
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
      getPriorityColor(task.priority)
    } ${isOverdue ? 'ring-2 ring-red-300' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs rounded-full">
            {getCategoryIcon(task.category)}
            {getCategoryName(task.category)}
          </span>
          {task.isUrgent && (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowPriorityMenu(!showPriorityMenu)}
              disabled={isUpdating}
              className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 hover:opacity-80 transition-opacity ${
                task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300' :
                task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300' :
                'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'
              } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {task.priority === 'high' ? 'Yüksek' :
               task.priority === 'medium' ? 'Orta' : 'Düşük'}
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {showPriorityMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 min-w-[100px]">
                <button
                  onClick={() => handlePriorityChange('high')}
                  className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 border-b border-gray-100 dark:border-gray-700"
                >
                  Yüksek
                </button>
                <button
                  onClick={() => handlePriorityChange('medium')}
                  className="w-full px-3 py-2 text-xs text-left hover:bg-yellow-50 dark:hover:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-b border-gray-100 dark:border-gray-700"
                >
                  Orta
                </button>
                <button
                  onClick={() => handlePriorityChange('low')}
                  className="w-full px-3 py-2 text-xs text-left hover:bg-green-50 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300"
                >
                  Düşük
                </button>
              </div>
            )}
          </div>
          {task.isUrgent && (
            <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 rounded-full">
              Acil
            </span>
          )}
        </div>
      </div>

      <h3 className={`font-semibold text-sm mb-2 ${getPriorityTextColor(task.priority)}`}>
        {task.title}
      </h3>

      <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 leading-relaxed">
        {task.description}
      </p>

      <div className="space-y-2">
        {task.deadline && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Calendar className="w-3 h-3" />
            <span className={isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
              Son tarih: {formatDate(task.deadline)}
              {isOverdue && ' (Geçmiş)'}
            </span>
          </div>
        )}

        {task.meetingDate && task.meetingTopic && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="w-3 h-3" />
            <span>
              {formatDate(task.meetingDate)} - {task.meetingTopic}
            </span>
          </div>
        )}
      </div>

      {onMarkComplete && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onMarkComplete(task)}
            className="w-full px-3 py-2 text-xs font-medium text-white bg-blue-600 dark:bg-blue-700 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-3 h-3" />
            Tamamlandı Olarak İşaretle
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskCard;