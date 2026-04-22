# Production-Grade Deployment & Data Management Guide: SteelFlex Website

This guide covers how to deploy the **SteelFlex Structures** website (a Vite + Node.js hybrid) to a **Hostinger VPS (KVM1)** with professional-grade security, automation, and data protection.

---

## 1. Key Data Locations
To prevent data loss, you must protect these two folders on your VPS:
- `/var/www/steelflex/public/data/` (Reviews, projects, and queries)
- `/var/www/steelflex/public/uploads/` (Images and documents)

---

## 2. Server Environment Setup

### A. System & Node.js (v20+)
```bash
sudo apt update && sudo apt upgrade -y
# We explicitly use Node.js 20 (LTS) for stability
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx

# Verify version: node -v (Should be 20.x)

# Install PM2 for process management
sudo npm install -g pm2
```

### B. Firewall (UFW)
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### C. Permissions Fix
Nginx and Node.js need proper access. Setting the owner to `www-data` (the web server user) ensures stability:
```bash
sudo chown -R www-data:www-data /var/www/steelflex
sudo chmod -R 775 /var/www/steelflex/public/data
sudo chmod -R 775 /var/www/steelflex/public/uploads
```

---

## 3. Initial Deployment (Git Flow)

While SFTP works, using **Git** is the production standard for stability.

1. **On Server**:
   ```bash
   cd /var/www
   git clone https://github.com/your-repo/steelflex.git
   cd steelflex
   npm install --production
   npm run build
   ```
2. **Start App**:
   ```bash
   pm2 start server.js --name "steelflex-app"
   pm2 save
   pm2 startup
   # (Follow the instruction printed by pm2 startup to copy-paste the final command)
   ```

---

## 4. Data Safety: Persistent Storage (Symlinks)
To keep your data safe during code updates, move it outside the project folder:

1. **Move folders**:
   ```bash
   mkdir -p /var/www/persistent_data
   mv /var/www/steelflex/public/data /var/www/persistent_data/
   mv /var/www/steelflex/public/uploads /var/www/persistent_data/
   sudo chown -R www-data:www-data /var/www/persistent_data
   ```
2. **Create Links**:
   ```bash
   ln -s /var/www/persistent_data/data /var/www/steelflex/public/data
   ln -s /var/www/persistent_data/uploads /var/www/steelflex/public/uploads
   ```

---

## 5. Nginx Configuration
Edit `/etc/nginx/sites-available/steelflex`:
```nginx
# Rate Limiting (Relaxed for real users: 10 requests/sec)
limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";

    location / {
        limit_req zone=one burst=20; # Allow bursts up to 20
        proxy_pass http://localhost:3000; 
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable and Apply Safety Check:**
```bash
sudo ln -s /etc/nginx/sites-available/steelflex /etc/nginx/sites-enabled/
# Always test config before reloading
sudo nginx -t && sudo systemctl reload nginx
```

---

## 6. SSL Setup (HTTPS)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Verify renewal works
sudo certbot renew --dry-run
```

---

## 7. Automated Backups (Compressed & Clean)
1. **Create Backup Folder & Set Permissions**:
   ```bash
   mkdir -p /var/www/backups
   sudo chown -R www-data:www-data /var/www/backups
   ```
2. **Open crontab**: `crontab -e`
3. **Add these lines**:
```bash
# 1. Create a compressed backup daily at 3 AM
0 3 * * * tar -czf /var/www/backups/backup_$(date +\%F).tar.gz /var/www/persistent_data

# 2. Cleanup: Delete backups older than 7 days to save disk space
0 4 * * * find /var/www/backups -type f -mtime +7 -delete
```

> [!CAUTION]
> **Disaster Recovery**: Backups on the same server are useless if the VPS crashes. **Download your backups weekly** or use a script to move them to Google Drive/Dropbox.

---

## 8. Updating the Website (Zero Downtime)
When you have new code changes:
```bash
cd /var/www/steelflex
git pull
npm install
npm run build
pm2 reload steelflex-app # 'reload' is zero-downtime
```

> [!IMPORTANT]
> If you change anything in your **.env** file, you must use `pm2 restart steelflex-app` instead of reload to apply those environment changes.

---

## 9. Monitoring & Health
- **Check Health**: The app includes a `/api/health` endpoint. Use a tool like **UptimeRobot** (Free) to monitor this URL.
- **View Logs**: `pm2 logs`
- **Disk Space**: `df -h`
- **Automatic Log Rotation**:
  ```bash
  pm2 install pm2-logrotate
  ```

---

## 10. Important Note: .env Handling
- **Create Manually**: The `.env` file MUST be created manually on the VPS. Never commit it to Git.
- **Example contents:**
  ```env
  PORT=3000
  NODE_ENV=production
  # Other secrets...
  ```


