# Vercel Deployment Guide - Sphaire3D

## Current Setup

**Vercel App:** sphaire.vercel.app  
**Custom Domain:** sphaire3d.design  
**Project:** sphaire

---

## Pre-Deployment Checklist

### 1. Code Status
- [ ] All changes committed to git
- [ ] .env.local is NOT committed (protected by .gitignore)
- [ ] Build passes locally: `npm run build`

### 2. Environment Variables Ready
You'll need to add these in Vercel Dashboard:

**Required:**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=https://sphaire3d.design
```

**OpenAI API Keys (choose one method):**

**Method A: Single Key**
```bash
NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-...
```

**Method B: Key Pool (Recommended)**
```bash
OPENAI_API_KEYS=sk-proj-key1,sk-proj-key2,sk-proj-key3,sk-proj-key4,sk-proj-key5,sk-proj-key6,sk-proj-key7
```

**Optional but Recommended:**
```bash
NODE_ENV=production
```

---

## Step-by-Step Deployment

### Step 1: Commit Your Code

```bash
cd "/Users/pranavchahal/Downloads/sphaire web beta copy 4"

# Check what's changed
git status

# Add all changes
git add .

# Commit
git commit -m "Production ready: SEO, Analytics, AI Logging, Security"

# Push to your repository
git push origin main
```

### Step 2: Set Environment Variables in Vercel

1. Go to: https://vercel.com/pranavs-projects-17bd5116/sphaire/settings/environment-variables

2. Add each variable:
   - Click "Add New"
   - Enter Key name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - Paste Value from your `.env.local` file
   - Select environments: **Production**, **Preview**, **Development**
   - Click "Save"

3. Repeat for ALL variables from `.env.local`

**IMPORTANT:** Copy values from your `.env.local` file - don't recreate them!

### Step 3: Trigger Deployment

**Option A: Automatic (if connected to Git)**
```bash
# Deployment triggers automatically on push
git push origin main
```

**Option B: Manual via Vercel Dashboard**
1. Go to: https://vercel.com/pranavs-projects-17bd5116/sphaire
2. Click "Deployments" tab
3. Click "Redeploy" on latest deployment
4. Select "Use existing Build Cache" (optional)
5. Click "Redeploy"

**Option C: Via Vercel CLI**
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Step 4: Configure Custom Domain

1. Go to: https://vercel.com/pranavs-projects-17bd5116/sphaire/settings/domains

2. Add domain:
   - Enter: `sphaire3d.design`
   - Click "Add"

3. Configure DNS (at your domain registrar):

**If using Vercel Nameservers (Recommended):**
```
Point nameservers to Vercel:
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**OR if using your own DNS:**
```
A Record:
Name: @
Value: 76.76.21.21

CNAME Record:
Name: www
Value: cname.vercel-dns.com
```

4. Wait for DNS propagation (5-60 minutes)

5. Vercel will auto-provision SSL certificate

---

## Supabase Setup

### Verify Supabase Configuration

1. **Database Tables**
   - Check tables exist: `design_files`, `ai_query_logs`, `ai_error_logs`
   - Run migration if needed (already done)

2. **Authentication**
   - Google OAuth configured
   - Redirect URLs include: `https://sphaire3d.design`

3. **Add Production URL to Supabase**
   
   Go to: Supabase Project → Authentication → URL Configuration
   
   **Site URL:**
   ```
   https://sphaire3d.design
   ```
   
   **Redirect URLs (add both):**
   ```
   https://sphaire3d.design/dashboard
   https://sphaire3d.design/
   https://sphaire.vercel.app/dashboard
   https://sphaire.vercel.app/
   ```

---

## Verification After Deployment

### 1. Check Build Logs
```
Vercel Dashboard → Deployments → Latest → View Build Logs
```

Look for:
- ✓ Build completed successfully
- ✓ No errors in logs
- ✓ Environment variables loaded

### 2. Test Production Site

Visit: https://sphaire3d.design

**Test these features:**
- [ ] Homepage loads
- [ ] Can sign in with Google
- [ ] AI Modeling panel works
- [ ] Create a 3D object
- [ ] Check Supabase logs appear
- [ ] Analytics tracking (Vercel Dashboard)

### 3. Check SEO

**Test URLs:**
```
https://sphaire3d.design/robots.txt
https://sphaire3d.design/sitemap.xml
```

Should load without errors.

**Test Meta Tags:**
- View page source
- Check `<title>` tag
- Check `<meta name="description">`
- Check Open Graph tags

### 4. Test Analytics

1. Visit your site
2. Wait 5 minutes
3. Check: https://vercel.com/pranavs-projects-17bd5116/sphaire/analytics
4. Should see your visit

