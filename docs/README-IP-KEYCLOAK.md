# 🎯 PEMDA Dashboard - IP & Keycloak Management

Quick reference untuk mengelola IP dan Keycloak ketika IP berubah karena DHCP.

---

## 🚨 Ketika IP Berubah (Daily Routine)

### Opsi A: Full Migration (Keycloak + Backend + Frontend)

Jika Keycloak **tidak bisa diakses** (ERR_CONNECTION_REFUSED):

```bash
cd /Users/mrnugroho/Downloads/pemda-dashboard-react
./migrate-keycloak.sh
```

Lalu update client redirect URIs di Keycloak Admin (lihat [KEYCLOAK-MIGRATION-GUIDE.md](KEYCLOAK-MIGRATION-GUIDE.md))

### Opsi B: Update Backend/Frontend Saja

Jika Keycloak **masih bisa diakses** di IP lama:

```bash
./update-ip-easy.sh
```

atau dari project directory:

```bash
npm run set-ip
```

---

## 📚 Dokumentasi Lengkap

- **[KEYCLOAK-MIGRATION-GUIDE.md](KEYCLOAK-MIGRATION-GUIDE.md)** - Panduan migrasi Keycloak ke IP baru
- **[IP-UPDATE-GUIDE.md](IP-UPDATE-GUIDE.md)** - Panduan lengkap update IP untuk backend/frontend
- **[UPDATE-IP-QUICK.md](UPDATE-IP-QUICK.md)** - Quick reference update IP

---

## 🛠️ Scripts Available

| Script | Fungsi | Kapan Digunakan |
|--------|--------|-----------------|
| `migrate-keycloak.sh` | Migrate Keycloak container ke IP baru | IP berubah & Keycloak tidak bisa diakses |
| `update-ip-easy.sh` | Update IP di backend/frontend .env | Setiap hari sebelum kerja |
| `update-ip.js` | Core script untuk update IP | Dipanggil oleh script lain |

---

## ⚡ Setup Sekali Saja (Optional)

Buat alias agar lebih mudah:

```bash
echo 'alias update-ip="/Users/mrnugroho/Downloads/pemda-dashboard-react/update-ip-easy.sh"' >> ~/.zshrc
echo 'alias migrate-keycloak="/Users/mrnugroho/Downloads/pemda-dashboard-react/migrate-keycloak.sh"' >> ~/.zshrc
source ~/.zshrc
```

Setelah itu:

```bash
update-ip          # Update backend/frontend
migrate-keycloak   # Migrate Keycloak
```

---

## 🔄 Daily Workflow

**Setiap pagi sebelum kerja:**

1. Check apakah IP berubah:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. Jika berubah:
   - Jalankan `migrate-keycloak.sh` (sekali)
   - Update client URIs di Keycloak Admin
   - Jalankan `update-ip-easy.sh`

3. Start servers:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm start
   
   # Terminal 2 - Frontend
   cd frontend && npm start
   ```

4. Access dashboard:
   ```
   http://[IP_BARU]:3000
   ```

---

## 🆘 Troubleshooting

### "ERR_CONNECTION_REFUSED" saat akses Keycloak

**Penyebab:** IP sudah berubah, Keycloak masih pakai IP lama

**Solusi:** Jalankan `migrate-keycloak.sh`

### "npm run set-ip" error ENOENT

**Penyebab:** Command dijalankan di luar project directory

**Solusi:** Gunakan `update-ip-easy.sh` atau `cd` ke project dulu

### Login redirect error setelah update IP

**Penyebab:** Client redirect URIs di Keycloak belum diupdate

**Solusi:** Update di Keycloak Admin Console (lihat guide)

---

**Made with ❤️ for PEMDA DIY Dashboard**
