# Zepatrol Worker

_Zincir düğümlerini **sıfır operasyon** ile izleyen, Docker-ready cron servisi._

![CI](https://img.shields.io/badge/build-passing-green)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## İçindekiler
1. [Özellikler](#özellikler)
2. [Teknoloji Yığını](#teknoloji-yığını)
3. [Mimari](#mimari)
4. [Dizin Yapısı](#dizin-yapısı)
5. [Kurulum](#kurulum)
6. [Ortam Değişkenleri](#ortam-değişkenleri)
7. [Veritabanı Şeması](#veritabanı-şeması)
8. [Çalışma Mantığı](#çalışma-mantığı)
9. [Test & Kapsama](#test--kapsama)
10. [Prometheus Metrikleri](#prometheus-metrikleri)
11. [Katkı Sağlama](#katkı-sağlama)
12. [Lisans](#lisans)

---

## Özellikler
* ⏲️ **Plan-bazlı sıklık** – Free: 24 saat, Premium: 15 dk.
* 🔍 **Çoklu yöntem** – HTTP, JSON-RPC, ICMP Ping.
* 🚨 **Akıllı uyarılar** – E-posta (tüm planlar) + Telegram (Premium).
* 📊 **Günlük Özetler** – 17:00 UTC'de e-posta ve Telegram ile detaylı performans raporları.
* 📈 **Prometheus** – `/metrics` ile gerçek zamanlı istatistikler.
* 🐳 **Docker Compose** – `postgres + worker` tek komutla ayağa kalkar.
* 🧪 **≥ 90 % test coverage** – Jest + Testcontainers.
* 📜 **Tamamen ESM & Node 20** – Derleme adımı yok.

## Teknoloji Yığını
| Katman | Teknolojiler |
|--------|--------------|
| Dil | Node.js 20 (ESM) |
| Görev Zamanlayıcı | node-cron |
| DB Erişim | Prisma ORM + PostgreSQL |
| HTTP İstekleri | axios |
| Bildirimler | nodemailer, telegraf |
| Günlükleme | pino |
| Metrikler | prom-client |
| Test | jest, testcontainers |

## Mimari
```mermaid
flowchart LR
    C[cron scheduler] --> H(checker)
    H -->|Prisma| D[(PostgreSQL)]
    H -->|nodemailer| E[email]
    H -->|Telegraf| T[telegram]
    subgraph Monitoring
      P(prom-client) --> M[/metrics/]
    end
```

## Dizin Yapısı
```text
server/
├─ src/
│  ├─ index.js          # Bootstrap & DI
│  ├─ config/           # Ortam değişkenleri (zod)
│  ├─ modules/          # İş mantığı (checks, alerts, telemetry)
│  ├─ infra/            # Logger, queue placeholder
│  └─ prisma/           # Prisma client singleton
├─ prisma/              # Schema + seed
├─ tests/               # Unit & integration
├─ scripts/             # Yardımcı CLI script'ler (test-alert)
├─ Dockerfile           # Çok katmanlı build
├─ docker-compose.yml   # Postgres + worker
└─ env.example          # Örnek ortam değişkenleri
```

## Kurulum
Detaylı anlatım için [`SETUP.md`](SETUP.md) dosyasına göz atabilirsiniz. Özet:
```bash
# Docker tercih ediyorsanız
$ docker compose up -d --build   # Postgres + worker

# Yerel Node / VPS
$ cd server && cp env.example .env
$ npm ci && npm run migrate && npm run seed
$ npm start
```
> SMTP & Telegram ayarlarını test etmek için: `npm run test-alert`
> Günlük özet sistemini test etmek için: `node scripts/test-daily-summary.js`

## Ortam Değişkenleri
Çoğu değişken `env.example` içinde örneklenmiştir:
* `DATABASE_URL` – Supabase veya yerel Postgres.
* `CHECK_INTERVAL_CRON` – Worker tetikleme periyodu.
* `EMAIL_*` – SMTP sağlayıcınız.
* `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` – (opsiyonel).

## Veritabanı Şeması
Temel tablolar: **User**, **Node**, **Alert**, **BlockchainProject**.
* `User.subscriptionStatus` alanı free/premium ayrımını tutar.
* `Node.nodeConfig` JSON formatında kullanıcı kredansiyelleri saklar.
* `Alert` kaydı node problemleri için uyarı tutar.
* `BlockchainProject` desteklenen blockchain'leri ve doğrulama yöntemlerini tanımlar.

## Çalışma Mantığı
1. node-cron, `env.CHECK_INTERVAL_CRON` ifadesine göre `checker` modülünü tetikler.
2. Checker, izlenen tüm node'ları çeker ve plan bazlı kontrol sıklığına göre filtreler.
3. Node'un `blockchainProject.validationMethod` alanına bakarak HTTP / JSON-RPC / API kontrolü yapar.
4. Her kontrol sonrası performans geçmişi `NodePerformanceHistory` tablosuna kaydedilir.
5. Başarısızlık durumunda `Alert` tablosuna kayıt yazılır.
6. Başarısızlık durumunda:
   * Her plan → E-posta (notificationEmail veya email'e)
   * Premium → Telegram (chatId mevcutsa)
7. **Günlük Özetler**: Her gün 17:00 UTC'de tüm kullanıcılar için:
   * Node performans geçmişi analiz edilir
   * 24 saatlik değişimler hesaplanır
   * E-posta ve Telegram ile detaylı rapor gönderilir
8. Plan bazlı kontrol sıklığı: Premium 15 dk, Free 24 saat.

## Test & Kapsama
```bash
npm test              # jest --coverage  (≥ 90 %)
```
Integrasyon testi Postgres container'ı döndürür, migrasyonları uygular.

## Prometheus Metrikleri
Worker, 9100 portunda `/metrics` endpoint'i sunar:
```
up{service="zepatrol-worker"} 1
health_checks_total 123
health_checks_failed 3
```
Prometheus `scrape_configs` örneği:
```yaml
- job_name: zepatrol-worker
  static_configs:
    - targets: ['worker:9100']
```

## Katkı Sağlama
1. Fork → yeni dal `git checkout -b feature/harika`
2. `npm run lint && npm test` geçtiğinden emin ol.
3. PR aç, detaylı açıklama ekle 🙌

## Lisans
MIT © 2024 