# Supabase Authentication Setup Guide

This guide will help you set up Supabase authentication for the MyInventory application.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Node.js and npm installed

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in the project details:
   - Project name: MyInventory (or any name you prefer)
   - Database password: Choose a strong password
   - Region: Select the closest region to your users
4. Click "Create new project" and wait for the project to be provisioned

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, click on the "Settings" icon (gear) in the left sidebar
2. Click on "API" under Project Settings
3. You'll need two values:
   - **Project URL**: Found under "Project URL"
   - **anon/public key**: Found under "Project API keys" (the `anon` `public` key)

## Step 3: Configure Environment Variables

1. In the root of your MyInventory project, create a `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Open the `.env` file and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_project_url_here
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```

   Replace `your_project_url_here` and `your_anon_key_here` with the actual values from Step 2.

## Step 4: Configure Email Authentication

Since users are created by administrators, you should configure email settings:

1. In your Supabase dashboard, go to "Authentication" > "Settings"
2. Scroll down to "Email Auth"
3. Configure the following options:
   - **Enable email confirmations**: Recommended OFF for admin-created users
     - OFF: Users created by admins can sign in immediately
     - ON: Users must verify their email before signing in (use if sending invite emails)
   - **Secure email change**: Recommended to keep ON
   - **Secure password change**: Recommended to keep ON
4. Under "Auth Providers", disable "Enable email signup" to prevent self-registration

### Email Templates

You can customize the email templates sent to users:

1. Go to "Authentication" > "Email Templates"
2. Customize the templates for:
   - Confirm signup
   - Magic Link
   - Change Email Address
   - Reset Password

## Step 5: Configure Google OAuth (Optional)

To enable Google sign-in, you'll need to set up OAuth credentials with Google and configure them in Supabase.

### 5.1: Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in the required fields (App name, User support email, Developer contact)
   - Add scopes: `email` and `profile`
   - Add test users if needed (for development)
6. For "Application type", select "Web application"
7. Add authorized redirect URIs (you need to add the Supabase callback URL, NOT your app URL):
   - **Required**: `https://<your-project-ref>.supabase.co/auth/v1/callback`
     - Find your project reference in Supabase under Settings > API
     - Example: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`
   - **Important**: Do NOT add `http://localhost:5173` or `http://localhost:3000` to Google OAuth
     - Supabase handles the OAuth flow and redirects back to your app
     - Your app URL is configured in Supabase, not Google
8. Click "Create" and save your **Client ID** and **Client Secret**

### 5.2: Configure Google OAuth in Supabase

1. In your Supabase dashboard, go to "Authentication" > "Providers"
2. Find "Google" in the list of providers
3. Enable the Google provider
4. Enter your Google OAuth credentials:
   - **Client ID**: Paste the Client ID from Google
   - **Client Secret**: Paste the Client Secret from Google
5. Click "Save"

### 5.3: Configure Supabase Redirect URLs

After enabling Google OAuth in Supabase, you need to configure where users are redirected after authentication:

