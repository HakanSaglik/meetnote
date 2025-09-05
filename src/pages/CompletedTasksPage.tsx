import React, { useState, useEffect } from 'react';
import { CheckCircle, Calendar, Clock, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

interface CompletedTask {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  isUrgent: boolean;
  deadline?: string;
  category: 'action' | 'reminder' | 'deadline';
  meetingDate?: string;
  meetingTopic?: string;
  completedAt: string;
}

interface MeetingGroup {
  meetingTitle: string;
  tasks: CompletedTask[];
}

interface CompletedTasksData {
  [category: string]: {
    [meetingId: string]: MeetingGroup;
  };
}

const CompletedTasksPage: React.FC = () => {
  const [completedTasks, setCompletedTasks] = useState<CompletedTasksData>({});
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedMeetings, setExpandedMeetings] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'meetings' | 'categories' | 'all'>('categories');

  const loadCompletedTasks = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCompletedTasks();
      setCompletedTasks(response.completedTasks);
      setTotalCompleted(response.totalCompleted);
      
      // Varsayılan olarak tüm kategorileri aç
      setExpandedCategories(new Set(Object.keys(response.completedTasks)));
    } catch (error) {
      console.error('Failed to load completed tasks:', error);
      toast.error('Tamamlanan görevler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await apiService.deleteCompletedTask(taskId);
      toast.success('Görev başarıyla silindi');
      loadCompletedTasks(); // Refresh the list
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Görev silinirken hata oluştu');
    }
  };

  useEffect(() => {
    loadCompletedTasks();
  }, []);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const toggleMeeting = (meetingKey: string) => {
    setExpandedMeetings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(meetingKey)) {
        newSet.delete(meetingKey);
      } else {
        newSet.add(meetingKey);
      }
      return newSet;
    });
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
        return 'Eylem Gerektiren';
      case 'reminder':
        return 'Hatırlatma';
      case 'deadline':
        return 'Son Tarih';
      default:
        return 'Diğer';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Görevleri toplantılara göre grupla
  const getTasksByMeetings = () => {
    const meetingGroups: { [key: string]: { meetingTitle: string; tasks: any[] } } = {};
    
    Object.values(completedTasks).forEach(categoryData => {
      Object.entries(categoryData).forEach(([meetingId, meetingGroup]) => {
        if (!meetingGroups[meetingId]) {
          meetingGroups[meetingId] = {
            meetingTitle: meetingGroup.meetingTitle,
            tasks: []
          };
        }
        meetingGroups[meetingId].tasks.push(...meetingGroup.tasks);
      });
    });
    
    return meetingGroups;
  };

  // Tüm görevleri düz liste olarak al
  const getAllTasks = () => {
    const allTasks: any[] = [];
    
    Object.values(completedTasks).forEach(categoryData => {
      Object.values(categoryData).forEach(meetingGroup => {
        allTasks.push(...meetingGroup.tasks);
      });
    });
    
    return allTasks.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500 dark:text-blue-400" />
            <span className="ml-2 text-lg text-gray-600 dark:text-gray-300">Tamamlanan görevler yükleniyor...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Tamamlanan Görevler</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Toplam {totalCompleted} görev tamamlandı ve arşivlendi.
              </p>
            </div>
            <button
              onClick={loadCompletedTasks}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Yenile
            </button>
          </div>
          
          {/* View Mode Selector */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setViewMode('meetings')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'meetings'
                  ? 'bg-blue-600 dark:bg-blue-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Toplantılar
            </button>
            <button
              onClick={() => setViewMode('categories')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'categories'
                  ? 'bg-blue-600 dark:bg-blue-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Kategoriler
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'all'
                  ? 'bg-blue-600 dark:bg-blue-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Tümü
            </button>
          </div>
        </div>

        {/* Content */}
        {Object.keys(completedTasks).length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">Henüz tamamlanan görev yok</h3>
            <p className="text-gray-500 dark:text-gray-400">Görevleri tamamladığınızda burada görünecekler.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Categories View */}
            {viewMode === 'categories' && Object.entries(completedTasks).map(([category, meetings]) => {
              const isExpanded = expandedCategories.has(category);
              const totalTasksInCategory = Object.values(meetings).reduce(
                (sum, meeting) => sum + meeting.tasks.length,
                0
              );

              return (
                <div key={category} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{getCategoryName(category)}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{totalTasksInCategory} görev</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {isExpanded ? 'Gizle' : 'Göster'}
                      </span>
                      <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Category Content */}
                  {isExpanded && (
                    <div className="px-6 pb-6">
                      <div className="space-y-4">
                        {Object.entries(meetings).map(([meetingId, meetingGroup]) => {
                          const meetingKey = `${category}-${meetingId}`;
                          const isMeetingExpanded = expandedMeetings.has(meetingKey);

                          return (
                            <div key={meetingId} className="border border-gray-200 dark:border-gray-600 rounded-lg">
                              {/* Meeting Header */}
                              <button
                                onClick={() => toggleMeeting(meetingKey)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                  <div className="text-left">
                                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{meetingGroup.meetingTitle}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{meetingGroup.tasks.length} görev</p>
                                  </div>
                                </div>
                                <div className={`transform transition-transform ${isMeetingExpanded ? 'rotate-180' : ''}`}>
                                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </button>

                              {/* Meeting Tasks */}
                              {isMeetingExpanded && (
                                <div className="px-4 pb-4">
                                  <div className="space-y-3">
                                    {meetingGroup.tasks.map((task) => (
                                      <div
                                        key={task.id}
                                        className={`p-4 rounded-lg border transition-all duration-200 ${getPriorityColor(task.priority)}`}
                                      >
                                        <div className="flex items-start justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <div className={`flex items-center gap-1 ${getPriorityTextColor(task.priority)}`}>
                                              {getCategoryIcon(task.category)}
                                              <span className="text-xs font-medium">{getCategoryName(task.category)}</span>
                                            </div>
                                            {task.isUrgent && (
                                              <AlertTriangle className="w-4 h-4 text-red-500" />
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                              task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                              task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                              'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                            }`}>
                                              {task.priority === 'high' ? 'Yüksek' :
                                               task.priority === 'medium' ? 'Orta' : 'Düşük'}
                                            </span>
                                            {task.isUrgent && (
                                              <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
                                                Acil
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <h4 className={`font-semibold text-sm mb-2 ${getPriorityTextColor(task.priority)}`}>
                                          {task.title}
                                        </h4>

                                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 leading-relaxed">
                                          {task.description}
                                        </p>

                                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                          <div className="flex items-center gap-4">
                                            {task.deadline && (
                                              <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                <span>Son tarih: {formatDate(task.deadline)}</span>
                                              </div>
                                            )}
                                            {task.meetingDate && (
                                              <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span>Toplantı: {formatDate(task.meetingDate)}</span>
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1">
                                              <CheckCircle className="w-3 h-3 text-green-500 dark:text-green-400" />
                                              <span className="text-green-600 dark:text-green-400 font-medium">
                                                {formatDate(task.completedAt)} tarihinde tamamlandı
                                              </span>
                                            </div>
                                            <button
                                              onClick={() => handleDeleteTask(task.id)}
                                              className="p-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                              title="Görevi sil"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Meetings View */}
            {viewMode === 'meetings' && Object.entries(getTasksByMeetings()).map(([meetingId, meetingGroup]) => {
              const isMeetingExpanded = expandedMeetings.has(meetingId);
              
              return (
                <div key={meetingId} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => toggleMeeting(meetingId)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{meetingGroup.meetingTitle}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{meetingGroup.tasks.length} görev</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {isMeetingExpanded ? 'Gizle' : 'Göster'}
                      </span>
                      <div className={`transform transition-transform ${isMeetingExpanded ? 'rotate-180' : ''}`}>
                        <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                  
                  {isMeetingExpanded && (
                    <div className="px-6 pb-6">
                      <div className="space-y-3">
                        {meetingGroup.tasks.map((task) => (
                          <div
                            key={task.id}
                            className={`p-4 rounded-lg border transition-all duration-200 ${getPriorityColor(task.priority)}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`flex items-center gap-1 ${getPriorityTextColor(task.priority)}`}>
                                  {getCategoryIcon(task.category)}
                                  <span className="text-xs font-medium">{getCategoryName(task.category)}</span>
                                </div>
                                {task.isUrgent && (
                                  <AlertTriangle className="w-4 h-4 text-red-500" />
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                                  task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                  'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                }`}>
                                  {task.priority === 'high' ? 'Yüksek' :
                                   task.priority === 'medium' ? 'Orta' : 'Düşük'}
                                </span>
                                {task.isUrgent && (
                                  <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
                                    Acil
                                  </span>
                                )}
                              </div>
                            </div>

                            <h4 className={`font-semibold text-sm mb-2 ${getPriorityTextColor(task.priority)}`}>
                              {task.title}
                            </h4>

                            <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 leading-relaxed">
                              {task.description}
                            </p>

                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-4">
                                {task.deadline && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>Son tarih: {formatDate(task.deadline)}</span>
                                  </div>
                                )}
                                {task.meetingDate && (
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>Toplantı: {formatDate(task.meetingDate)}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-green-500 dark:text-green-400" />
                                  <span className="text-green-600 dark:text-green-400 font-medium">
                                    {formatDate(task.completedAt)} tarihinde tamamlandı
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                  title="Görevi sil"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* All Tasks View */}
            {viewMode === 'all' && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tüm Tamamlanan Görevler</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{getAllTasks().length} görev (en yeniden eskiye)</p>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {getAllTasks().map((task) => (
                      <div
                        key={task.id}
                        className={`p-4 rounded-lg border transition-all duration-200 ${getPriorityColor(task.priority)}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1 ${getPriorityTextColor(task.priority)}`}>
                              {getCategoryIcon(task.category)}
                              <span className="text-xs font-medium">{getCategoryName(task.category)}</span>
                            </div>
                            {task.isUrgent && (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              task.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                              task.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                              'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            }`}>
                              {task.priority === 'high' ? 'Yüksek' :
                               task.priority === 'medium' ? 'Orta' : 'Düşük'}
                            </span>
                            {task.isUrgent && (
                              <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
                                Acil
                              </span>
                            )}
                          </div>
                        </div>

                        <h4 className={`font-semibold text-sm mb-2 ${getPriorityTextColor(task.priority)}`}>
                          {task.title}
                        </h4>

                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 leading-relaxed">
                          {task.description}
                        </p>

                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-4">
                            {task.deadline && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>Son tarih: {formatDate(task.deadline)}</span>
                              </div>
                            )}
                            {task.meetingDate && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Toplantı: {formatDate(task.meetingDate)}</span>
                              </div>
                            )}
                            {task.meetingTopic && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>Toplantı: {task.meetingTopic}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-500 dark:text-green-400" />
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                {formatDate(task.completedAt)} tarihinde tamamlandı
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Görevi sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompletedTasksPage;