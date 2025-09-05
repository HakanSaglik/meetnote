# Toplantı Hafızası - Production Build

Bu klasör, Toplantı Hafızası uygulamasının production build'ini içerir ve bulut sunucunuzda çalıştırılmaya hazırdır.

## 📁 Dosya Yapısı

```
dist/
├── assets/                 # Frontend static dosyaları
│   ├── index-BNE3_aKF.js  # JavaScript bundle
│   └── index-yThv7mTD.css # CSS bundle
├── database/              # Veritabanı klasörü
│   └── meetings.json      # LowDB veritabanı dosyası
├── index.html             # Ana HTML dosyası
├── server.js              # Express.js sunucu
├── package.json           # Production bağımlılıkları
└── README.md              # Bu dosya
```

## 🚀 Kurulum ve Çalıştırma

### 1. Bağımlılıkları Yükleyin
```bash
npm install
```

### 2. Sunucuyu Başlatın
```bash
npm start
```

Veya doğrudan:
```bash
node server.js
```

### 3. Uygulamaya Erişim
- Uygulama varsayılan olarak **3001** portunda çalışır
- Tarayıcınızda `http://your-server-ip:3001` adresini açın
- Port değişikliği için `PORT` environment variable kullanın:

```bash
PORT=8080 npm start
```

## 🌐 Bulut Sunucu Kurulumu

### Heroku
```bash
# Heroku CLI ile
heroku create your-app-name
git init
git add .
git commit -m "Initial commit"
heroku git:remote -a your-app-name
git push heroku main
```

### DigitalOcean/AWS/VPS
1. Sunucunuza bu klasörü yükleyin
2. Node.js yükleyin (v16+)
3. Bağımlılıkları yükleyin: `npm install`
4. PM2 ile çalıştırın:
```bash
npm install -g pm2
pm2 start server.js --name "toplanti-hafizasi"
pm2 startup
pm2 save
```

### Vercel/Netlify
- Bu build statik hosting için optimize edilmemiştir
- Express.js sunucu gerektirir
- Serverless fonksiyonlar için ayrı konfigürasyon gerekir

## 🔧 Konfigürasyon

### Environment Variables
```bash
PORT=3001                    # Sunucu portu
NODE_ENV=production         # Çalışma ortamı
```

### Nginx Reverse Proxy (Opsiyonel)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 Özellikler

- ✅ **Full-Stack Uygulama**: Frontend + Backend tek pakette
- ✅ **LowDB Veritabanı**: Dosya tabanlı, kurulum gerektirmez
- ✅ **API Endpoints**: RESTful API
- ✅ **Static File Serving**: Optimized frontend assets
- ✅ **CORS Enabled**: Cross-origin requests desteklenir
- ✅ **Production Ready**: Minified ve optimize edilmiş

## 🔒 Güvenlik

- API anahtarları kullanıcı tarafından girilir
- Sunucu tarafında API anahtarı saklanmaz
- CORS politikaları aktif
- Input validation mevcut

## 📝 API Endpoints

- `GET /api/meetings` - Tüm toplantıları listele
- `POST /api/meetings` - Yeni toplantı oluştur
- `DELETE /api/meetings/:id` - Toplantı sil
- `POST /api/analyze` - Toplantı analizi yap

## 🐛 Sorun Giderme

### Port Zaten Kullanımda
```bash
# Farklı port kullanın
PORT=8080 npm start
```

### Veritabanı Erişim Hatası
```bash
# Dosya izinlerini kontrol edin
chmod 755 database/
chmod 644 database/meetings.json
```

### Sunucu Başlatma Hatası
```bash
# Node.js versiyonunu kontrol edin
node --version  # v16+ gerekli

# Bağımlılıkları yeniden yükleyin
rm -rf node_modules
npm install
```

## 📞 Destek

Sorularınız için GitHub Issues kullanın veya dokümentasyonu inceleyin.

---

**Not**: Bu production build, development ortamından farklı olarak AI servisleri için basit mock responses kullanır. Gerçek AI analizi için API anahtarlarınızı ayarlar sayfasından girebilirsiniz.