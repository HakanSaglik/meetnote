import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Filter, Calendar, Tag, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MeetingCard } from '../components/MeetingCard';
import { Pagination } from '../components/Pagination';
import { SkeletonCard } from '../components/LoadingSpinner';
import { apiService } from '../services/api';
import { Meeting, MeetingsResponse } from '../types/meeting';
import { handleApiError, createErrorContext } from '../utils/errorHandler';

export const MeetingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    search: '',
    tags: ''
  });

  useEffect(() => {
    loadMeetings();
  }, [pagination.page, filters]);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMeetings({
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search,
        tags: filters.tags
      });
      
      setMeetings(response.meetings);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages
      }));
    } catch (error) {
      console.error('Failed to load meetings:', error);
      handleApiError(error, createErrorContext('Toplantılar yükleme'));
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleFilterChange = (field: 'search' | 'tags', value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ search: '', tags: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Get unique tags from meetings for suggestions
  const allTags = meetings.flatMap(meeting => 
    meeting.tags?.split(',').map(tag => tag.trim()).filter(Boolean) || []
  );
  const uniqueTags = [...new Set(allTags)];

  const hasActiveFilters = filters.search || filters.tags;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Geri Dön
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tüm Toplantılar</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Toplam {pagination.total} toplantı kaydı
            </p>
          </div>
          
          <Link
            to="/add-meeting"
            className="flex items-center px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white font-medium rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Toplantı
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Search className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
              Ara
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Konu, karar veya notlarda ara..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Tags Filter */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Tag className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
              Etiketler
            </label>
            <input
              type="text"
              value={filters.tags}
              onChange={(e) => handleFilterChange('tags', e.target.value)}
              placeholder="Etiket ara..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* Suggested Tags */}
        {uniqueTags.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Popüler etiketler:</p>
            <div className="flex flex-wrap gap-2">
              {uniqueTags.slice(0, 10).map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleFilterChange('tags', tag)}
                  className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors duration-200"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center"
            >
              <Filter className="w-4 h-4 mr-1" />
              Filtreleri Temizle
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: pagination.limit }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      )}

      {/* Meetings Grid */}
      {!loading && (
        <>
          {meetings.length === 0 ? (
            <div className="text-center py-12 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
              <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {hasActiveFilters ? 'Arama kriterlerine uygun toplantı bulunamadı' : 'Henüz toplantı kaydı yok'}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {hasActiveFilters 
                  ? 'Farklı arama terimleri deneyebilir veya filtreleri temizleyebilirsiniz' 
                  : 'İlk toplantı notunuzu ekleyerek başlayın'
                }
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Filtreleri Temizle
                </button>
              ) : (
                <Link
                  to="/add-meeting"
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white font-medium rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors duration-200"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  İlk Toplantıyı Ekle
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                {meetings.map((meeting, index) => (
                  <MeetingCard
                    key={meeting.uuid}
                    meeting={meeting}
                    className="hover:shadow-lg transition-all duration-300"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animation: 'fadeInUp 0.6s ease-out forwards'
                    }}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default MeetingsPage;