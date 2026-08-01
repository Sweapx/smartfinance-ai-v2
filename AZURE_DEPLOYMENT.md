# Azure Deployment Guide with Azure Database for MySQL

## Prerequisites

- Azure account (free tier available)
- Azure CLI installed
- Git

## Step 1: Create Azure Database for MySQL

```bash
# Login to Azure
az login

# Create resource group
az group create --name smartfinance-rg --location southeastasia

# Create Azure MySQL Flexible Server
az mysql flexible-server create \
  --name smartfinance-db \
  --resource-group smartfinance-rg \
  --location southeastasia \
  --sku-name Standard_B1ms \
  --storage-size 32 \
  --admin-user myadmin \
  --admin-password YourStrongPassword123! \
  --public-access 0.0.0.0

# Configure firewall to allow Azure services
az mysql flexible-server firewall-rule create \
  --name AllowAllAzureIPs \
  --resource-group smartfinance-rg \
  --server-name smartfinance-db \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Create database
az mysql flexible-server db create \
  --resource-group smartfinance-rg \
  --server-name smartfinance-db \
  --database-name smartfinance_db
```

## Step 2: Create Azure App Service for Backend

```bash
# Create App Service Plan (Linux)
az appservice plan create \
  --name smartfinance-plan \
  --resource-group smartfinance-rg \
  --sku B1 \
  --is-linux

# Create Web App for backend
az webapp create \
  --name smartfinance-api \
  --resource-group smartfinance-rg \
  --plan smartfinance-plan \
  --runtime "PYTHON:3.11"

# Get MySQL connection string
MYSQL_HOST=$(az mysql flexible-server show \
  --resource-group smartfinance-rg \
  --name smartfinance-db \
  --query fullyQualifiedDomainName \
  --output tsv)

# Set environment variables
az webapp config appsettings set \
  --resource-group smartfinance-rg \
  --name smartfinance-api \
  --settings \
    DATABASE_URL="mysql+pymysql://myadmin:YourStrongPassword123!@${MYSQL_HOST}:3306/smartfinance_db" \
    SECRET_KEY="your-generated-secret-key" \
    GROQ_API_KEY="your-groq-api-key" \
    GROQ_MODEL="llama-3.1-8b-instant" \
    FRONTEND_URL="https://your-frontend-url.azurestaticapps.net" \
    ENVIRONMENT="production"
```

## Step 3: Deploy Backend

```bash
# Configure local git deployment
az webapp deployment source config-local-git \
  --resource-group smartfinance-rg \
  --name smartfinance-api

# Get deployment URL
DEPLOY_URL=$(az webapp deployment source config-local-git \
  --resource-group smartfinance-rg \
  --name smartfinance-api \
  --query url \
  --output tsv)

# Add Azure remote and push
cd backend
git remote add azure $DEPLOY_URL
git add .
git commit -m "Deploy to Azure"
git push azure main
```

## Step 4: Create Azure Static Web Apps for Frontend

```bash
# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Create Static Web App
az staticwebapp create \
  --name smartfinance-frontend \
  --resource-group smartfinance-rg \
  --source https://github.com/yourusername/smartfinance-ai \
  --branch main \
  --app-location frontend \
  --output-location dist \
  --sku Free

# Or deploy manually:
cd frontend
npm run build
swa deploy ./dist --env production
```

## Step 5: Configure CORS

```bash
# Add frontend URL to backend CORS
az webapp cors add \
  --resource-group smartfinance-rg \
  --name smartfinance-api \
  --allowed-origins "https://smartfinance-frontend.azurestaticapps.net"
```

## Step 6: Verify Deployment

```bash
# Check backend health
curl https://smartfinance-api.azurewebsites.net/health

# Check frontend
open https://smartfinance-frontend.azurestaticapps.net
```

## Database Connection String Format

For Azure MySQL, use this format in App Settings:
```
mysql+pymysql://myadmin:YourPassword@smartfinance-db.mysql.database.azure.com:3306/smartfinance_db
```

## Cost Estimation

- **Azure MySQL Flexible Server (B1ms)**: ~$15-25/month
- **App Service (B1)**: ~$13/month
- **Static Web Apps**: Free tier available
- **Total**: ~$28-38/month

## Scaling

For high traffic:
- Upgrade MySQL to higher tier (B2ms, B4ms, etc.)
- Enable auto-scaling on App Service
- Consider Azure Container Apps for microservices

## Backup Strategy

Azure MySQL provides automated backups:
- 7-day retention for Basic tier
- 35-day retention for General Purpose tier

## Monitoring

Enable Application Insights:
```bash
az monitor app-insights component create \
  --app smartfinance-ai \
  --location southeastasia \
  --resource-group smartfinance-rg \
  --application-type web
```
