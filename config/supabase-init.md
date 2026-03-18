# Supabase Setup Guide

## Steps to Set Up Your Supabase Project

### 1. Create a Supabase Project
- Go to [supabase.com](https://supabase.com)
- Click "New Project"
- Choose your organization and fill in project details
- Wait for the project to initialize

### 2. Get Your API Credentials
- Go to Project Settings → API
- Copy your:
  - **Project URL** (SUPABASE_URL)
  - **anon key** (SUPABASE_ANON_KEY)

### 3. Update Configuration
Replace the following in `js/supabase-config.js`:
```javascript
const SUPABASE_URL = 'YOUR_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
