import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, X, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import TaskCard from './TaskCard';
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

interface MeetingGroup {
  meetingDate: string;
  meetingTopic: string;
  tasks: Task[];
  isExpanded: boolean;
}

interface CategoryGroup {
  category: 'action' | 'reminder' | 'deadline';
  categoryName: string;
  tasks: Task[];
  isExpanded: boolean;
}

interface TaskSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const TaskSidebar: React.FC<TaskSidebarProps> = ({ isOpen, onToggle }) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetingGroups, setMeetingGroups] = useState<MeetingGroup[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'category' | 'all'>('grouped');
  // localStorage'dan tamamlanan görev ID'lerini yükle
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('completedTaskIds');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Component mount olduğunda görevleri yükle ve event listener'ları ekle
  useEffect(() => {
    let isMounted = true;
    
    const loadTasksOnMount = async () => {
      if (isMounted) {
        await loadTasks();
      }
    };
    
    loadTasksOnMount();
    
    // Event listener'ları ekle
    const handleMeetingAdded = () => {
      console.log('📅 Meeting added event detected, refreshing tasks...');
      if (isMounted) {
        loadTasks();
      }
    };
    
    const handleMeetingDeleted = () => {
      console.log('🗑️ Meeting deleted event detected, refreshing tasks...');
      if (isMounted) {
        loadTasks();
      }
    };
    
    const handleTasksUpdated = () => {
      console.log('🔄 Tasks updated event detected, refreshing tasks...');
      if (isMounted) {
        loadTasks();
      }
    };
    
    // Custom event listener'ları ekle
    window.addEventListener('meetingAdded', handleMeetingAdded);
    window.addEventListener('meetingDeleted', handleMeetingDeleted);
    window.addEventListener('tasksUpdated', handleTasksUpdated);
    
    return () => {
      isMounted = false;
      window.removeEventListener('meetingAdded', handleMeetingAdded);
      window.removeEventListener('meetingDeleted', handleMeetingDeleted);
      window.removeEventListener('tasksUpdated', handleTasksUpdated);
    };
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await apiService.getImportantTasks();
      
      // Validate tasks have IDs before setting state
      const validTasks = (data.tasks || []).map((task, index) => {
        if (!task.id) {
          console.error(`Task ${index} missing ID:`, task);
          return { ...task, id: `fallback-${index}-${Date.now()}` };
        }
        return task;
      });
      
      // Backend already filters completed tasks, but we also need to sync with localStorage
      // to handle cases where frontend state might be out of sync
      const activeTasks = validTasks.filter(task => !completedTaskIds.has(task.id));
      
      // Clean up localStorage: remove completed task IDs that no longer exist in backend
      const currentTaskIds = new Set(validTasks.map(task => task.id));
      const updatedCompletedIds = new Set([...completedTaskIds].filter(id => currentTaskIds.has(id)));
      
      // Update localStorage if there were changes
      if (updatedCompletedIds.size !== completedTaskIds.size) {
        setCompletedTaskIds(updatedCompletedIds);
        localStorage.setItem('completedTaskIds', JSON.stringify([...updatedCompletedIds]));
        console.log(`🧹 Cleaned up localStorage: removed ${completedTaskIds.size - updatedCompletedIds.size} obsolete completed task IDs`);
      }
      
      setTasks(activeTasks);
      
      // Group tasks by meeting
      const grouped = groupTasksByMeeting(activeTasks);
      setMeetingGroups(grouped);
      
      // Group tasks by category
      const categoryGrouped = groupTasksByCategory(activeTasks);
      setCategoryGroups(categoryGrouped);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
      setMeetingGroups([]);
    } finally {
      setLoading(false);
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

  const groupTasksByMeeting = (tasks: Task[]): MeetingGroup[] => {
    const groups: { [key: string]: MeetingGroup } = {};
    
    tasks.forEach(task => {
      if (task.meetingDate && task.meetingTopic) {
        const key = `${task.meetingDate}-${task.meetingTopic}`;
        if (!groups[key]) {
          groups[key] = {
            meetingDate: task.meetingDate,
            meetingTopic: task.meetingTopic,
            tasks: [],
            isExpanded: false
          };
        }
        groups[key].tasks.push(task);
      }
    });
    
    return Object.values(groups).sort((a, b) => 
      new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime()
    );
  };

  const groupTasksByCategory = (tasks: Task[]): CategoryGroup[] => {
    const groups: { [key: string]: CategoryGroup } = {};
    
    tasks.forEach(task => {
      const category = task.category || 'action';
      if (!groups[category]) {
        groups[category] = {
          category: category as 'action' | 'reminder' | 'deadline',
          categoryName: getCategoryName(category),
          tasks: [],
          isExpanded: true
        };
      }
      groups[category].tasks.push(task);
    });
    
    // Kategori sıralaması: action, deadline, reminder
    const categoryOrder = ['action', 'deadline', 'reminder'];
    return categoryOrder
      .filter(cat => groups[cat])
      .map(cat => groups[cat]);
  };

  const toggleMeetingGroup = (meetingDate: string, meetingTopic: string) => {
    setMeetingGroups(prev => prev.map(group => 
      group.meetingDate === meetingDate && group.meetingTopic === meetingTopic
        ? { ...group, isExpanded: !group.isExpanded }
        : group
    ));
  };

  const toggleCategoryGroup = (category: string) => {
    setCategoryGroups(prev => prev.map(group => 
      group.category === category
        ? { ...group, isExpanded: !group.isExpanded }
        : group
    ));
  };

  const handlePriorityChange = async (taskId: string, newPriority: 'high' | 'medium' | 'low') => {
    console.log('📋 TaskSidebar handlePriorityChange çağrıldı:', { taskId, newPriority });
    try {
      console.log('🌐 API çağrısı başlatılıyor...');
      await apiService.updateTaskPriority(taskId, newPriority);
      console.log('✅ API çağrısı başarılı!');
      
      // Update tasks in state
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, priority: newPriority } : task
      ));
      
      // Update meeting groups
      setMeetingGroups(prev => prev.map(group => ({
        ...group,
        tasks: group.tasks.map(task => 
          task.id === taskId ? { ...task, priority: newPriority } : task
        )
      })));
      
      // Update category groups
      setCategoryGroups(prev => prev.map(group => ({
        ...group,
        tasks: group.tasks.map(task => 
          task.id === taskId ? { ...task, priority: newPriority } : task
        )
      })));
      
      toast.success('Görev önceliği güncellendi!');
    } catch (error) {
      console.error('❌ TaskSidebar Priority Update Error:', error);
      toast.error('Öncelik güncellenirken hata oluştu');
      console.log('🔍 Error details:', {
        message: error.message,
        stack: error.stack,
        taskId,
        newPriority
      });
    }
  };

  const handleMarkTaskComplete = async (task: Task) => {
    try {
      console.log('🔄 Görev tamamlanıyor:', task);
      console.log('🔍 Task ID:', task.id);
      
      // API'ye tamamlanan görevi gönder
      const response = await apiService.completeTask(task.id, task);
      console.log('✅ API Response:', response);
      
      // Tamamlanan görev ID'sini state'e ekle ve localStorage'a kaydet
      setCompletedTaskIds(prev => {
        const newSet = new Set([...prev, task.id]);
        localStorage.setItem('completedTaskIds', JSON.stringify([...newSet]));
        return newSet;
      });
      
      // Görevi listeden kaldır
      console.log('🗑️ Görevi listeden kaldırıyor...');
      setTasks(prev => {
        const newTasks = prev.filter(t => t.id !== task.id);
        console.log('📝 Önceki görevler:', prev.length, 'Yeni görevler:', newTasks.length);
        return newTasks;
      });
      
      // Grupları da güncelle
      console.log('📂 Grupları güncelleniyor...');
      setMeetingGroups(prev => {
        const newGroups = prev.map(group => ({
          ...group,
          tasks: group.tasks.filter(t => t.id !== task.id)
        })).filter(group => group.tasks.length > 0);
        console.log('📊 Önceki gruplar:', prev.length, 'Yeni gruplar:', newGroups.length);
        return newGroups;
      });
      
      // Kategori gruplarını da güncelle
      console.log('📋 Kategori grupları güncelleniyor...');
      setCategoryGroups(prev => {
        const newCategoryGroups = prev.map(group => ({
          ...group,
          tasks: group.tasks.filter(t => t.id !== task.id)
        })).filter(group => group.tasks.length > 0);
        console.log('📊 Önceki kategori grupları:', prev.length, 'Yeni kategori grupları:', newCategoryGroups.length);
        return newCategoryGroups;
      });
      
      toast.success('Görev tamamlandı ve arşivlendi!');
      
      // Görevler sayfasına yönlendir
      navigate('/completed-tasks');
    } catch (error) {
      console.error('❌ Task completion error:', error);
      toast.error('Görev tamamlanırken hata oluştu');
    }
  };

  // Periodic refresh for tasks (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Periodic task refresh...');
      loadTasks();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed top-0 right-0 h-full w-72 bg-white dark:bg-gray-800 shadow-lg z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto lg:shadow-lg
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Önemli Görevler</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadTasks}
              disabled={loading}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
              title="Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onToggle}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 gap-1">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-2 py-2 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'grouped'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Toplantılar
            </button>
            <button
              onClick={() => setViewMode('category')}
              className={`px-2 py-2 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'category'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Kategoriler
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-2 py-2 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'all'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              Tümü
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 dark:border-red-400 mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Görevler yükleniyor...</p>
            </div>
          ) : viewMode === 'grouped' ? (
            meetingGroups.length > 0 ? (
              <div className="space-y-4">
                {meetingGroups.map((group, groupIndex) => (
                  <div key={`${group.meetingDate}-${group.meetingTopic}`} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    {/* Meeting Header */}
                    <button
                      onClick={() => toggleMeetingGroup(group.meetingDate, group.meetingTopic)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-between text-left"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{group.meetingTopic}</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(group.meetingDate).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                        <span className="inline-block mt-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                          {group.tasks.length} görev
                        </span>
                      </div>
                      {group.isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      )}
                    </button>
                    
                    {/* Meeting Tasks */}
                    {group.isExpanded && (
                      <div className="p-4 space-y-3 bg-white dark:bg-gray-800">
                        {group.tasks.map((task, taskIndex) => (
                          <div key={task.id || `${task.title}-${taskIndex}`} className="transform hover:scale-105 transition-transform">
                            <TaskCard
                              task={task}
                              onMarkComplete={handleMarkTaskComplete}
                              onPriorityChange={handlePriorityChange}
                              compact={true}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 dark:text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Harika!</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Şu anda toplantıya bağlı görev yok</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Toplantı ekledikten sonra AI otomatik analiz yapacak</p>
              </div>
            )
          ) : viewMode === 'category' ? (
            categoryGroups.length > 0 ? (
              <div className="space-y-4">
                {categoryGroups.map((group, groupIndex) => (
                  <div key={group.category} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategoryGroup(group.category)}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-between text-left"
                    >
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{group.categoryName}</h3>
                        <span className="inline-block mt-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 text-xs rounded-full">
                          {group.tasks.length} görev
                        </span>
                      </div>
                      {group.isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      )}
                    </button>
                    
                    {/* Category Tasks */}
                    {group.isExpanded && (
                      <div className="p-4 space-y-3 bg-white dark:bg-gray-800">
                        {group.tasks.map((task, taskIndex) => (
                          <div key={task.id || `${task.title}-${taskIndex}`} className="transform hover:scale-105 transition-transform">
                            <TaskCard
                              task={task}
                              onMarkComplete={handleMarkTaskComplete}
                              onPriorityChange={handlePriorityChange}
                              compact={true}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 dark:text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Harika!</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Şu anda kategorize edilmiş görev yok</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Toplantı ekledikten sonra AI otomatik analiz yapacak</p>
              </div>
            )
          ) : (
            tasks.length > 0 ? (
              <div className="space-y-4">
                {tasks.map((task, index) => (
                  <div key={task.id || `${task.title}-${index}`} className="transform hover:scale-105 transition-transform">
                    <TaskCard
                      task={task}
                      onMarkComplete={handleMarkTaskComplete}
                      onPriorityChange={handlePriorityChange}
                      compact={true}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 dark:text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Harika!</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Şu anda acil görev yok</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Toplantı ekledikten sonra AI otomatik analiz yapacak</p>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            🤖 AI tarafından analiz edilen görevler
          </p>
        </div>
      </div>
    </>
  );
};