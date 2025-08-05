# Supabase Integration Setup Guide

## 🚀 Quick Setup Checklist

### 1. Environment Variables
Copy the credentials to your `.env.local` file:

```bash
# Add these to your .env.local file
NEXT_PUBLIC_SUPABASE_URL=https://mvqfkhyxrcymuvorjeru.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12cWZraHl4cmN5bXV2b3JqZXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTExMzQsImV4cCI6MjA2OTYyNzEzNH0.ialegLE20NcwP5xPA0nklkGcf8mo0f6dKKzqKanDbtY
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12cWZraHl4cmN5bXV2b3JqZXJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA1MTEzNCwiZXhwIjoyMDY5NjI3MTM0fQ.BZtwCLW8MSlMPWyaXGSDWtnQLq9j4MZIU1mBHdtcOOY
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### 2. Database Setup
Run the SQL commands in `database/schema.sql` in your Supabase SQL Editor:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the entire content of `database/schema.sql`
4. Click "Run" to execute the commands

### 3. Google OAuth Setup
1. Go to your Supabase dashboard → Authentication → Providers
2. Enable Google provider
3. Add your Google OAuth credentials:
   - **Client ID**: `your_google_client_id_here`
   - **Client Secret**: `your_google_client_secret_here`
4. Set redirect URL to: `https://mvqfkhyxrcymuvorjeru.supabase.co/auth/v1/callback`

### 4. Storage Setup
1. Go to Storage in your Supabase dashboard
2. Create a new bucket called `design-assets`
3. Set it to **Private** (not public)
4. Apply the storage policies (copy from the comments in `database/schema.sql`)

### 5. Vercel Environment Variables
Add these to your Vercel deployment:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://mvqfkhyxrcymuvorjeru.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12cWZraHl4cmN5bXV2b3JqZXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNTExMzQsImV4cCI6MjA2OTYyNzEzNH0.ialegLE20NcwP5xPA0nklkGcf8mo0f6dKKzqKanDbtY
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12cWZraHl4cmN5bXV2b3JqZXJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA1MTEzNCwiZXhwIjoyMDY5NjI3MTM0fQ.BZtwCLW8MSlMPWyaXGSDWtnQLq9j4MZIU1mBHdtcOOY
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
```

## 🎯 What's Been Implemented

### ✅ Authentication System
- **Email/Password signup and login** with validation
- **Google OAuth integration** for seamless login
- **Protected routes** that redirect to login if not authenticated
- **Session management** with automatic token refresh

### ✅ Database Integration
- **design_files table** with Row Level Security (RLS)
- **User file ownership** and sharing permissions
- **Automatic timestamps** for created_at and updated_at
- **UUID-based IDs** for security

### ✅ UI Components
- **Login page** (`/login`) with email and Google auth
- **Signup page** (`/signup`) with password confirmation
- **Dashboard** (`/dashboard`) showing user's files
- **Design editor** (`/design/[fileId]`) with integrated 3D viewport

### ✅ File Management
- **Create new files** from dashboard
- **View and edit file names** inline
- **File ownership** and access control
- **Real-time save status** indicators

### ✅ Real-time Collaboration (Ready)
- **Presence tracking** to see who's online
- **Object locking** to prevent conflicts
- **Event broadcasting** for real-time updates
- **Cursor position sharing**

## 🔄 Testing the Integration

### 1. Test Authentication
1. Navigate to `/login`
2. Try email signup and login
3. Test Google OAuth login
4. Verify redirect to dashboard after login

### 2. Test File Management
1. Create a new file from dashboard
2. Edit the file name
3. Navigate to the design editor
4. Verify file loading and saving

### 3. Test Real-time Features
1. Open the same file in two browser tabs
2. Log in as different users (or use incognito)
3. Observe presence indicators
4. Test object editing locks

## 🚧 Next Steps

### Immediate Priorities
1. **Test the integration** locally and on Vercel
2. **Verify Google OAuth** is working correctly
3. **Set up storage bucket** and test file uploads
4. **Test real-time collaboration** with multiple users

### Future Enhancements
1. **File sharing system** with user invitations
2. **Import/export functionality** for 3D models
3. **Version history** for design files
4. **Advanced collaboration** features (comments, annotations)
5. **Integration of the 30GB dataset** (discuss approach)

## 🔍 Troubleshooting

### Common Issues
- **Google OAuth not working**: Check redirect URLs in Google Console
- **Database errors**: Verify RLS policies are applied correctly
- **Real-time not connecting**: Check Supabase Realtime is enabled
- **Environment variables**: Ensure all variables are set in both local and Vercel

### Debug Tools
- Use browser dev tools to check network requests
- Monitor Supabase logs in the dashboard
- Check console for authentication errors

## 🛡️ Security Features
- **Row Level Security (RLS)** on all database tables
- **JWT token validation** for all requests
- **UUID-based IDs** to prevent enumeration attacks
- **Private storage bucket** with user-specific access
- **Environment variable protection** for sensitive keys

## 📊 Performance Considerations
- **Optimistic UI updates** for better user experience
- **Throttled real-time events** to prevent spam
- **Efficient database queries** with proper indexing
- **Client-side caching** of user session and file data