### 5. Test Error Logging

1. Create a test object with AI
2. Check Supabase: `SELECT * FROM ai_query_logs ORDER BY created_at DESC LIMIT 1;`
3. Should see your query logged

---

## Post-Deployment Tasks

### 1. Submit to Search Engines

**Google Search Console:**
```
1. Go to: https://search.google.com/search-console
2. Add property: https://sphaire3d.design
3. Verify via DNS or HTML tag
4. Submit sitemap: https://sphaire3d.design/sitemap.xml
```

**Bing Webmaster Tools:**
```
1. Go to: https://www.bing.com/webmasters
2. Add site: https://sphaire3d.design
3. Verify
4. Submit sitemap
```

### 2. Set Up Monitoring

**Vercel:**
- Check deployment status daily
- Monitor analytics weekly
- Review build logs for errors

**Supabase:**
- Check database usage
- Monitor auth logs
- Review API usage

**OpenAI:**
- Monitor API usage
- Check for rate limits
- Review costs

### 3. Marketing

**Day 1:**
- [ ] Post on Product Hunt
- [ ] Share on Twitter/LinkedIn
- [ ] Post on relevant subreddits
- [ ] Update portfolio/website

**Week 1:**
- [ ] Submit to AI tool directories
- [ ] Submit to 3D software listings
- [ ] Reach out to design communities

---

## Troubleshooting

### Build Fails

**Check:**
1. Build logs in Vercel
2. Environment variables set correctly
3. No TypeScript errors: `npm run build` locally
4. Dependencies installed: `npm install`

**Common fixes:**
```bash
# Clear cache and rebuild
vercel --prod --force

# Check for missing dependencies
npm install
```

### Environment Variables Not Working

1. Verify exact variable names (case-sensitive)
2. Check all environments selected (Production, Preview, Development)
3. Redeploy after adding variables
4. No quotes needed in Vercel dashboard

### Domain Not Working

1. Check DNS propagation: https://dnschecker.org
2. Verify DNS records at registrar
3. Wait up to 48 hours for propagation
4. Check Vercel domain status

### Google OAuth Not Working

1. Add production URL to Supabase redirect URLs
2. Check Google OAuth console has correct URLs
3. Clear browser cookies
4. Try incognito mode

---

## Quick Deploy Commands

**Full deployment:**
```bash
# 1. Commit changes
git add .
git commit -m "Deploy to production"
git push origin main

# 2. Deployment auto-triggers on Vercel
# Check: https://vercel.com/pranavs-projects-17bd5116/sphaire/deployments

# 3. Monitor build
# Wait for green checkmark
```

**Emergency rollback:**
```bash
# In Vercel Dashboard:
# Deployments → Previous deployment → Promote to Production
```

---

## Environment Variables Checklist

Copy these from your `.env.local` to Vercel:

```bash
# Supabase (2 variables)
[ ] NEXT_PUBLIC_SUPABASE_URL
[ ] NEXT_PUBLIC_SUPABASE_ANON_KEY

# OpenAI - Use ONE of these methods
[ ] NEXT_PUBLIC_OPENAI_API_KEY (single key)
OR
[ ] OPENAI_API_KEYS (pool - recommended)

# Site URL (1 variable)
[ ] NEXT_PUBLIC_SITE_URL=https://sphaire3d.design

# Optional
[ ] NODE_ENV=production
```

**Total: 3-4 variables minimum**

---

## Success Criteria

Your deployment is successful when:

- ✓ Build completes without errors
- ✓ Site loads at https://sphaire3d.design
- ✓ Google OAuth works
- ✓ Can create 3D objects with AI
- ✓ Logs appear in Supabase
- ✓ Analytics tracking works
- ✓ SEO files accessible (robots.txt, sitemap.xml)
- ✓ No console errors in browser
- ✓ SSL certificate active (https)

---

## Support Resources

**Vercel:**
- Documentation: https://vercel.com/docs
- Support: https://vercel.com/support

**Supabase:**
- Documentation: https://supabase.com/docs
- Support: https://supabase.com/support

**Your Project:**
- Vercel Dashboard: https://vercel.com/pranavs-projects-17bd5116/sphaire
- Domain: https://sphaire3d.design
- Repository: [Your git repository URL]

---

## Final Checklist Before Deploying

- [ ] `.env.local` has all API keys (DO NOT commit this file)
- [ ] Code builds successfully: `npm run build`
- [ ] No TypeScript errors
- [ ] Environment variables ready to copy
- [ ] Supabase migrations run
- [ ] Google OAuth configured
- [ ] Git repository up to date
- [ ] Ready to set variables in Vercel

**You're ready to deploy!** Follow the steps above.
