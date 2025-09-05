import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Tag, MessageSquare, ExternalLink, RefreshCw, Bot } from 'lucide-react';
import { Meeting } from '../types/meeting';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { apiService } from '../services/api';
import { toast } from 'react-hot-toast';

interface MeetingCardProps {
  meeting: Meeting;
  className?: string;
  style?: React.CSSProperties;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({ 
  meeting, 
  className = '', 
  style 
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const formattedDate = format(new Date(meeting.date), 'dd MMMM yyyy', { locale: tr });
  const isRevised = !!meeting.revised_from_id;
  
  const tags = meeting.tags 
    ? meeting.tags.split(',').map(tag => tag.trim()).filter(Boolean) 
    : [];

  const handleAIAnalysis = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsAnalyzing(true);
    try {
      const result = await apiService.analyzeMeeting(meeting.uuid);
      
      if (result.tasks && result.tasks.length > 0) {
        if (result.addedToTaskList && result.addedTasksCount > 0) {
          toast.success(`AI analizi tamamlandı! ${result.addedTasksCount} yeni görev görev listesine eklendi.`);
        } else if (result.addedToTaskList === false && result.addedTasksCount === 0) {
          toast.success(`AI analizi tamamlandı! ${result.tasks.length} görev bulundu ancak bunlar zaten görev listesinde mevcut.`);
        } else {
          toast.success(`AI analizi tamamlandı! ${result.tasks.length} görev çıkarıldı ve görev listesine eklendi.`);
        }
        
        // Trigger task refresh event
        window.dispatchEvent(new CustomEvent('tasksUpdated'));
      } else {
        toast.success('AI analizi tamamlandı, ancak bu toplantıdan yeni görev bulunamadı.');
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('AI analizi sırasında hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div 
      className={`group bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-4 hover:shadow-lg dark:hover:shadow-xl transition-all duration-200 relative overflow-hidden h-80 flex flex-col ${className}`}
      style={style}
    >
      
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <span className="font-medium">{formattedDate}</span>
            {isRevised && (
              <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-md text-xs font-medium">
                Revizyon
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">
            {meeting.topic}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-3">
        {/* Decision Preview */}
        {meeting.decision && (
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
              <h4 className="text-sm font-medium text-green-600 dark:text-green-400">Karar</h4>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2">
              {meeting.decision}
            </p>
          </div>
        )}

        {/* Notes Preview */}
        {meeting.notes && (
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400">Notlar</h4>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-2">
              {meeting.notes}
            </p>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h4 className="text-sm font-medium text-purple-600 dark:text-purple-400">Etiketler</h4>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md text-xs font-medium">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Revision Info */}
      {isRevised && meeting.revised_from_topic && (
        <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-md">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <strong>Revizyon:</strong> "{meeting.revised_from_topic}" kararının güncellenmiş hali
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between mt-auto">
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          {meeting.created_at && (
            <span>
              {format(new Date(meeting.created_at), 'dd.MM.yyyy', { locale: tr })}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleAIAnalysis}
            disabled={isAnalyzing}
            className="inline-flex items-center px-2 py-1 bg-purple-600 dark:bg-purple-500 text-white text-xs font-medium rounded-md hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="AI ile Analiz Et"
          >
            <Bot className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? '' : <span className="ml-1">AI</span>}
          </button>
          
          <Link
            to={`/meetings/${meeting.uuid}`}
            className="inline-flex items-center px-3 py-1 bg-blue-600 dark:bg-blue-500 text-white text-xs font-medium rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors duration-200"
          >
            <span>Detay</span>
            <ExternalLink className="w-3 h-3 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
};