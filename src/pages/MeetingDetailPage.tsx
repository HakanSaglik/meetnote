import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Tag, MessageSquare, ArrowLeft, Edit, Trash2, RefreshCw, Clock, Image, File, Link, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiService } from '../services/api';
import { Meeting } from '../types/meeting';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export const MeetingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadMeeting();
    }
  }, [id]);

  const loadMeeting = async () => {
    try {
      const meetingData = await apiService.getMeeting(id!);
      setMeeting(meetingData);
    } catch (error) {
      console.error('Failed to load meeting:', error);
      toast.error('Toplantı yüklenirken hata oluştu');
      navigate('/meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!meeting || !window.confirm('Bu toplantı kaydını silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await apiService.deleteMeeting(meeting.uuid);
      
      // Trigger meetingDeleted event for task cleanup
      window.dispatchEvent(new CustomEvent('meetingDeleted', {
        detail: { 
          meeting: {
            id: meeting.id,
            uuid: meeting.uuid,
            topic: meeting.topic,
            date: meeting.date
          }
        }
      }));
      console.log('🗑️ Meeting deleted event dispatched');
      
      toast.success('Toplantı başarıyla silindi');
      navigate('/meetings');
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      toast.error('Toplantı silinirken hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Toplantı bulunamadı</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Aradığınız toplantı kaydı mevcut değil.</p>
        <button
          onClick={() => navigate('/meetings')}
          className="px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
        >
          Toplantılara Dön
        </button>
      </div>
    );
  }

  const tags = meeting.tags 
    ? meeting.tags.split(',').map(tag => tag.trim()).filter(Boolean) 
    : [];
  
  const formattedDate = format(new Date(meeting.date), 'dd MMMM yyyy EEEE', { locale: tr });
  const isRevised = !!meeting.revised_from_id;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Geri Dön
        </button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
              <Calendar className="w-4 h-4" />
              <span>{formattedDate}</span>
              {isRevised && (
                <div className="flex items-center text-amber-600 dark:text-amber-400">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  <span>Revizyon</span>
                </div>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {meeting.topic}
            </h1>
            {meeting.created_at && (
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Clock className="w-4 h-4 mr-1" />
                <span>
                  Oluşturulma: {format(new Date(meeting.created_at), 'dd MMMM yyyy HH:mm', { locale: tr })}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate(`/meetings/${meeting.uuid}/edit`)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
              title="Düzenle"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Sil"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Revision Info */}
        {isRevised && meeting.revised_from_topic && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-6">
            <div className="flex items-center mb-3">
              <RefreshCw className="w-5 h-5 text-amber-600 mr-2" />
              <h3 className="font-semibold text-amber-800">Revizyon Bilgisi</h3>
            </div>
            <p className="text-amber-700">
              Bu karar, "<strong>{meeting.revised_from_topic}</strong>" konusundaki{' '}
              {meeting.revised_from_date && (
                <strong>
                  {format(new Date(meeting.revised_from_date), 'dd MMMM yyyy', { locale: tr })}
                </strong>
              )}{' '}
              tarihli toplantının güncellenmiş halidir.
            </p>
          </div>
        )}

        {/* Decision */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            Alınan Karar
          </h2>
          <div className="prose max-w-none">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {meeting.decision}
            </p>
          </div>
        </div>

        {/* Notes */}
        {meeting.notes && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
              Ek Notlar
            </h2>
            <div className="prose max-w-none">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {meeting.notes}
              </p>
            </div>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Tag className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
              Etiketler
            </h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-100 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Images */}
        {meeting.images && meeting.images.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Image className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
              Resimler
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {meeting.images.map((image, index) => (
                <div
                  key={index}
                  className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <Image className="w-4 h-4 mr-2 text-purple-500 dark:text-purple-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{image}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {meeting.documents && meeting.documents.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <File className="w-5 h-5 mr-2 text-orange-600 dark:text-orange-400" />
              Dökümanlar
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {meeting.documents.map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <File className="w-4 h-4 mr-2 text-orange-500 dark:text-orange-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{doc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {meeting.links && meeting.links.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Link className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
              Linkler
            </h2>
            <div className="space-y-2">
              {meeting.links.map((link, index) => (
                <div
                  key={index}
                  className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <Link className="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" />
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline truncate flex-1 mr-2"
                  >
                    {link}
                  </a>
                  <ExternalLink className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revisions Timeline */}
        {meeting.revisions && meeting.revisions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <RefreshCw className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
              Revizyon Geçmişi
            </h2>
            <div className="space-y-4">
              {meeting.revisions.map((revision, index) => (
                <div
                  key={revision.uuid}
                  className="border-l-4 border-purple-200 dark:border-purple-600 pl-4 pb-4"
                >
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(revision.date), 'dd MMMM yyyy', { locale: tr })}</span>
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">{revision.topic}</h3>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">{revision.decision}</p>
                  {revision.notes && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 italic">{revision.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Toplantı Bilgileri
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Toplantı ID:</span>
              <span className="ml-2 font-mono text-gray-700 dark:text-gray-300">{meeting.uuid}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Veritabanı ID:</span>
              <span className="ml-2 font-mono text-gray-700 dark:text-gray-300">{meeting.id}</span>
            </div>
            {meeting.created_at && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Oluşturulma:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {format(new Date(meeting.created_at), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
            )}
            {meeting.updated_at && meeting.updated_at !== meeting.created_at && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Son Güncelleme:</span>
                <span className="ml-2 text-gray-700 dark:text-gray-300">
                  {format(new Date(meeting.updated_at), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingDetailPage;