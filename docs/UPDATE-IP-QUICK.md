# IP Update Utility - Simplified Version

Dokumentasi lengkap ada di [IP-UPDATE-GUIDE.md](IP-UPDATE-GUIDE.md)

## 🎯 Cara Tercepat Update IP

### Opsi 1: Dari Mana Saja (Recommended!)

Jalankan script ini dari directory mana pun:

```bash
/Users/mrnugroho/Downloads/pemda-dashboard-react/update-ip-easy.sh
```

### Opsi 2: Dari Project Directory

```bash
cd /Users/mrnugroho/Downloads/pemda-dashboard-react
npm run set-ip
```

### Opsi 3: Buat Alias (Paling Mudah!)

Tambahkan ke `~/.zshrc` atau `~/.bash_profile`:

```bash
alias update-ip='/Users/mrnugroho/Downloads/pemda-dashboard-react/update-ip-easy.sh'
```

Setelah itu, dari mana saja cukup ketik:

```bash
update-ip
```

## ⚡ Setup Alias (Sekali Saja)

Jalankan perintah ini **sekali saja**:

```bash
echo "alias update-ip='/Users/mrnugroho/Downloads/pemda-dashboard-react/update-ip-easy.sh'" >> ~/.zshrc
source ~/.zshrc
```

Setelah itu, dari directory mana pun, cukup ketik:

```bash
update-ip
```

## 📱 Setelah Update IP

Jangan lupa update Keycloak:

1. Buka: http://10.7.183.46:8080/admin
2. **Jogja-SSO realm** → **Clients** → **pemda-dashboard**
3. Update semua URL dengan IP baru
4. Save

---

**Made with ❤️ for PEMDA DIY Dashboard**
