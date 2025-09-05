import React, { useState, useEffect } from 'react';
import { Settings, Brain, Database, Download, ArrowLeft, CheckCircle, XCircle, Plus, Trash2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { apiService } from '../services/api';
import { AIProvider } from '../types/ai';
import { APP_CONFIG } from '../utils/constants';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<{ [key: string]: boolean }>({});
  const [apiKeys, setApiKeys] = useState<{ [key: string]: string[] }>({});
  const [savedApiKeys, setSavedApiKeys] = useState<Record<string, { key: string; envKey: string; addedAt: string }>>({});
  const [saving, setSaving] = useState<{ [key: string]: boolean }>({});
  const [deleting, setDeleting] = useState<{ [key: string]: boolean }>({});

  const supportedProviders = ['gemini', 'openai', 'claude'];

  useEffect(() => {
    initializeSettings();
  }, []);

  const initializeSettings = async () => {
    await loadProviders();
    await loadSavedApiKeys();
  };

  const loadSavedApiKeys = async () => {
    try {
      const response = await apiService.getApiKeys();
      setSavedApiKeys(response.apiKeys || {});
      
      // Initialize arrays based on saved keys
      const initialKeys: { [key: string]: string[] } = {};
      supportedProviders.forEach(provider => {
        // Count how many keys exist for this provider
        const providerKeys = Object.keys(response.apiKeys || {}).filter(key => key.startsWith(provider + '_'));
        const keyCount = Math.max(1, providerKeys.length);
        initialKeys[provider] = new Array(keyCount).fill('');
      });
      setApiKeys(initialKeys);
    } catch (error) {
      console.error('Failed to load saved API keys:', error);
      // Initialize empty arrays for each provider
      const initialKeys: { [key: string]: string[] } = {};
      supportedProviders.forEach(provider => {
        initialKeys[provider] = [''];
      });
      setApiKeys(initialKeys);
    }
  };

  const handleDeleteApiKey = async (provider: string) => {
    setDeleting(prev => ({ ...prev, [provider]: true }));
    try {
      await apiService.deleteApiKey(provider);
      toast.success(`${provider.toUpperCase()} API anahtarı başarıyla silindi`);
      await loadSavedApiKeys(); // Reload the saved keys
    } catch (error) {
      console.error('Failed to delete API key:', error);
      toast.error(`API anahtarı silinirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setDeleting(prev => ({ ...prev, [provider]: false }));
    }
  };

  const handleDeleteSpecificApiKey = async (apiKeyId: string) => {
    setDeleting(prev => ({ ...prev, [apiKeyId]: true }));
    try {
      await apiService.deleteApiKey(apiKeyId);
      const providerName = apiKeyId.split('_')[0];
      const keyIndex = apiKeyId.split('_')[1] || '1';
      toast.success(`${providerName.toUpperCase()} API anahtarı ${keyIndex} başarıyla silindi`);
      await loadSavedApiKeys(); // Reload the saved keys
    } catch (error) {
      console.error('Failed to delete API key:', error);
      toast.error(`API anahtarı silinirken hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setDeleting(prev => ({ ...prev, [apiKeyId]: false }));
    }
  };

  const loadProviders = async () => {
    try {
      const data = await apiService.getAIProviders();
      setProviders(data.providers);
    } catch (error) {
      console.error('Failed to load providers:', error);
      toast.error('AI sağlayıcıları yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const testProvider = async (providerName: string) => {
    setTesting(prev => ({ ...prev, [providerName]: true }));
    
    try {
      const result = await apiService.testAIProvider(providerName);
      if (result.working) {
        toast.success(`${providerName} çalışıyor!`);
      } else {
        toast.error(`${providerName} test başarısız`);
      }
    } catch (error) {
      console.error(`Failed to test ${providerName}:`, error);
      toast.error(`${providerName} test edilirken hata oluştu`);
    } finally {
      setTesting(prev => ({ ...prev, [providerName]: false }));
    }
  };

  const saveApiKey = async (providerName: string, keyIndex: number) => {
    const apiKey = apiKeys[providerName]?.[keyIndex];
    if (!apiKey || !apiKey.trim()) {
      toast.error('API anahtarı boş olamaz');
      return;
    }

    const providerKey = `${providerName}_${keyIndex + 1}`;
    setSaving(prev => ({ ...prev, [providerKey]: true }));
    
    try {
      const result = await apiService.saveApiKey(providerKey, apiKey.trim());
      
      if (result.success) {
        toast.success(`${providerName} API anahtarı ${keyIndex + 1} kaydedildi!`);
        await loadSavedApiKeys();
        await loadProviders();
      } else {
        toast.error(result.message || 'API anahtarı kaydedilemedi');
      }
    } catch (error) {
      console.error(`Failed to save API key for ${providerName}:`, error);
      toast.error('API anahtarı kaydedilirken hata oluştu');
    } finally {
      setSaving(prev => ({ ...prev, [providerKey]: false }));
    }
  };



  const handleApiKeyChange = (providerName: string, keyIndex: number, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [providerName]: prev[providerName].map((key, index) => 
        index === keyIndex ? value : key
      )
    }));
  };

  const addApiKeyField = (providerName: string) => {
    setApiKeys(prev => ({
      ...prev,
      [providerName]: [...prev[providerName], '']
    }));
  };

  const removeApiKeyField = (providerName: string, keyIndex: number) => {
    if (apiKeys[providerName].length <= 1) {
      toast.error('En az bir API anahtarı alanı olmalı');
      return;
    }
    
    setApiKeys(prev => ({
      ...prev,
      [providerName]: prev[providerName].filter((_, index) => index !== keyIndex)
    }));
  };

  const exportData = async (format: 'json' | 'csv') => {
    try {
      const meetings = await apiService.getMeetings({ limit: 1000 });
      
      let dataStr = '';
      let filename = '';
      
      if (format === 'json') {
        dataStr = JSON.stringify(meetings.meetings, null, 2);
        filename = `meetnote-export-${new Date().toISOString().split('T')[0]}.json`;
      } else {
        // CSV format
        const csvHeaders = ['Tarih', 'Başlık', 'Katılımcılar', 'Özet'];
        const csvRows = meetings.meetings.map((meeting: any) => [
          new Date(meeting.date).toLocaleDateString('tr-TR'),
          meeting.title,
          meeting.participants?.join(', ') || '',
          meeting.summary?.replace(/\n/g, ' ') || ''
        ]);
        
        dataStr = [csvHeaders, ...csvRows]
          .map(row => row.map(field => `"${field}"`).join(','))
          .join('\n');
        filename = `meetnote-export-${new Date().toISOString().split('T')[0]}.csv`;
      }
      
      const blob = new Blob([dataStr], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Veriler ${format.toUpperCase()} formatında dışa aktarıldı`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Veri dışa aktarımı başarısız');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Ayarlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 dark:text-white" />
          </button>
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ayarlar</h1>
          </div>
        </div>

        {/* AI Providers Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">AI Sağlayıcıları</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300">AI sağlayıcılarınızı yapılandırın ve test edin</p>
            
            {/* Configuration Info */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">API Anahtarı Alma Rehberi</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Her AI sağlayıcısı için API anahtarı almanız gerekiyor. Aşağıdaki linklerden ücretsiz hesap oluşturabilirsiniz:
              </p>
              
              <div className="space-y-3 mb-4">
                <div className="bg-white dark:bg-gray-700 rounded p-3 border border-blue-200 dark:border-blue-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-blue-800 dark:text-blue-200">🟢 Google Gemini (ÜCRETSİZ)</h5>
                      <p className="text-xs text-blue-600 dark:text-blue-300">Günlük 1500 istek limiti - Tamamen ücretsiz</p>
                    </div>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" 
                       className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
                      API Al
                    </a>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-700 rounded p-3 border border-blue-200 dark:border-blue-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-blue-800 dark:text-blue-200">🟡 OpenAI GPT</h5>
                      <p className="text-xs text-blue-600 dark:text-blue-300">Ücretli servis - Yüksek kalite</p>
                    </div>
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" 
                       className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
                      API Al
                    </a>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-700 rounded p-3 border border-blue-200 dark:border-blue-600">
                   <div className="flex items-center justify-between">
                     <div>
                       <h5 className="font-medium text-blue-800 dark:text-blue-200">🟡 Anthropic Claude</h5>
                       <p className="text-xs text-blue-600 dark:text-blue-300">Ücretli servis - Uzun metinlerde güçlü</p>
                     </div>
                     <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" 
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
                       API Al
                     </a>
                   </div>
                 </div>
                 

               </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded p-3 mb-3">
                <h5 className="font-medium text-green-800 dark:text-green-200 mb-1">💡 Önemli İpucu</h5>
                <p className="text-sm text-green-700 dark:text-green-300">
                  <strong>Birden fazla API anahtarı eklerseniz sistem otomatik olarak aralarında geçiş yapar.</strong> 
                  Bu sayede bir servisin günlük kullanım limitine ulaştığında diğerine geçer ve kesintisiz hizmet alırsınız.
                </p>
              </div>
              
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded p-3 font-mono text-xs text-blue-800 dark:text-blue-200">
                 # Örnek .env yapılandırması<br/>
                 GEMINI_API_KEY=your_gemini_key<br/>
                 OPENAI_API_KEY=your_openai_key<br/>
                 CLAUDE_API_KEY=your_claude_key<br/><br/>
                 # Yedek anahtarlar (opsiyonel)<br/>
                 GEMINI_API_KEY_2=your_second_gemini_key<br/>
                 OPENAI_API_KEY_2=your_second_openai_key<br/>
               </div>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {supportedProviders.map((providerName) => {
              const provider = providers.find(p => p.name.toLowerCase() === providerName);
              const isConfigured = provider?.configured || false;
              
              return (
                <div key={providerName} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white capitalize">
                        {providerName}
                      </h3>
                      {isConfigured ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <button
                      onClick={() => testProvider(providerName)}
                      disabled={testing[providerName] || !isConfigured}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {testing[providerName] ? 'Test ediliyor...' : 'Test Et'}
                    </button>
                  </div>
                  

                  
                  <div className="space-y-3">
                    {apiKeys[providerName]?.map((apiKey, keyIndex) => {
                      const providerKey = `${providerName}_${keyIndex + 1}`;
                      const savedKey = savedApiKeys[providerKey];
                      
                      return (
                        <div key={keyIndex} className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              API Anahtarı {keyIndex + 1}
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={savedKey ? savedKey.key : apiKey}
                                onChange={savedKey ? undefined : (e) => handleApiKeyChange(providerName, keyIndex, e.target.value)}
                                placeholder={savedKey ? '' : `${providerName} API anahtarınızı girin`}
                                readOnly={!!savedKey}
                                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                  savedKey ? 'bg-gray-50 dark:bg-gray-600 cursor-not-allowed' : ''
                                }`}
                              />
                              {savedKey && (
                                <button
                                  onClick={() => handleDeleteSpecificApiKey(providerKey)}
                                  disabled={deleting[providerKey]}
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-red-600 dark:bg-red-700 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs flex items-center gap-1"
                                >
                                  {deleting[providerKey] ? (
                                    'Siliniyor...'
                                  ) : (
                                    <>
                                      <Trash2 className="w-3 h-3" />
                                      Sil
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {!savedKey && (
                            <div className="flex items-center gap-2 mt-6">
                              <button
                                onClick={() => saveApiKey(providerName, keyIndex)}
                                disabled={saving[providerKey] || !apiKey.trim()}
                                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                              >
                                {saving[providerKey] ? 'Kaydediliyor...' : 'Kaydet'}
                              </button>
                              
                              {keyIndex > 0 && (
                                <button
                                  onClick={() => removeApiKeyField(providerName, keyIndex)}
                                  className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    <button
                      onClick={() => addApiKeyField(providerName)}
                      className="flex items-center gap-2 px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Yeni API Anahtarı Ekle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Data Export Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-6 h-6 text-green-600 dark:text-green-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Veri Yönetimi</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300">Toplantı verilerinizi dışa aktarın</p>
          </div>
          
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => exportData('json')}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                <Download className="w-5 h-5" />
                JSON Olarak Dışa Aktar
              </button>
              
              <button
                onClick={() => exportData('csv')}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
              >
                <Download className="w-5 h-5" />
                CSV Olarak Dışa Aktar
              </button>
            </div>
          </div>
        </div>

        {/* Version Information Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Uygulama Bilgileri</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300">Sürüm ve uygulama detayları</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Uygulama Adı:</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{APP_CONFIG.NAME}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Sürüm:</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">{APP_CONFIG.VERSION}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Açıklama:</span>
                  <span className="text-gray-900 dark:text-white text-sm text-right max-w-xs">{APP_CONFIG.DESCRIPTION}</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Geliştirici:</span>
                  <span className="text-gray-900 dark:text-white">{APP_CONFIG.AUTHOR}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">İletişim:</span>
                  <a href={`mailto:${APP_CONFIG.CONTACT}`} className="text-blue-600 dark:text-blue-400 hover:underline">{APP_CONFIG.CONTACT}</a>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">GitHub:</span>
                  <a href={APP_CONFIG.GITHUB} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">Kaynak Kod</a>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-blue-900 dark:text-blue-100 font-medium mb-1">Sürüm Notları</h4>
                  <p className="text-blue-700 dark:text-blue-300 text-sm">
                    Bu sürümde gelişmiş hata yönetimi, loading states iyileştirmeleri ve kapsamlı utility fonksiyonları eklendi.
                    Makro değişiklikler için sürüm numarası güncellenecektir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;