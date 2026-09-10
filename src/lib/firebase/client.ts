/**
 * Firebase client — lê SOMENTE variáveis públicas do .env.local
 * Nunca hardcodear keys no código.
 */

import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { stripEnvQuotes } from "@/lib/env";

export type FirebaseClientStatus =
  | "ready"
  | "missing_config"
  | "init_error";

function readFirebaseConfig() {
  return {
    apiKey: stripEnvQuotes(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    authDomain: stripEnvQuotes(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: stripEnvQuotes(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: stripEnvQuotes(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: stripEnvQuotes(
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    ),
    appId: stripEnvQuotes(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  };
}

export function isFirebaseConfigured(): boolean {
  const c = readFirebaseConfig();
  return Boolean(
    c.apiKey &&
      c.authDomain &&
      c.projectId &&
      c.storageBucket &&
      c.messagingSenderId &&
      c.appId,
  );
}

export function getFirebaseStatus(): FirebaseClientStatus {
  if (!isFirebaseConfigured()) return "missing_config";
  try {
    getFirebaseApp();
    return "ready";
  } catch {
    return "init_error";
  }
}

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase não configurado. Preencha .env.local a partir de .env.example.",
    );
  }

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(readFirebaseConfig());
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getFirestoreDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

/** Project ID público — seguro para logs de diagnóstico (não é secret). */
export function getPublicProjectId(): string | undefined {
  return stripEnvQuotes(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
}
