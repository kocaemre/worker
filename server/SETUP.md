# Zepatrol Worker – Kurulum Kılavuzu

Bu dosya, **Supabase veritabanı** kullanan bir VPS üzerinde Zepatrol Worker'ı kurmanız için adım adım rehberdir.⁠  
(İsterseniz Docker Compose yöntemi için ➋ numaralı bölüme atlayın.)

---
## İçindekiler
1. Gereksinimler & Ön Hazırlık  
2. ➊ Native (Node.js) Kurulum  
3. ➋ Docker Compose Kurulumu  
4. Telegram Bot & Chat ID Alma  
5. Test & Doğrulama  
6. Güncelleme ve Bakım

---
## 1. Gereksinimler & Ön Hazırlık
* Linux (VPS) erişimi (SSH)  
* Node.js ≥ 20 **veya** Docker 24  
* Supabase / PostgreSQL bağlantı dizesi  
* SMTP hesabı (Postmark, Yandex, Gmail App-Password…)  
* Telegram bot token'ı (opsiyonel – premium uyarıları)

---
## 2. ➊ Native (Node.js) Kurulum
### 2.1 Sunucuyu hazırlayın
```bash
ssh <user>@<SERVER_IP>
# Güncellemeler ve Node 20
sudo apt update && sudo apt install -y git curl build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2.2 Depoyu klonlayın
```bash
git clone https://github.com/<kullanici>/zepatrol.git
cd zepatrol/server
```

### 2.3 Ortam değişkenlerini ayarlayın
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

### 2.4 Bağımlılıkları kurun
```bash
npm install
```

### 2.5 Veritabanı şemasını uygulayın
```bash
npm run migrate
```

### 2.6 (İsteğe bağlı) Demo veri
```bash
npm run seed
```

### 2.7 Worker'ı başlatın
Geliştirme (ekrana log basar):
```bash
npm start
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
## 3. ➋ Docker Compose Kurulumu
Supabase gibi **uzak** DB kullanıyorsanız docker-compose dosyanız en sade hâliyle:
```yaml
version: '3.9'
services:
  worker:
    build: ./server
    env_file:
      - .env
    ports:
      - '9100:9100'
```
1. `.env` dosyasını aynı adımlarla doldurun.  
2. Çalıştırın:
```bash
docker compose up -d --build
```
Loglar: `docker compose logs -f worker`

_Not_: Yerel Postgres istediğinizde `db:` servisini ekleyip aynı `.env` dosyasını kullanabilirsiniz.

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
```bash
export TELEGRAM_CHAT_ID=<kendi_id>   # sadece test-alert sırasında lazım
npm run test-alert
```
Terminalde `Test e-mail sent` ve varsa `Test telegram sent` logları görünür.

### 5.2 Canlı uyarı testi
1. DB'de bir node'un `node_config` içindeki URL'yi bilinçli hatalı yapın veya `status` alanını manuel `unhealthy` yapın.  
2. Worker logunda `Sending alert` satırı çıkar → e-posta/Telegram ulaşır.

---
## 6. Güncelleme & Bakım
```bash
cd ~/zepatrol
git pull
cd server
npm install
npm run migrate           # şema güncel ise
sudo systemctl restart zepatrol-worker   # veya docker compose up -d --build
```

### İzleme
* Prometheus endpoint'i: `http://<SERVER_IP>:9100/metrics`  
* Systemd logları: `journalctl -u zepatrol-worker -f`  
* Docker logları: `docker compose logs -f worker`

---
**Hepsi bu kadar!**  
Free kullanıcılar 24 saatte bir (e-posta), premium kullanıcılar 15 dk'da bir (e-posta + Telegram) uyarı alacaktır.⁠

MIT Lisansı 