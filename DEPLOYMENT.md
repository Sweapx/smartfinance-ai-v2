# Production Deployment Guide

## Prerequisites

Before deploying to production, ensure you have:

- Python 3.11 installed
- Node.js 18+ installed
- Cloud database account (MySQL/PostgreSQL) or use SQLite for small deployments
- Groq API key
- Domain name (optional but recommended)

## Pre-Deployment Checklist

### 1. Security Configuration

**Generate strong SECRET_KEY:**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Update `.env` file:**
```env
DATABASE_URL=mysql+pymysql://username:password@your-db-host:3306/database_name
SECRET_KEY=your-generated-secret-key-here
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.1-8b-instant
FRONTEND_URL=https://yourdomain.com
ENVIRONMENT=production
```

### 2. Database Setup

**Option A: Cloud MySQL (Recommended for production)**
- AWS RDS
- Google Cloud SQL
- Supabase
- Railway

**Option B: SQLite (For small deployments)**
```env
DATABASE_URL=sqlite:///./smartfinance.db
```

### 3. Frontend Build

```bash
cd frontend
npm run build
```

This creates a `dist/` folder with optimized production files.

## Deployment Options

### Option 1: Heroku (Easiest)

**Backend:**
```bash
cd backend
heroku create your-app-name
heroku addons create heroku-postgresql
heroku config:set DATABASE_URL=your-database-url
heroku config:set SECRET_KEY=your-secret-key
heroku config:set GROQ_API_KEY=your-groq-key
heroku config:set FRONTEND_URL=https://your-app-name.herokuapp.com
heroku config:set ENVIRONMENT=production

git add .
git commit -m "Deploy to production"
git push heroku main
```

**Frontend:**
```bash
cd frontend
npm run build
heroku create your-frontend-app-name
# Configure build settings in Heroku dashboard
# Build command: npm run build
# Start command: serve -s dist -l $PORT
```

### Option 2: Railway (Modern & Simple)

1. Connect your GitHub repository to Railway
2. Railway will auto-detect Python and Node.js projects
3. Set environment variables in Railway dashboard
4. Deploy automatically on push

### Option 3: VPS (Full Control)

**Backend Setup:**
```bash
# Install dependencies
sudo apt update
sudo apt install python3.11 python3-pip nginx

# Clone repository
git clone your-repo-url
cd smartfinance-ai/backend

# Setup virtual environment
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup environment
cp .env.example .env
nano .env  # Edit with production values

# Setup systemd service
sudo nano /etc/systemd/system/smartfinance-api.service
```

**Systemd Service Config:**
```ini
[Unit]
Description=SmartFinance API
After=network.target

[Service]
User=your-user
WorkingDirectory=/path/to/smartfinance-ai/backend
Environment="PATH=/path/to/smartfinance-ai/backend/venv/bin"
ExecStart=/path/to/smartfinance-ai/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable smartfinance-api
sudo systemctl start smartfinance-api
```

**Frontend Setup with Nginx:**
```bash
cd frontend
npm run build

# Configure nginx
sudo nano /etc/nginx/sites-available/smartfinance
```

**Nginx Config:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        root /path/to/smartfinance-ai/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/smartfinance /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option 4: Docker (Containerized)

**Create `Dockerfile` in backend:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Create `Dockerfile` in frontend:**
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Build and run:**
```bash
docker-compose up -d
```

## Post-Deployment Steps

### 1. SSL/HTTPS Setup

**Using Let's Encrypt (Free):**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 2. Database Migration

If you have existing users/data, you may need to migrate the database. SQLAlchemy will auto-create tables on first run, but for production consider using Alembic for migrations.

### 3. Monitoring Setup

- Check logs: `journalctl -u smartfinance-api -f`
- Monitor disk space
- Set up error tracking (Sentry, etc.)

### 4. Backup Strategy

**Database Backup (MySQL):**
```bash
mysqldump -u username -p database_name > backup.sql
```

**Database Backup (SQLite):**
```bash
cp smartfinance.db smartfinance_backup.db
```

Set up automated backups using cron jobs.

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `mysql+pymysql://user:pass@host:3306/db` |
| `SECRET_KEY` | JWT signing key | `random-32-char-string` |
| `GROQ_API_KEY` | Groq API key for chatbot | `gsk_xxx` |
| `GROQ_MODEL` | Groq model to use | `llama-3.1-8b-instant` |
| `FRONTEND_URL` | Frontend domain | `https://yourapp.com` |
| `ENVIRONMENT` | Environment mode | `production` |

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check firewall rules
- Ensure database server is accessible

### CORS Errors
- Verify FRONTEND_URL matches your domain
- Check ENVIRONMENT is set to `production`

### AI Model Loading Issues
- Ensure `ai_models/` folder exists with model files
- Check TensorFlow compatibility

### Chatbot Not Working
- Verify GROQ_API_KEY is valid
- Check API quota limits

## Performance Optimization

1. **Enable Gzip compression** in nginx
2. **Use CDN** for static assets
3. **Implement caching** for API responses
4. **Use connection pooling** for database
5. **Enable rate limiting** for API endpoints

## Security Best Practices

1. Never commit `.env` files
2. Use strong SECRET_KEY
3. Enable HTTPS only
4. Implement rate limiting
5. Regular security updates
6. Monitor logs for suspicious activity
7. Use environment-specific configurations
8. Implement proper error handling (don't expose stack traces)

## Scaling Considerations

For high-traffic deployments:

- Use load balancer (nginx, HAProxy)
- Deploy multiple backend instances
- Use Redis for session management
- Implement database read replicas
- Use CDN for static assets
- Consider serverless functions for specific endpoints
