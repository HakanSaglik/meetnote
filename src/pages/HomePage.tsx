import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MessageCircleQuestion, FileText, TrendingUp, Clock, Users, AlertTriangle, Settings } from 'lucide-react';
import { MeetingCard } from '../components/MeetingCard';
import { StatCard } from '../components/StatCard';
import { SkeletonCard, SkeletonText } from '../components/LoadingSpinner';
import { apiService } from '../services/api';
import { Meeting } from '../types/meeting';
import { handleApiError, createErrorContext } from '../utils/errorHandler';

export const HomePage: React.FC = () => {
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState({
    totalMeetings: 0,
    thisMonth: 0,
    withRevisions: 0
  });
  const [loading, setLoading] = useState(true);
  const [hasApiKeys, setHasApiKeys] = useState(true);
  const [apiStatus, setApiStatus] = useState<'checking' | 'working' | 'error' | 'none'>('checking');

  useEffect(() => {
    loadData();
    checkApiKeys();
  }, []);

  const checkApiKeys = async () => {
    try {
      setApiStatus('checking');
      
      // First check if any providers are configured
      const providersData = await apiService.getAIProviders();
      const configuredProviders = providersData.providers.filter(p => p.configured);
      
      if (configuredProviders.length === 0) {
        setHasApiKeys(false);
        setApiStatus('none');
        return;
      }
      
      setHasApiKeys(true);
      
      // Test if at least one provider is working
      let anyWorking = false;
      for (const provider of configuredProviders) {
        try {
          const testResult = await apiService.testAIProvider(provider.name);
          if (testResult.working) {
            anyWorking = true;
            break;
          }
        } catch (error) {
          console.error(`Provider ${provider.name} test failed:`, error);
          // Don't show toast for individual provider failures during bulk testing
        }
      }
      
      setApiStatus(anyWorking ? 'working' : 'error');
    } catch (error) {
      console.error('API anahtarları kontrol edilirken hata:', error);
      handleApiError(error, createErrorContext('API anahtarları kontrolü'));
      setHasApiKeys(false);
      setApiStatus('error');
    }
  };

  const loadData = async () => {
    try {
      const response = await apiService.getMeetings({ page: 1, limit: 4 });
      
      // Güvenli erişim kontrolü
      if (!response || !response.meetings || !response.pagination) {
        console.error('Invalid API response structure:', response);
        setRecentMeetings([]);
        setStats({ totalMeetings: 0, thisMonth: 0, withRevisions: 0 });
        return;
      }
      
      setRecentMeetings(response.meetings);
      
      // Calculate stats
      const total = response.pagination.total || 0;
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const thisMonth = response.meetings.filter(meeting => {
        const meetingDate = new Date(meeting.date);
        return meetingDate.getMonth() === currentMonth && meetingDate.getFullYear() === currentYear;
      }).length;

      const withRevisions = response.meetings.filter(meeting => meeting.revised_from_id).length;

      setStats({
        totalMeetings: total,
        thisMonth,
        withRevisions
      });
    } catch (error) {
      console.error('Error loading data:', error);
      handleApiError(error, createErrorContext('Veri yükleme', 'Ana sayfa'));
      setRecentMeetings([]);
      setStats({ totalMeetings: 0, thisMonth: 0, withRevisions: 0 });
    } finally {
      setLoading(false);
    }
  };



  const quickActions = [
    {
      title: 'Yeni Toplantı Ekle',
      description: 'Toplantı notlarınızı ve kararlarınızı kaydedin',
      icon: Calendar,
      href: '/add-meeting',
      color: 'indigo',
      gradient: 'from-indigo-500 to-purple-600'
    },
    {
      title: 'AI\'ya Soru Sor',
      description: 'Geçmiş kararlar hakkında bilgi alın',
      icon: MessageCircleQuestion,
      href: '/ask-question',
      color: 'emerald',
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      title: 'Tüm Toplantılar',
      description: 'Geçmiş toplantıları inceleyin ve düzenleyin',
      icon: FileText,
      href: '/meetings',
      color: 'blue',
      gradient: 'from-blue-500 to-indigo-600'
    }
  ];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 px-4 dark:bg-gray-900">
        {/* Hero Section Skeleton */}
        <div className="text-center space-y-4 py-8">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-80 mx-auto animate-pulse"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-96 mx-auto animate-pulse"></div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>

        {/* Quick Actions Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
              <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </div>
          ))}
        </div>

        {/* Recent Meetings Skeleton */}
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8 relative">
        <div className="relative z-10">
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent dark:from-violet-400 dark:via-purple-400 dark:to-fuchsia-400">
            Toplantı Hafızası
          </h1>
          <div className="w-16 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 mx-auto my-3 rounded-full"></div>
          <p className="text-base lg:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            AI destekli toplantı yönetim sistemi ile kararlarınızı kaydedin ve takip edin
          </p>
        </div>
      </div>

      {/* API Status Warning */}
      {(apiStatus === 'none' || apiStatus === 'error') && (
        <div className={`border rounded-xl p-6 animate-fade-in-up ${
          apiStatus === 'none' 
            ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 dark:from-amber-900/20 dark:to-orange-900/20 dark:border-amber-700'
            : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200 dark:from-red-900/20 dark:to-pink-900/20 dark:border-red-700'
        }`}>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <AlertTriangle className={`h-6 w-6 ${
                apiStatus === 'none' ? 'text-amber-600' : 'text-red-600'
              }`} />
            </div>
            <div className="flex-1">
              <h3 className={`text-lg font-semibold mb-2 ${
                apiStatus === 'none' ? 'text-amber-800' : 'text-red-800'
              }`}>
                {apiStatus === 'none' 
                  ? 'AI Özelliklerini Kullanmak İçin API Anahtarı Gerekli'
                  : 'API Anahtarları Çalışmıyor'
                }
              </h3>
              <p className={`mb-4 ${
                apiStatus === 'none' ? 'text-amber-700' : 'text-red-700'
              }`}>
                {apiStatus === 'none'
                  ? 'AI destekli soru-cevap özelliğini kullanabilmek için en az bir AI sağlayıcısının API anahtarını eklemeniz gerekiyor. Gemini, OpenAI (ChatGPT) veya Claude API anahtarlarınızı ayarlar sayfasından ekleyebilirsiniz.'
                  : 'API anahtarlarınız yapılandırılmış ancak çalışmıyor. Lütfen API anahtarlarınızın geçerli olduğundan ve hesabınızda yeterli kredi bulunduğundan emin olun.'
                }
              </p>
              <Link
                to="/settings"
                className={`inline-flex items-center px-4 py-2 text-white font-medium rounded-lg transition-colors duration-200 ${
                  apiStatus === 'none'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                <Settings className="w-4 h-4 mr-2" />
                {apiStatus === 'none' ? 'API Anahtarlarını Ekle' : 'API Anahtarlarını Kontrol Et'}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="animate-fade-in-up" style={{animationDelay: '0.1s'}}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{stats.totalMeetings}</p>
                <p className="text-sm text-gray-600 font-medium">Toplam Toplantı</p>
              </div>
            </div>
          </div>
        </div>
        <div className="animate-fade-in-up" style={{animationDelay: '0.2s'}}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.thisMonth}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Bu Ay</p>
              </div>
            </div>
          </div>
        </div>
        <div className="animate-fade-in-up" style={{animationDelay: '0.3s'}}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.withRevisions}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Revizyon Yapılan</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-6 relative">
        {/* Section Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-50/50 via-purple-50/50 to-fuchsia-50/50 dark:from-violet-900/20 dark:via-purple-900/20 dark:to-fuchsia-900/20 rounded-2xl -mx-6 -my-6"></div>
        
        <div className="relative z-10">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent text-center animate-fade-in-up">✨ Hızlı İşlemler</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {quickActions.map((action, index) => (
              <div key={action.title} className="animate-fade-in-up" style={{animationDelay: `${0.4 + index * 0.1}s`}}>
                <Link
                  to={action.href}
                  className="group relative overflow-hidden rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 shadow-md border border-white/50 dark:border-gray-700/50 hover:shadow-lg hover:-translate-y-1 hover:scale-102 transition-all duration-300 block"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-15 transition-opacity duration-300`} />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
                  <div className="relative z-10 space-y-3">
                    <div className="flex items-center justify-center">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${action.gradient} shadow-md group-hover:scale-110 transition-all duration-300`}>
                        <action.icon className="w-6 h-6 text-white drop-shadow-lg" />
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent group-hover:from-violet-600 group-hover:to-fuchsia-600 transition-all duration-300">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                        {action.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-center pt-2">
                      <span className="inline-flex items-center space-x-1 text-sm font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent group-hover:from-fuchsia-600 group-hover:to-violet-600 transition-all duration-300">
                        <span>🚀 Başla</span>
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-all duration-300 text-violet-500 ml-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>



      {/* Recent Meetings */}
      {recentMeetings && recentMeetings.length > 0 && (
        <div className="space-y-6 relative">
          {/* Section Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-indigo-50/30 to-purple-50/30 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 rounded-2xl -mx-6 -my-6"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between animate-fade-in-up" style={{animationDelay: '0.7s'}}>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">📋 Son Toplantılar</h2>
                <div className="w-12 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 mt-2 rounded-full"></div>
              </div>
              <Link
                to="/meetings"
                className="group inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 text-sm"
              >
                <span>Tümünü Gör</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {recentMeetings && recentMeetings.map((meeting, index) => (
                <div key={meeting.uuid} className="animate-fade-in-up" style={{animationDelay: `${0.8 + index * 0.1}s`}}>
                  <MeetingCard
                    meeting={meeting}
                    className="hover:shadow-lg hover:scale-102 transition-all duration-300 transform hover:-translate-y-1 dark:bg-gray-800 dark:border-gray-700"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {recentMeetings.length === 0 && (
        <div className="text-center py-12 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
          <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Henüz toplantı kaydı yok</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">İlk toplantı notunuzu ekleyerek başlayın</p>
          <Link
            to="/add-meeting"
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors duration-200"
          >
            <Calendar className="w-5 h-5 mr-2" />
            İlk Toplantıyı Ekle
          </Link>
        </div>
      )}
    </div>
  );
};

export default HomePage;