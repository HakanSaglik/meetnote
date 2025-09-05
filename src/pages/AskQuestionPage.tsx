import React, { useState, useEffect, useRef } from 'react';
import { MessageCircleQuestion, Send, Brain, Lightbulb, History, ArrowLeft, FileText, AlertTriangle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { apiService } from '../services/api';
import { QuestionResponse, AIProvider } from '../types/ai';
import { MeetingCard } from '../components/MeetingCard';

export const AskQuestionPage: React.FC = () => {
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<QuestionResponse | null>(null);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [questionHistory, setQuestionHistory] = useState<string[]>([]);
  const [apiStatus, setApiStatus] = useState<'checking' | 'working' | 'error' | 'none'>('checking');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadProviders();
    loadQuestionHistory();
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      setApiStatus('checking');
      
      // First check if any providers are configured
      const providersData = await apiService.getAIProviders();
      const configuredProviders = providersData.providers.filter(p => p.configured);
      
      if (configuredProviders.length === 0) {
        setApiStatus('none');
        return;
      }
      
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
        }
      }
      
      setApiStatus(anyWorking ? 'working' : 'error');
    } catch (error) {
      console.error('API durumu kontrol edilirken hata:', error);
      setApiStatus('error');
    }
  };

  const loadProviders = async () => {
    try {
      const data = await apiService.getAIProviders();
      setProviders(data.providers);
      setSelectedProvider(data.default);
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const loadQuestionHistory = () => {
    const history = localStorage.getItem('questionHistory');
    if (history) {
      setQuestionHistory(JSON.parse(history));
    }
  };

  const saveQuestionHistory = (newQuestion: string) => {
    const history = [newQuestion, ...questionHistory.filter(q => q !== newQuestion)].slice(0, 10);
    setQuestionHistory(history);
    localStorage.setItem('questionHistory', JSON.stringify(history));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      toast.error('Lütfen bir soru girin');
      return;
    }

    if (apiStatus === 'none') {
      toast.error('AI özelliğini kullanmak için önce API anahtarı eklemeniz gerekiyor');
      return;
    }

    if (apiStatus === 'error') {
      toast.error('API anahtarları çalışmıyor. Lütfen ayarları kontrol edin');
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      const result = await apiService.askQuestion(question, selectedProvider);
      setResponse(result);
      saveQuestionHistory(question);
    } catch (error: any) {
      console.error('Failed to ask question:', error);
      toast.error(error.message || 'Soru sorulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionFromHistory = (historicalQuestion: string) => {
    setQuestion(historicalQuestion);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const suggestedQuestions = [
    "11. sınıf sınavları nasıl notlandırılıyor?",
    "Ödev teslim sistemi nasıl çalışıyor?",
    "Yaz okulu programı ne zaman başlıyor?",
    "Hangi konularda karar değişiklikleri yapıldı?",
    "En son puanlama sistemi nasıl belirlendi?"
  ];

  const configuredProviders = providers.filter(p => p.configured);
  const hasConfiguredProviders = configuredProviders.length > 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-indigo-600 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Geri Dön
        </button>
        
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
            <MessageCircleQuestion className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI'ya Soru Sor</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          Geçmiş toplantı kararlarınız hakkında doğal dilde sorular sorun
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Provider Selection */}
          {hasConfiguredProviders && providers.length > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700 p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                AI Sağlayıcısı Seç
              </label>
              <div className="flex flex-wrap gap-2">
                {configuredProviders.map((provider) => (
                  <button
                    key={provider.name}
                    onClick={() => setSelectedProvider(provider.name)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedProvider === provider.name
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 hover:text-indigo-700 dark:hover:text-indigo-300'
                    }`}
                  >
                    {provider.displayName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* API Status Warning */}
          {(apiStatus === 'none' || apiStatus === 'error') && (
            <div className={`border rounded-xl p-6 animate-fade-in-up ${
              apiStatus === 'none' 
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-700'
                : 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200 dark:border-red-700'
            }`}>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className={`h-6 w-6 ${
                    apiStatus === 'none' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold mb-2 ${
                    apiStatus === 'none' ? 'text-amber-800 dark:text-amber-200' : 'text-red-800 dark:text-red-200'
                  }`}>
                    {apiStatus === 'none' 
                      ? 'AI Özelliğini Kullanmak İçin API Anahtarı Gerekli'
                      : 'API Anahtarları Çalışmıyor'
                    }
                  </h3>
                  <p className={`mb-4 ${
                    apiStatus === 'none' ? 'text-amber-700 dark:text-amber-300' : 'text-red-700 dark:text-red-300'
                  }`}>
                    {apiStatus === 'none'
                      ? 'Soru sorabilmek için en az bir AI sağlayıcısının API anahtarını eklemeniz gerekiyor. Gemini, OpenAI (ChatGPT) veya Claude API anahtarlarınızı ayarlar sayfasından ekleyebilirsiniz.'
                      : 'API anahtarlarınız yapılandırılmış ancak çalışmıyor. Lütfen API anahtarlarınızın geçerli olduğundan ve hesabınızda yeterli kredi bulunduğundan emin olun.'
                    }
                  </p>
                  <Link
                    to="/settings"
                    className={`inline-flex items-center px-4 py-2 text-white font-medium rounded-lg transition-colors duration-200 ${
                      apiStatus === 'none'
                        ? 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800'
                        : 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800'
                    }`}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {apiStatus === 'none' ? 'API Anahtarlarını Ekle' : 'API Anahtarlarını Kontrol Et'}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Question Form */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sorunuzu yazın
                </label>
                <textarea
                  ref={textareaRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Örn: 11. sınıf sınavları nasıl notlandırılıyor?"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 resize-none"
                  disabled={loading || !hasConfiguredProviders}
                />
                <div className="absolute right-3 bottom-3">
                  <button
                    type="submit"
                    disabled={loading || !question.trim() || !hasConfiguredProviders}
                    className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* AI Provider Status */}
              {!hasConfiguredProviders && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Lightbulb className="w-5 h-5 text-amber-600 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800">AI Servisi Yapılandırılmamış</h4>
                      <p className="text-xs text-amber-700 mt-1">
                        Soru sorabilmek için .env dosyasında AI API anahtarlarını yapılandırmanız gerekiyor.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-8 text-center">
              <div className="flex items-center justify-center space-x-3">
                <Brain className="w-6 h-6 text-emerald-600 animate-pulse" />
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mt-4">AI analiz ediyor ve cevap hazırlıyor...</p>
            </div>
          )}

          {/* Response */}
          {response && (
            <div className="space-y-6">
              {/* Answer */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl shadow-sm border border-emerald-200/50 dark:border-emerald-700/50 p-6">
                <div className="flex items-center mb-4">
                  <Brain className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mr-2" />
                  <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">AI Cevabı</h3>
                  <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-800 px-2 py-1 rounded-full">
                    {response.provider}
                  </span>
                </div>
                <div className="prose prose-sm max-w-none text-emerald-800 dark:text-emerald-200">
                  <p className="whitespace-pre-wrap">{response.answer}</p>
                </div>
              </div>

              {/* Related Meetings */}
              {response.relatedMeetings && response.relatedMeetings.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                    İlgili Toplantılar
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {response.relatedMeetings.map((meeting) => (
                      <MeetingCard key={meeting.uuid} meeting={meeting} />
                    ))}
                  </div>
                </div>
              )}

              {/* Revision Warning */}
              {response.hasRevisions && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                  <div className="flex items-center">
                    <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Dikkat: Karar Revizyonları</h4>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        Bu konu hakkında zaman içinde farklı kararlar alınmış. Yukarıdaki cevap en güncel bilgileri içerir.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Question History */}
          {questionHistory.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-6">
              <h3 className="flex items-center font-semibold text-gray-900 dark:text-white mb-4">
                <History className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                Soru Geçmişi
              </h3>
              <div className="space-y-2">
                {questionHistory.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuestionFromHistory(q)}
                    className="w-full text-left p-3 text-sm bg-gray-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 dark:text-gray-300 rounded-lg transition-colors duration-200 line-clamp-2"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Questions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 p-6">
            <h3 className="flex items-center font-semibold text-gray-900 dark:text-white mb-4">
              <Lightbulb className="w-5 h-5 mr-2 text-amber-600 dark:text-amber-400" />
              Örnek Sorular
            </h3>
            <div className="space-y-2">
              {suggestedQuestions.map((q, index) => (
                <button
                  key={index}
                  onClick={() => setQuestion(q)}
                  className="w-full text-left p-3 text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors duration-200"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-700/50 rounded-2xl p-6">
            <div className="flex items-center mb-4">
              <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">İpuçları</h3>
            </div>
            <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
              <li>• Spesifik sorular sorun (örn: "11. sınıf" yerine genel "sınav")</li>
              <li>• Tarih aralıkları belirtin</li>
              <li>• Konu etiketlerini kullanın</li>
              <li>• "Ne zaman değişti?" tarzı karşılaştırma soruları sorun</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AskQuestionPage;