Chat GPT Output:

🚀 SteelFlex Final Deployment + Backup Guide (Complete)

🟢 PHASE 1: VPS SETUP (Base System)
1. Login to VPS
ssh root@your-server-ip
2. Update system
apt update && apt upgrade -y

🟢 PHASE 2: INSTALL REQUIRED SOFTWARE
Install essentials:
apt install nginx nodejs npm git unzip -y
(Adjust if your backend stack is different)

🟢 PHASE 3: PROJECT SETUP
1. Create project folder
mkdir -p /var/www/steelflexcd /var/www/steelflex

2. Upload your project
Options:


Git clone


Upload zip


FTP



3. Install dependencies
npm install

4. Setup environment file
nano .env
Add configs:
PORT=3000NODE_ENV=production

🟢 PHASE 4: DATA STRUCTURE (CRITICAL)
Create required folders:
mkdir -p /var/www/steelflex/datamkdir -p /var/www/steelflex/uploads
Set permissions:
chmod -R 755 /var/www/steelflex
👉 Your app MUST use these paths:


/data → JSON database


/uploads → images/files



🟢 PHASE 5: RUN APP (PM2 Recommended)
Install PM2:
npm install -g pm2
Start app:
pm2 start index.js --name steelflexpm2 savepm2 startup

🟢 PHASE 6: NGINX CONFIG (DOMAIN LINK)
Install Nginx:
apt install nginx -y
Create config:
nano /etc/nginx/sites-available/steelflex
Paste:
server {    listen 80;    server_name yourdomain.com;    location / {        proxy_pass http://localhost:3000;        proxy_http_version 1.1;        proxy_set_header Upgrade $http_upgrade;        proxy_set_header Connection 'upgrade';        proxy_set_header Host $host;        proxy_cache_bypass $http_upgrade;    }}
Enable:
ln -s /etc/nginx/sites-available/steelflex /etc/nginx/sites-enabled/nginx -tsystemctl restart nginx

🟢 PHASE 7: SSL (HTTPS)
apt install certbot python3-certbot-nginx -ycertbot --nginx -d yourdomain.com

🟢 PHASE 8: TEST YOUR SYSTEM
Check:


Website loads


Upload works


JSON updates correctly


Files saved in /uploads



🔐 PHASE 9: BACKUP SYSTEM (CRITICAL)
Step 1: Install rclone
apt install rclone -y

Step 2: Connect Google Drive
rclone config
Follow:


new remote → gdrive


storage → drive


login → allow



Step 3: Create Backup Script
nano /root/backup.sh
Paste:
#!/bin/bashDATE=$(date +%F-%H-%M)BACKUP_NAME="steelflex-backup-$DATE.tar.gz"LOCAL_PATH="/root/$BACKUP_NAME"# Create backuptar -czf $LOCAL_PATH /var/www/steelflex/data /var/www/steelflex/uploads# Upload to Google Driverclone copy $LOCAL_PATH gdrive:steelflex-backups# Verify uploadrclone ls gdrive:steelflex-backups | grep $BACKUP_NAMEif [ $? -eq 0 ]; then    echo "Upload verified: $BACKUP_NAME"    rm $LOCAL_PATHelse    echo "Upload FAILED: $BACKUP_NAME"fi# Cleanup old backups (30 days)rclone delete gdrive:steelflex-backups --min-age 30d
Make executable:
chmod +x /root/backup.sh

Step 4: Test Backup (MANDATORY)
bash /root/backup.sh
Check:


File created


Uploaded to Drive


Deleted locally



Step 5: Automate Backup
crontab -e
Add:
0 2 * * * /root/backup.sh >> /root/backup.log 2>&1

🧪 PHASE 10: FINAL SAFETY CHECKLIST
Before you sleep peacefully 😄
✅ Website live
✅ Upload working
✅ Data saving in /data
✅ Files saving in /uploads
✅ PM2 running
✅ Nginx working
✅ SSL active
✅ Backup script tested
✅ Backup visible in Google Drive
✅ Cron job added

⚠️ COMMON MISTAKES (Avoid These)


❌ Forgetting backup test


❌ Wrong folder paths


❌ No upload verification


❌ Not setting permissions


❌ Backup but no restore plan



🔥 NEXT (IMPORTANT — DO THIS WITH ME)
Now that deployment + backup is done…
👉 Next step is DISASTER RECOVERY (Restore System)
Because:

Backup without restore = false confidence

I can give you:
✅ One-command restore script
✅ Full server recovery flow
✅ “New VPS → live in 10 minutes” system

Just say: “next restore system” and we’ll build that 💪