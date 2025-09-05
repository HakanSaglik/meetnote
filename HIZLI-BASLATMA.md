# MeetNote Uygulaması - Hızlı Başlatma Rehberi

## Sorun
Uygulama her açılışında yarn/npm install işlemi uzun süre alıyor.

## Çözümler

### 1. Batch Dosyası ile Hızlı Başlatma (Önerilen)
```bash
# Windows için
start-app.bat dosyasını çift tıklayın
```

Bu dosya:
- node_modules varsa sadece kontrol eder
- Yoksa hızlı şekilde yükler
- Uygulamayı başlatır

### 2. Yarn Komutları ile Hızlı Başlatma

#### Normal Başlatma (Hızlı)
```bash
yarn quick-start
```

#### Sadece Geliştirme Sunucusu
```bash
yarn dev:yarn
```

#### Temiz Kurulum (Sorun varsa)
```bash
yarn fresh-install
```

### 3. Manuel Kontrol

#### node_modules Kontrolü
```bash
# Eğer node_modules klasörü varsa:
yarn dev:yarn

# Eğer node_modules yoksa:
yarn install --frozen-lockfile
yarn dev:yarn
```

## İpuçları

1. **node_modules klasörünü silmeyin** - Bu klasör silinirse tekrar tam kurulum gerekir
2. **yarn.lock dosyasını koruyun** - Bu dosya hızlı kurulum sağlar
3. **--frozen-lockfile** parametresi hızlı kurulum yapar
4. **start-app.bat** dosyası en pratik çözümdür

## Sorun Giderme

Eğer hala yavaşsa:
```bash
yarn cache clean
yarn fresh-install
```

## Sunucu Portları
- Frontend: http://localhost:5173
- Backend: http://localhost:3001