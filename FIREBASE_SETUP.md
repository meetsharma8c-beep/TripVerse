# Firebase Google Authentication Setup for TripVerse

TripVerse is now configured with **Firebase Authentication** for fast, reliable Google Sign-In with popup flows that seamlessly work across Web, localhost, and Capacitor mobile environments.

---

## 1. Create / Open Your Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or select your existing project).
3. Name it (e.g. `TripVerse`) and click **Continue**.

---

## 2. Enable Google Sign-In Provider

1. In the Firebase Console left menu, click **Build → Authentication**.
2. Click **Get Started** (if opening for the first time).
3. Under the **Sign-in method** tab, click **Add new provider** → select **Google**.
4. Toggle **Enable**.
5. Set your **Project public-facing name** (e.g. `TripVerse`) and select your **Project support email**.
6. Click **Save**.

---

## 3. Register Web App & Copy Config

1. Go to **Project Settings** (gear icon ⚙️ at top-left) → **General**.
2. Scroll down to **Your apps** and click the Web icon (`</>`).
3. App nickname: `TripVerse Web`.
4. Click **Register app**.
5. You will see a `firebaseConfig` block looking like:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyD-xxxxxxxxxxxxxxxxxxxxx",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     storageBucket: "your-project.firebasestorage.app",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:xxxxxxxxxxxx"
   };
   ```

---

## 4. Add to Your `.env` File

Open your local [`.env`](file:///Users/ms/Downloads/TripVerse/.env) file and paste the values:

```env
# Firebase Authentication (Google Sign-In)
VITE_FIREBASE_API_KEY="AIzaSyD-xxxxxxxxxxxxxxxxxxxxx"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project"
VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="1234567890"
VITE_FIREBASE_APP_ID="1:1234567890:web:xxxxxxxxxxxx"
```

> **Tip:** You can also dynamically store this configuration in your browser's localStorage using `saveFirebaseConfig(...)`.

---

## 5. Authorized Domains

In Firebase Console, go to **Authentication → Settings → Authorized domains**.
Make sure your domains are listed:
* `localhost` *(already added by default)*
* `tripverse-pied.vercel.app` *(add this when deploying to production)*

---

## How It Works in TripVerse

1. When a user clicks **"Continue with Google"**:
   - TripVerse calls `signInWithPopup(auth, googleProvider)` via Firebase Auth.
   - Once verified, the Google profile (UID, email, display name, photo URL) is obtained.
   - The user session is created locally, and the profile is automatically synced to your **Supabase PostgreSQL database** (`tnetveqpyddodlczklxn`).
2. If Firebase credentials are not yet configured in `.env`, TripVerse smoothly falls back to Google Identity Services (GIS) without breaking the app.
