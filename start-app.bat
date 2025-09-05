@echo off
echo MeetNote Uygulamasini Baslatiliyor...

REM node_modules varsa kontrol et
if not exist "node_modules" (
    echo Bagimliliklari yukleniyor...
    yarn install --frozen-lockfile
) else (
    echo Bagimliliklari kontrol ediliyor...
    yarn install --check-files --frozen-lockfile
)

echo Sunucu ve frontend baslatiliyor...
yarn dev

pause