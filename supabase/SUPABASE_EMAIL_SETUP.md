# Enabling Email & SMTP in Supabase for TripVerse

Your Supabase Project: **TripVerse**  
Project ID: `tnetveqpyddodlczklxn`  
Dashboard: [https://supabase.com/dashboard/project/tnetveqpyddodlczklxn](https://supabase.com/dashboard/project/tnetveqpyddodlczklxn)

---

## 1. Enable Email Provider & Email Confirmation

1. Navigate to:  
   👉 **[Authentication → Providers → Email](https://supabase.com/dashboard/project/tnetveqpyddodlczklxn/auth/providers)**
2. Turn **ON** **"Enable Email provider"**.
3. Configure **"Confirm email"**:
   - **Turn ON**: Requires users to verify their email (via 6-digit code or confirmation link) before logging in.
   - **Turn OFF** *(Optional for frictionless onboarding)*: Automatically verifies users upon signup so they enter the app immediately without waiting for an email.
4. Click **Save**.

---

## 2. Set Site URL & Redirect URLs

When users click verification links in their email, Supabase redirects them back to TripVerse:

1. Navigate to:  
   👉 **[Authentication → URL Configuration](https://supabase.com/dashboard/project/tnetveqpyddodlczklxn/auth/url-configuration)**
2. Set **Site URL**:
   ```
   https://tripverse-pied.vercel.app
   ```
   *(or `http://localhost:5173` for local development)*
3. Under **Redirect URLs**, add:
   ```
   https://tripverse-pied.vercel.app/**
   http://localhost:5173/**
   http://127.0.0.1:5173/**
   ```
4. Click **Save**.

---

## 3. Enable Custom SMTP (Prevent Rate Limits)

> ⚠️ **IMPORTANT**: Supabase's built-in default mail service is restricted to **3 emails per hour** on free tier projects. Trying to sign up multiple accounts or resend OTPs triggers `over_email_send_rate_limit`.
> 
> To enable unlimited, fast email delivery with high deliverability, enable **Custom SMTP**.

1. Navigate to:  
   👉 **[Project Settings → Authentication → SMTP Settings](https://supabase.com/dashboard/project/tnetveqpyddodlczklxn/settings/auth)**
2. Toggle **"Enable Custom SMTP"** to **ON**.

### Recommended Provider: Resend (Free 100 emails/day / 3,000/mo)
- **Sender email**: `noreply@yourdomain.com` (or verified email on Resend)
- **Sender name**: `TripVerse`
- **Host**: `smtp.resend.com`
- **Port**: `465` (SSL) or `587` (TLS)
- **Username**: `resend`
- **Password**: `re_your_api_key_here`

### Alternative: Gmail SMTP (Free personal account)
- **Sender email**: `your-email@gmail.com`
- **Sender name**: `TripVerse`
- **Host**: `smtp.gmail.com`
- **Port**: `465`
- **Username**: `your-email@gmail.com`
- **Password**: *(16-character Google App Password from myaccount.google.com/apppasswords)*

3. Click **Save Changes**.

---

## 4. Customize Email Template with 6-Digit Code (`{{ .Token }}`)

TripVerse supports both **1-click link confirmation** and **6-digit OTP code entry** in the UI:

1. Navigate to:  
   👉 **[Authentication → Email Templates → Confirm signup](https://supabase.com/dashboard/project/tnetveqpyddodlczklxn/auth/templates)**
2. You can customize the body so users get both the link and code:
   ```html
   <h2>Welcome to TripVerse!</h2>
   <p>Follow this link to verify your email address:</p>
   <p><a href="{{ .ConfirmationURL }}" style="background:#2D5A3D;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold;">Confirm Your Email</a></p>
   <p>Or enter this 6-digit confirmation code in the TripVerse app:</p>
   <h1 style="font-family:monospace;letter-spacing:4px;color:#0B2545;">{{ .Token }}</h1>
   <p>This code expires in 15 minutes.</p>
   ```
3. Click **Save**.
