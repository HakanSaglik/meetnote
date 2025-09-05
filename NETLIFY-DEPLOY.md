# 🚀 Netlify Deploy Rehberi

Bu rehber, MeetNote uygulamasını Netlify'ye deploy etmek için gerekli adımları açıklar.

## 📋 Ön Hazırlık

### 1. Repository Hazırlığı
- Projenizi GitHub, GitLab veya Bitbucket'a push edin
- `.env` dosyasını `.gitignore`'a eklediğinizden emin olun

### 2. Backend Deployment (Öncelikli)
⚠️ **Önemli:** Netlify sadece frontend hosting yapar. Backend'i ayrı deploy etmelisiniz.

**Önerilen Backend Platformları:**
- **Railway** (Önerilen): https://railway.app
- **Render**: https://render.com
- **Heroku**: https://heroku.com

## 🔧 Netlify Deployment

### Adım 1: Netlify'de Site Oluşturma
1. https://netlify.com'a gidin ve hesap oluşturun
2. "New site from Git" butonuna tıklayın
3. Repository'nizi seçin
4. Build ayarlarını yapılandırın:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Base directory:** `project` (eğer proje alt klasördeyse)

### Adım 2: Environment Variables
Netlify dashboard'da Site Settings > Environment Variables'a gidin ve şunları ekleyin:

```
VITE_API_URL=https://your-backend-url.com/api
VITE_APP_ENV=production
```

### Adım 3: Deploy
1. "Deploy site" butonuna tıklayın
2. Build loglarını takip edin
3. Deploy tamamlandığında site URL'nizi alın

## 🔄 Backend Deployment (Railway Örneği)

### 1. Railway'de Proje Oluşturma
1. https://railway.app'a gidin
2. "New Project" > "Deploy from GitHub repo"
3. Repository'nizi seçin
4. Root directory'yi `project` olarak ayarlayın

### 2. Environment Variables (Railway)
```
OPENAI_API_KEY=your_openai_key
CLAUDE_API_KEY=your_claude_key
GEMINI_API_KEY=your_gemini_key
DATABASE_PATH=./database/meetings.json
PORT=3001
DEFAULT_AI_PROVIDER=gemini
```

### 3. Start Command
Railway'de start command'i `node server.js` olarak ayarlayın.

## 🔗 Bağlantı Kurma

1. Backend deploy edildikten sonra URL'yi alın (örn: `https://your-app.railway.app`)
2. Netlify'deki `VITE_API_URL` environment variable'ını güncelleyin:
   ```
   VITE_API_URL=https://your-app.railway.app/api
   ```
3. Netlify'de redeploy yapın

## ✅ Test Etme

1. Netlify URL'nizi açın
2. Ayarlar sayfasına gidin
3. AI sağlayıcılarının çalıştığını kontrol edin
4. Toplantı ekleme/silme işlemlerini test edin

## 🐛 Sorun Giderme

### CORS Hatası
Backend'de CORS ayarlarını kontrol edin:
```javascript
app.use(cors({
  origin: ['https://your-netlify-url.netlify.app', 'http://localhost:5173'],
  credentials: true
}));
```

### API Bağlantı Hatası
1. Backend URL'nin doğru olduğunu kontrol edin
2. Backend'in çalıştığını kontrol edin
3. Environment variables'ların doğru ayarlandığını kontrol edin

### Build Hatası
1. Node.js versiyonunu kontrol edin (18+ gerekli)
2. Dependencies'lerin güncel olduğunu kontrol edin
3. Build loglarını inceleyin

## 📚 Faydalı Linkler

- [Netlify Docs](https://docs.netlify.com/)
- [Railway Docs](https://docs.railway.app/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

---

**Not:** Bu rehber temel deployment için hazırlanmıştır. Production ortamında ek güvenlik ve performans optimizasyonları gerekebilir.