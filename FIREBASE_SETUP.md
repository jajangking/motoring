# Setup Firebase untuk Motoring App

## 1. Buat Project Firebase

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Klik "Add Project" atau pilih project yang sudah ada
3. Ikuti langkah-langkah setup

## 2. Aktifkan Authentication

1. Di Firebase Console, pilih project loe
2. Klik "Authentication" di sidebar kiri
3. Klik "Get Started"
4. Pilih "Email/Password" dan aktifkan
5. Klik "Save"

## 3. Setup Firestore Database

1. Di Firebase Console, pilih project loe
2. Klik "Firestore Database" di sidebar kiri
3. Klik "Create Database"
4. Pilih "Start in test mode" atau atur rules kalo udah production
5. Klik "Enable"

## 4. Buat Web App Configuration

1. Di Firebase Console, pilih project loe
2. Klik ikon </> di bagian "Get started by adding Firebase to your app"
3. Cari nama app dan klik "Register app"
4. Catat semua konfigurasi yang ditampilkan

## 5. Update Environment Variables

Ganti semua placeholder di `.env.local` dengan nilai sebenernya dari Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_actual_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_number
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 6. Jalankan Aplikasi

```bash
npm run dev
```

## 7. Test Fitur

- Registrasi user baru lewat `/register`
- Login lewat `/login` 
- Logout dari dashboard atau profile

## Catatan Penting

- Pastiin rules Firestore di update kalo udah production
- Jangan commit file `.env.local` ke git
- Ganti test mode di Firestore jadi production rules nanti