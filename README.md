# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/5b31e410-ebad-4887-9f4f-d8cc8e750e00

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/5b31e410-ebad-4887-9f4f-d8cc8e750e00) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Set up your environment variables (see below).

# Step 5: Start the development server.
npm run dev
```

## Environment Setup

This project uses Supabase for backend services and Firebase for real-time chat. You will need to create a `.env` file in the root of the project and add your credentials.

### Supabase
Your Supabase variables are already integrated.

### Firebase
1.  Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  In your project, click the Web icon (`</>`) to add a new web app.
3.  Firebase will provide you with a `firebaseConfig` object. Copy these values into your `.env` file:

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

4.  **Enable Firestore:** In the Firebase console, go to **Build > Firestore Database** and create a database. Start in **test mode** for now.
5.  **Enable Storage:** Go to **Build > Storage** and enable it.

### Firebase Admin (for Supabase Edge Function)
The chat authentication bridge requires a Firebase Admin service account.

1.  In your Firebase project settings, go to the **Service accounts** tab.
2.  Click **Generate new private key** and save the downloaded JSON file.
3.  Go to your Supabase project dashboard.
4.  Navigate to **Project Settings > Edge Functions**.
5.  Click **Add New Secret**.
6.  Name the secret `FIREBASE_SERVICE_ACCOUNT_KEY`.
7.  Copy the **entire content** of the JSON file you downloaded and paste it as the secret's value.

## What technologies are used for this project?

This project is built with:

- Vite, TypeScript, React
- Supabase (Auth, Database, Storage)
- Firebase (Firestore, Real-time Chat)
- shadcn-ui, Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/5b31e410-ebad-4887-9f4f-d8cc8e750e00) and click on Share -> Publish.