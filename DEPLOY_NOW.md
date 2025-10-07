# Quick Deploy to Vercel - NOW

## Your Setup:
- Vercel App: sphaire.vercel.app
- Custom Domain: sphaire3d.design
- Status: Ready to deploy

---

## STEP 1: Commit All Changes (30 seconds)

Run these commands:

```bash
cd "/Users/pranavchahal/Downloads/sphaire web beta copy 4"

git add .

git commit -m "Production ready: SEO, Analytics, Logging, Emoji cleanup"

git push origin main
```

---

## STEP 2: Set Environment Variables in Vercel (2 minutes)

Go to: https://vercel.com/pranavs-projects-17bd5116/sphaire/settings/environment-variables

Copy these from your `.env.local` file and add to Vercel:

### Required Variables (Copy exact values from .env.local):

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Value: (copy from .env.local)
   - Environments: Production, Preview, Development

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Value: (copy from .env.local)
   - Environments: Production, Preview, Development

3. **OPENAI_API_KEYS** (your 7-key pool)
   - Value: (copy all 7 keys comma-separated from .env.local)
   - Environments: Production, Preview, Development

4. **NEXT_PUBLIC_SITE_URL**
   - Value: `https://sphaire3d.design`
   - Environments: Production, Preview, Development

---

## STEP 3: Deploy (Automatic)

After you push to git (Step 1), Vercel will automatically deploy!

Check status: https://vercel.com/pranavs-projects-17bd5116/sphaire/deployments

---

## STEP 4: Configure Domain (Already done?)

If sphaire3d.design is not connected yet:

1. Go to: https://vercel.com/pranavs-projects-17bd5116/sphaire/settings/domains
2. Add: `sphaire3d.design`
3. Follow DNS instructions from your domain registrar

---

## STEP 5: Update Supabase URLs

Go to your Supabase project → Authentication → URL Configuration

Add these redirect URLs:
```
https://sphaire3d.design
https://sphaire3d.design/dashboard
https://sphaire.vercel.app
https://sphaire.vercel.app/dashboard
```

---

## That's It!

After ~2 minutes, your site will be live at:
- https://sphaire3d.design
- https://sphaire.vercel.app

---

## Verify Deployment:

1. Visit https://sphaire3d.design
2. Sign in with Google
3. Create a 3D object
4. Check logs in Supabase

---

## What's Deployed:

- AI 3D modeling with OpenCascade
- 7-key API pool (no rate limits)
- AI query logging to Supabase
- Full SEO optimization
- Vercel Analytics
- Google OAuth
- All features working

**You're ready to go live!**
