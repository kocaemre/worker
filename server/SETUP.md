# Zepatrol Worker – Kurulum Kılavuzu

Bu dosya, **Supabase veritabanı** kullanan bir VPS üzerinde Zepatrol Worker'ı kurmanız için adım adım rehberdir.⁠  
**Önerilen yöntem: Docker Compose** (daha kolay ve güvenli)

---
## İçindekiler
1. Gereksinimler & Ön Hazırlık  
2. ➊ Docker Compose Kurulumu (Önerilen)  
3. ➋ Native Node.js Kurulumu (Opsiyonel)  
4. Telegram Bot & Chat ID Alma  
5. Test & Doğrulama  
6. Güncelleme ve Bakım

---
## 1. Gereksinimler & Ön Hazırlık
* Linux (VPS) erişimi (SSH)  
* **Docker & Docker Compose** (önerilen)
* Supabase / PostgreSQL bağlantı dizesi  
* SMTP hesabı (Postmark, Yandex, Gmail App-Password…)  
* Telegram bot token'ı (opsiyonel – premium uyarıları)

---
## 2. ➊ Docker Compose Kurulumu (Önerilen)

### 2.1 Docker kurulumu
```bash
# Ubuntu/Debian için
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Yeniden giriş yapın veya: newgrp docker
```

### 2.2 Projeyi klonlayın
```bash
git clone https://github.com/kocaemre/worker.git zepatrol
cd zepatrol/server
```

### 2.3 Ortam değişkenlerini ayarlayın
```bash
cp env.example .env
nano .env                    # aşağıdaki alanları doldur
```
Gerekli değişkenler:
```
DATABASE_URL=postgresql://postgres:<PW>@db.<SUPABASE_REF>.supabase.co:5432/postgres
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=alerts@example.com
EMAIL_PASS=<smtp-password>
TEST_EMAIL_TO=mail@gmail.com
TELEGRAM_BOT_TOKEN=123456:ABC...      # premium uyarıları için
```

### 2.4 Worker'ı başlatın
```bash
docker compose up -d --build
```

### 2.5 Veritabanı şemasını uygulayın
```bash
docker compose exec worker npm run migrate
```

### 2.6 (İsteğe bağlı) Demo veri
```bash
docker compose exec worker npm run seed
```

**Tamamlandı!** Worker artık arka planda çalışıyor.
- Logları görme: `docker compose logs -f worker`  
- Durdurma: `docker compose down`  
- Yeniden başlatma: `docker compose restart worker`

---
## 3. ➋ Native Node.js Kurulumu (Opsiyonel)
### 3.1 Sunucuyu hazırlayın
```bash
ssh <user>@<SERVER_IP>
# Güncellemeler ve Node 20
sudo apt update && sudo apt install -y git curl build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
```

### 3.2 Depoyu klonlayın
```bash
git clone https://github.com/kocaemre/worker.git zepatrol
cd zepatrol/server
```

### 3.3 Ortam değişkenlerini ayarlayın
```bash
cp env.example .env          # şablonu kopyala
nano .env                    # aşağıdaki alanları doldur
```
Gerekli değişkenler:
```
DATABASE_URL=postgresql://postgres:<PW>@db.<SUPABASE_REF>.supabase.co:5432/postgres
POSTGRES_PASSWORD=<PW>                # prisma migrate için
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=alerts@example.com
EMAIL_PASS=<smtp-password>
TELEGRAM_BOT_TOKEN=123456:ABC...      # premium uyarıları için
```
(extras: `CHECK_INTERVAL_CRON`, `NODE_ENV`, vs. varsayılan kalabilir)

### 3.4 Bağımlılıkları kurun
```bash
npm install
```

### 3.5 Veritabanı şemasını uygulayın
```bash
npm run migrate
```

### 3.6 (İsteğe bağlı) Demo veri
```bash
npm run seed
```

### 3.7 Worker'ı başlatın
Geliştirme (ekrana log basar):
```bash
npm run dev
```
Üretimde systemd servisi olarak arka planda:
```bash
sudo tee /etc/systemd/system/zepatrol-worker.service >/dev/null <<'EOF'
[Unit]
Description=Zepatrol Worker
After=network.target

[Service]
WorkingDirectory=/home/<user>/zepatrol/server
ExecStart=/usr/bin/node src/index.js
Restart=always
EnvironmentFile=/home/<user>/zepatrol/server/.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now zepatrol-worker
```
Durum: `sudo systemctl status zepatrol-worker`

---
## 4. Telegram Bot & Chat ID
### 4.1 Bot token'ı
1. Telegram → **@BotFather** → `/newbot` → isim ver.  
2. Verilen token'ı `.env` dosyasındaki `TELEGRAM_BOT_TOKEN=` alanına yaz.

### 4.2 Kullanıcı Chat ID'sini alma (kolay yöntem)
1. Kullanıcı botu açıp **Start**'a basar.  
2. Kullanıcı Telegram'da **@userinfobot**'u açıp **Start** der.  
3. Gelen mesajdaki `ID: 123456789` sayısını kopyalar.  
4. Panelde "Telegram ID" alanına yapıştırır → Kaydet.  
   – Bu değer `users.telegram_chat_id` alanına yazılır.

> Premium kullanıcı + geçerli chat ID → worker hata durumunda Telegram mesajı yollar.

_İleri seviye_: Deep-link ile chat ID'yi otomatik toplamak için `/t.me/<Bot>?start=<jwt>` akışını uygulayabilirsiniz (dokümanda anlatıldı).

---
## 5. Test & Doğrulama
### 5.1 SMTP + Telegram testi

**Docker ile:**
```bash
export TELEGRAM_CHAT_ID=<kendi_id>   # sadece test-alert sırasında lazım
docker compose exec worker npm run test-alert
```

**Native kurulum ile:**
```bash
export TELEGRAM_CHAT_ID=<kendi_id>   # sadece test-alert sırasında lazım
cd server && npm run test-alert
```

Terminalde `Test e-mail sent` ve varsa `Test telegram sent` logları görünür.

### 5.2 Canlı uyarı testi
1. DB'de bir node'un `node_config` içindeki URL'yi bilinçli hatalı yapın veya `status` alanını manuel `unhealthy` yapın.  
2. Worker logunda `Sending alert` satırı çıkar → e-posta/Telegram ulaşır.

---
## 6. Güncelleme & Bakım

### Docker Compose (Önerilen)
```bash
cd ~/zepatrol/server
git pull
docker compose down
docker compose up -d --build
docker compose exec worker npm run migrate  # şema güncel ise
```

### Native kurulum
```bash
cd ~/zepatrol/server
git pull
npm install
npm run migrate           # şema güncel ise
sudo systemctl restart zepatrol-worker
```

### İzleme
* Prometheus endpoint'i: `http://<SERVER_IP>:9100/metrics`  
* Docker logları: `docker compose logs -f worker`  
* Systemd logları: `journalctl -u zepatrol-worker -f` (native kurulum)

---
**Hepsi bu kadar!**  
Free kullanıcılar 24 saatte bir (e-posta), premium kullanıcılar 15 dk'da bir (e-posta + Telegram) uyarı alacaktır.⁠

MIT Lisansı 