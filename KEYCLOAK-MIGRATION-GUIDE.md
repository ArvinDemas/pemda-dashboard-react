# 🔄 Keycloak Docker Migration Guide

## Masalah yang Diselesaikan

Ketika IP berubah karena DHCP, Keycloak tidak bisa diakses karena masih menggunakan IP lama. Biasanya solusinya adalah hapus container dan setup ulang manual - **TAPI SEKARANG TIDAK PERLU!**

## ✨ Solusi Otomatis

Script `migrate-keycloak.sh` menggunakan **database backup strategy**:

1. ✅ **Backup** database Keycloak (direktori `/opt/keycloak/data`)
2. ✅ **Hapus** container lama
3. ✅ **Buat** container baru dengan IP terbaru
4. ✅ **Restore** database ke container baru

**Hasil:** Keycloak dengan IP baru + semua data 100% sama (realms, clients, users, themes)!

---

## 🚀 Cara Menggunakan

### Langkah 1: Jalankan Script Migrasi

```bash
cd /Users/mrnugroho/Downloads/pemda-dashboard-react
./migrate-keycloak.sh
```

Script akan:
- Otomatis deteksi IP baru Anda
- Tanya konfirmasi sebelum mulai
- Export konfigurasi (backup aman!)
- Recreate container dengan IP baru
- Import konfigurasi kembali

**Estimasi waktu:** ~2-3 menit

### Langkah 2: Update Client Redirect URIs

Setelah migrasi selesai, buka Keycloak Admin:

```
http://[IP_BARU]:8080/admin
```

Login: `admin` / `admin`

Lalu update client **pemda-dashboard**:

1. **Jogja-SSO realm** → **Clients** → **pemda-dashboard**
2. Update semua URL dengan IP baru:
   - Root URL: `http://[IP_BARU]:3000`
   - Valid Redirect URIs: `http://[IP_BARU]:3000/*`
   - Valid Post Logout Redirect URIs: `http://[IP_BARU]:3000/*`
   - Web Origins: `http://[IP_BARU]:3000`
3. **Save**

### Langkah 3: Update Backend & Frontend Config

```bash
npm run set-ip
```

atau

```bash
./update-ip-easy.sh
```

---

## 📦 Backup

Setiap kali migrate, script akan menyimpan backup database lengkap di:

```
keycloak-backup/
└── keycloak-data-[TIMESTAMP]/
    └── data/
        ├── h2/
        │   └── keycloakdb.mv.db  (H2 database file)
        ├── import/
        └── tmp/
```

Backup ini adalah **copy lengkap database** yang bisa di-restore kapan saja.

---

## 🔧 Troubleshooting

### Script gagal backup database

**Error:** `Failed to backup database`

**Solusi:** Pastikan container Keycloak sedang running:

```bash
docker ps | grep keycloak
```

### Container tidak bisa start setelah restore

**Error:** `Container failed to start`

**Solusi:** 

1. Cek logs untuk detail error:
   ```bash
   docker logs keycloak_arvin
   ```

2. Jika database corrupt, restore dari backup manual:
   ```bash
   docker cp keycloak-backup/keycloak-data-[TIMESTAMP]/data/. keycloak_arvin:/opt/keycloak/data/
   docker restart keycloak_arvin
   ```

### Port 8080 sudah digunakan

**Error:** `port is already allocated`

**Solusi:** 

1. Cek aplikasi yang menggunakan port 8080:
   ```bash
   lsof -i :8080
   ```

2. Stop aplikasi tersebut atau gunakan port lain

---

## 📋 Info Teknis

**Container Details:**
- Name: `keycloak_arvin`
- Image: `pemdasso-final`
- Port: `8080:8080`
- Theme: `/Users/mrnugroho/jogja-theme` → `/opt/keycloak/themes/sso-pemda`

**Environment Variables:**
- `KEYCLOAK_ADMIN=admin`
- `KEYCLOAK_ADMIN_PASSWORD=admin`
- `KC_HOSTNAME=[AUTO_DETECTED_IP]`
- `KC_HOSTNAME_STRICT=false`
- `KC_HTTP_ENABLED=true`

---

## 💡 Tips

1. **Jalankan setiap kali IP berubah** - Script aman dijalankan berkali-kali
2. **Backup otomatis** - Setiap migrasi akan buat backup baru
3. **Verifikasi setelah migrasi** - Pastikan login masih berfungsi di dashboard

---

**Made with ❤️ for PEMDA DIY Dashboard**
