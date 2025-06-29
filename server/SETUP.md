# Zepatrol Worker – Kurulum Kılavuzu

> Bu belge VPS veya yerel makinede **zepatrol-worker** servisinin adım adım kurulumunu anlatır.

---

## 1. Depoyu Klonla
```bash
$ git clone https://github.com/<kullanici>/zepatrol.git
$ cd zepatrol/server            # worker klasörü
```

## 2. Ortam Değişkenlerini Ayarla
1. Örnek dosyayı kopyala:
   ```bash
   cp env.example .env
   ```
2. `.env` içini doldur:
   | Değişken | Açıklama |
   |-----------|----------|
   | `DATABASE_URL` | Postgres bağlantı dizesi (Supabase veya yerel) |
   | `CHECK_INTERVAL_CRON` | Cron ifadesi (örn. `*/5 * * * *`) |
   | `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASS` | SMTP bilgileri |
   | `TELEGRAM_BOT_TOKEN` | Bot token (opsiyonel) |
   | `TELEGRAM_CHAT_ID` | Kendi chat ID'n (sadece test-alert için) |

> Chat ID'ni öğrenmek için @userinfobot botuna `/start` yaz.

## 3. Bağımlılıkları Kur
```bash
npm ci
```

## 4. Prisma Şeması & Örnek Veri
```bash
npm run migrate   # tablo oluşturur
npm run seed      # 2 demo kullanıcı + node ekler
```

## 5. Servisi Başlat
```bash
npm start         # cron + /metrics (9100) ayağa kalkar
```

Loglar JSON formatında terminalde gözükecektir.

## 6. Docker ile Çalıştırma
```bash
# kök dizinde (zepatrol/)
docker compose up -d --build
```
* `db` servisi: Postgres 16
* `worker` servisi: cron + metrics

Uzak Postgres (Supabase) kullanacaksan `docker-compose.yml` içindeki `db` servisini kaldır ve `DATABASE_URL`'i Supabase URI'siyle değiştir.

## 7. SMTP & Telegram Testi
```bash
# .env içindeki TELEGRAM_CHAT_ID dolu ise ikisini de test eder
npm run test-alert
```
* Başarılıysa mail kutuna "Zepatrol Test E-mail" gelir. 
* Telegram mesajı "✅ Zepatrol Telegram testi başarılı!" şeklinde görünür.

## 8. Prometheus Entegrasyonu
Sunucu 9100 portundan metrik yayar:
```
http://<your-server-ip>:9100/metrics
```
Prometheus `scrape_configs` kısmına ekleyebilirsin.

## 9. Güncelleme
```bash
git pull
npm ci      # yeni bağımlılıklar
npm run migrate
npm start --restart
```
(Docker kullanıyorsan `docker compose up -d --build` yeterli.)

---

MIT Lisansı 