1. In Supabase dashboard, go to "Authentication" > "URL Configuration"
2. Set the **Site URL**:
   - For local development: `http://localhost:5173` (Vite's default port)
   - For production: Your production domain (e.g., `https://myapp.com`)
3. Add **Redirect URLs** (comma-separated list):
   - For local development: `http://localhost:5173/**`
   - For production: `https://myapp.com/**`
   - Example: `http://localhost:5173/**, https://myapp.com/**`

### 5.4: Additional Configuration (Production)

For production deployment:
- Update your Google OAuth consent screen to "Production" status
- Ensure your production domain is in Supabase Site URL
- The Google OAuth redirect URI remains the Supabase callback URL (never changes)

## Step 6: Install Dependencies

The Supabase client library has already been installed. If you need to reinstall:

```bash
npm install @supabase/supabase-js
```

## Step 7: Create Database Tables

The application stores all inventory data in Supabase tables. You must create these tables before using the app:

1. See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for the complete SQL schema
2. Go to your Supabase Dashboard → SQL Editor
3. Create a new query
4. Copy and paste the entire SQL schema from DATABASE_SCHEMA.md
5. Click "Run" to execute the schema

This will create:
- `categories` table - Product categories
- `locations` table - Storage locations
- `products` table - Inventory products
- `history` table - Transaction history

All tables include Row Level Security (RLS) policies to ensure each user can only access their own data.

## Step 8: Run the Application

```bash
npm run dev
```

The application will start and you should see the authentication screen.

## User Management

**Important**: This application does not allow self-registration. Users must be created by administrators in the Supabase dashboard.

### Creating Users (Administrators Only)

1. In your Supabase dashboard, go to "Authentication" > "Users"
2. Click "Add user" or "Invite user"
3. Choose one of the following methods:
   - **Create user**: Enter email and password, user can sign in immediately
   - **Invite user**: Send an email invitation with a setup link
4. The user will now be able to sign in to the application

### Sign In with Email

1. On the sign-in page, enter your email and password
   - Your administrator must have created your account first
2. Click "Sign In"
3. You'll be redirected to the main inventory dashboard

### Sign In with Google

1. Click the "Continue with Google" button
2. You'll be redirected to Google's sign-in page
3. Select your Google account or sign in
4. Grant the requested permissions
5. You'll be redirected back to the app and automatically signed in
   - Note: Your Google account must be added as a user in Supabase by an administrator first

### Sign Out

1. Click the "Sign Out" button in the header
2. You'll be redirected to the authentication screen

## Troubleshooting

### "Missing Supabase environment variables" Error

- Make sure you've created the `.env` file in the root directory
- Ensure the variable names are exactly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart your development server after adding the `.env` file

### Email Not Sending

1. Check your Supabase project's email settings in the dashboard
2. For development, you can disable email confirmation (see Step 4)
3. For production, configure a custom SMTP server in Supabase settings

### "Invalid login credentials" Error

- Verify that your administrator has created your user account in Supabase
- Make sure you've confirmed your email if email confirmation is enabled
- Check that you're using the correct email and password
- Contact your administrator if you continue to have issues

### Google Sign-In Not Working

1. Verify that Google OAuth is enabled in Supabase Authentication > Providers
2. Check that your Google Client ID and Secret are correct
3. Ensure your redirect URI in Google Cloud Console matches your Supabase callback URL:
   - Should be: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - Should NOT be: `http://localhost:5173` or your app URL
4. Check Supabase URL Configuration (Authentication > URL Configuration):
   - Site URL should match where your app is running (e.g., `http://localhost:5173`)
   - Redirect URLs should include your app URL pattern (e.g., `http://localhost:5173/**`)
5. Make sure your Google OAuth consent screen is configured properly
6. Clear your browser cache and cookies, then try again

### Redirecting to Wrong Port (localhost:3000 instead of localhost:5173)

This happens when Supabase Site URL is misconfigured:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Update **Site URL** to: `http://localhost:5173`
3. Update **Redirect URLs** to: `http://localhost:5173/**`
4. The app runs on port 5173 by default (Vite), not 3000

## Security Notes

- Never commit your `.env` file to version control (it's already in `.gitignore`)
- The `anon` key is safe to use in client-side code
- Supabase Row Level Security (RLS) should be configured for production use
- Consider implementing password reset functionality for production

## Next Steps

### Recommended Enhancements

1. **User Management UI**: Add an admin interface for managing users within the app
2. **Password Reset**: Add forgot password functionality for users
3. **Row Level Security**: Configure RLS policies in Supabase to secure user data
4. **User Profiles**: Create a user profiles table to store additional user information (roles, permissions, etc.)
5. **Multi-tenant Support**: Link inventory data to specific users
6. **Additional OAuth Providers**: Add more OAuth providers (GitHub, Facebook, Azure, etc.)
   - Google OAuth is already implemented! See Step 5 for setup instructions.

### Row Level Security (RLS) Example

To make the inventory data user-specific, you'll need to:

1. Add a `user_id` column to your products, categories, locations, and history tables in Supabase
2. Enable RLS on these tables
3. Create policies that only allow users to access their own data

Example RLS policy for products table:
```sql
-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to see only their products
CREATE POLICY "Users can view their own products"
  ON products FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for authenticated users to insert their own products
CREATE POLICY "Users can insert their own products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

## Support

For issues related to:
- **Supabase**: Check the [Supabase Documentation](https://supabase.com/docs)
- **MyInventory App**: Open an issue in the project repository
