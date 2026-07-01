// Firebase web config. Paste the values from your Firebase project's
// "Project settings → General → Your apps → Web app" here.
//
// While these are left blank the app runs in LOCAL mode (localStorage only,
// fully offline). Fill them in to enable cloud sync + shared editable links.
//
// These keys are NOT secrets — a Firebase web config is safe to ship in a
// static client. Access is controlled by Firestore security rules and, in this
// app, by the unguessable trip id in the share link.

export const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

// Version of the Firebase modular SDK to load from the CDN (cloud mode only).
export const FIREBASE_SDK_VERSION = "10.12.2";

// True once the config has been filled in with at least a project + app id.
export function isConfigured() {
  return Boolean(FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.appId);
}
