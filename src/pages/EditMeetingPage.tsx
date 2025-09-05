import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, FileText, MessageSquare, Tag, Save, ArrowLeft, Lightbulb, Image, File, Link, X, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiService } from '../services/api';
import { Meeting, UpdateMeetingRequest } from '../types/meeting';

export const EditMeetingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [formData, setFormData] = useState<UpdateMeetingRequest>({
    date: '',
    topic: '',
    decision: '',
    notes: '',
    tags: '',
    images: [],
    documents: [],
    links: []
  });

  useEffect(() => {
    if (id) {
      loadMeeting();
    }
  }, [id]);

  const loadMeeting = async () => {
    try {
      const meeting = await apiService.getMeeting(id!);
      setFormData({
        date: meeting.date,
        topic: meeting.topic,
        decision: meeting.decision,
        notes: meeting.notes || '',
        tags: meeting.tags || '',
        images: meeting.images || [],
        documents: meeting.documents || [],
        links: meeting.links || []
      });
    } catch (error) {
      console.error('Failed to load meeting:', error);
      toast.error('Toplantı yüklenirken hata oluştu');
      navigate('/meetings');
    } finally {
      setPageLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.topic.trim() || !formData.decision.trim()) {
      toast.error('Konu ve karar alanları zorunludur');
      return;
    }

    setLoading(true);

    try {
      const updatedMeeting = await apiService.updateMeeting(id!, formData);
      toast.success('Toplantı başarıyla güncellendi!');
      
      // Trigger AI analysis in the background after successful update
      if (updatedMeeting && updatedMeeting.uuid) {
        try {
          await fetch('/api/ai/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              meetingId: updatedMeeting.uuid
            })
          });
          // Don't show error if AI analysis fails, it's not critical
        } catch (aiError) {
          console.log('AI analysis failed (non-critical):', aiError);
        }
      }
      
      navigate(`/meetings/${id}`);
    } catch (error) {
      console.error('Failed to update meeting:', error);
      toast.error('Toplantı güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof UpdateMeetingRequest, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper functions for managing arrays
  const addLink = () => {
    const url = prompt('Link URL girin (örn: https://youtube.com/watch?v=... veya https://example.com):');
    if (url && url.trim()) {
      setFormData(prev => ({
        ...prev,
        links: [...(prev.links || []), url.trim()]
      }));
    }
  };

  const removeLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      links: (prev.links || []).filter((_, i) => i !== index)
    }));
  };

  const addDocument = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        const fileNames = Array.from(files).map(file => file.name);
        setFormData(prev => ({
          ...prev,
          documents: [...(prev.documents || []), ...fileNames]
        }));
      }
    };
    input.click();
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: (prev.documents || []).filter((_, i) => i !== index)
    }));
  };

  const addImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        const fileNames = Array.from(files).map(file => file.name);
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), ...fileNames]
        }));
      }
    };
    input.click();
   };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== index)
    }));
  };

  const addSuggestedTag = (tag: string) => {
    const currentTags = formData.tags ? formData.tags.split(',').map(t => t.trim()) : [];
    if (!currentTags.includes(tag)) {
      const newTags = [...currentTags, tag].join(', ');
      handleChange('tags', newTags);
    }
  };

  const suggestedTags = [
    'sınav', 'puanlama', 'ödev', 'program', 'etkinlik', 'kurallar', 
    'duyuru', 'revizyon', 'karar', 'planlama'
  ];

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Geri Dön
        </button>
        
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Toplantıyı Düzenle</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Toplantı bilgilerini güncelleyin ve değişiklikleri kaydedin.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                  Toplantı Tarihi
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              {/* Topic */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FileText className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                  Konu Başlığı
                </label>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => handleChange('topic', e.target.value)}
                  placeholder="Örn: 11. Sınıf Sınav Sistemi"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>

              {/* Decision */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MessageSquare className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                  Alınan Karar
                </label>
                <textarea
                  value={formData.decision}
                  onChange={(e) => handleChange('decision', e.target.value)}
                  placeholder="Toplantıda alınan kararı detaylı şekilde yazın..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 resize-none"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FileText className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                  Ek Notlar <span className="text-gray-400 dark:text-gray-500 ml-1">(opsiyonel)</span>
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Ek açıklamalar, katılımcı bilgileri vb..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Tag className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                  Etiketler <span className="text-gray-400 dark:text-gray-500 ml-1">(virgülle ayırın)</span>
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => handleChange('tags', e.target.value)}
                  placeholder="sınav, puanlama, 11.sınıf"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                />
                
                {/* Suggested Tags */}
                <div className="mt-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Önerilen etiketler:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addSuggestedTag(tag)}
                        className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-400 transition-colors duration-200"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Images */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Image className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                  Resimler <span className="text-gray-400 dark:text-gray-500 ml-1">(opsiyonel)</span>
                </label>
                <div className="space-y-2">
                  {formData.images && formData.images.length > 0 && (
                    <div className="space-y-2">
                      {formData.images.map((image, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{image}</span>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={addImage}
                    className="flex items-center px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Resim Ekle
                  </button>
                </div>
              </div>

              {/* Documents */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <File className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                  Dökümanlar <span className="text-gray-400 dark:text-gray-500 ml-1">(opsiyonel)</span>
                </label>
                <div className="space-y-2">
                  {formData.documents && formData.documents.length > 0 && (
                    <div className="space-y-2">
                      {formData.documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{doc}</span>
                          <button
                            type="button"
                            onClick={() => removeDocument(index)}
                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={addDocument}
                    className="flex items-center px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Döküman Ekle
                  </button>
                </div>
              </div>

              {/* Links */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Link className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                  Linkler <span className="text-gray-400 dark:text-gray-500 ml-1">(YouTube, HTTP vb.)</span>
                </label>
                <div className="space-y-2">
                  {formData.links && formData.links.length > 0 && (
                    <div className="space-y-2">
                      {formData.links.map((link, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                          <a 
                            href={link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 truncate flex-1 mr-2"
                          >
                            {link}
                          </a>
                          <button
                            type="button"
                            onClick={() => removeLink(index)}
                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={addLink}
                    className="flex items-center px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Link Ekle
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium transition-colors"
                  disabled={loading}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center px-6 py-3 bg-indigo-600 dark:bg-indigo-700 text-white font-medium rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-800 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Güncelleniyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Değişiklikleri Kaydet
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tips Card */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200/50 dark:border-amber-700/50 rounded-2xl p-6">
            <div className="flex items-center mb-4">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-2" />
              <h3 className="font-semibold text-amber-800 dark:text-amber-300">İpuçları</h3>
            </div>
            <ul className="space-y-2 text-sm text-amber-700 dark:text-amber-300">
              <li>• Kararları net ve anlaşılır şekilde yazın</li>
              <li>• Revizyon yapacağınız kararları not alın</li>
              <li>• AI sorularında kullanılacak anahtar kelimeleri düşünün</li>
              <li>• Değişiklikler otomatik olarak AI tarafından analiz edilecek</li>
            </ul>
          </div>

          {/* Preview Card */}
          {formData.topic && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Önizleme</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Tarih:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">{new Date(formData.date).toLocaleDateString('tr-TR')}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Konu:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">{formData.topic}</span>
                </div>
                {formData.tags && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Etiketler:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {formData.tags.split(',').map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-full"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditMeetingPage;