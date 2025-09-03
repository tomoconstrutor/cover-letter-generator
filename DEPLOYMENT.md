# Deployment Guide for Cover Letter Generator

## Render.com Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. Connect to Render
1. Go to [render.com](https://render.com)
2. Sign up/login with your GitHub account
3. Click "New +" → "Static Site"
4. Connect your GitHub repository

### 3. Configure Build Settings
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`
- **Node Version**: 18 or higher

### 4. Environment Variables
No environment variables needed for static deployment.
Users will enter their OpenAI API key in the app.

### 5. Custom Domain (Optional)
After deployment, you can add a custom domain in Render settings.

## Local Testing
```bash
npm run build
npm run preview
```

## Features
- Professional PDF generation
- CopyThat methodology
- Multi-language support (EN/PT)
- ATS-friendly formatting