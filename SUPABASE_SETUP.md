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

## Step 4: Configure Email Authentication (Optional)

By default, Supabase requires email confirmation for new signups. You can configure this:

1. In your Supabase dashboard, go to "Authentication" > "Settings"
2. Scroll down to "Email Auth"
3. Configure the following options:
   - **Enable email confirmations**: Toggle this based on your preference
     - ON: Users must verify their email before signing in
     - OFF: Users can sign in immediately after signup
   - **Secure email change**: Recommended to keep ON
   - **Secure password change**: Recommended to keep ON

### Email Templates

You can customize the email templates sent to users:

1. Go to "Authentication" > "Email Templates"
2. Customize the templates for:
   - Confirm signup
   - Magic Link
   - Change Email Address
   - Reset Password

## Step 5: Install Dependencies

The Supabase client library has already been installed. If you need to reinstall:

```bash
npm install @supabase/supabase-js
```

## Step 6: Run the Application

```bash
npm run dev
```

The application will start and you should see the authentication screen.

## Testing Authentication

### Sign Up

1. Click the "Sign Up" tab
2. Enter an email and password (minimum 6 characters)
3. Click "Create Account"
4. If email confirmation is enabled:
   - Check your email for a confirmation link
   - Click the link to verify your account
   - Return to the app and sign in
5. If email confirmation is disabled:
   - You'll be signed in automatically

### Sign In

1. Enter your email and password
2. Click "Sign In"
3. You'll be redirected to the main inventory dashboard

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

- Make sure you've confirmed your email if email confirmation is enabled
- Check that you're using the correct email and password
- Try resetting your password using the forgot password feature (if implemented)

## Security Notes

- Never commit your `.env` file to version control (it's already in `.gitignore`)
- The `anon` key is safe to use in client-side code
- Supabase Row Level Security (RLS) should be configured for production use
- Consider implementing password reset functionality for production

## Next Steps

### Recommended Enhancements

1. **Password Reset**: Add forgot password functionality
2. **Row Level Security**: Configure RLS policies in Supabase to secure user data
3. **User Profiles**: Create a user profiles table to store additional user information
4. **Multi-tenant Support**: Link inventory data to specific users
5. **Social Authentication**: Add OAuth providers (Google, GitHub, etc.)

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
