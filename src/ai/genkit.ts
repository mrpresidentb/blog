
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import * as admin from 'firebase-admin';
import { config } from 'dotenv';

// Load environment variables from the root .env file
config({ path: '.env' });
// Load environment variables from the src/.env file, which will overwrite any existing ones.
config({ path: 'src/.env', override: true });


// Initialize Firebase Admin SDK only if it hasn't been initialized yet.
// This setup allows the application to be portable. To run on a different server,
// you must provide the necessary credentials via environment variables.
if (!admin.apps.length) {
  // The recommended approach is to set the GOOGLE_SERVICE_ACCOUNT environment variable.
  // This variable should contain the JSON content of the service account key file
  // obtained from the Firebase or Google Cloud console.
  if (process.env.GOOGLE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // The storageBucket is required for Firebase Storage operations.
        // It's typically in the format `<project-id>.appspot.com`.
        storageBucket: `${serviceAccount.project_id}.appspot.com`
      });
       console.log("Firebase Admin SDK initialized successfully using GOOGLE_SERVICE_ACCOUNT env var.");
    } catch (error) {
       console.error("Error parsing GOOGLE_SERVICE_ACCOUNT or initializing Firebase Admin SDK:", error);
    }
  } else {
    // As a fallback, the SDK can use default credentials.
    // This works automatically in Google Cloud environments (like Cloud Run, App Engine)
    // or if the GOOGLE_APPLICATION_CREDENTIALS environment variable points to the path of the key file.
     console.log("Initializing Firebase Admin SDK with default credentials. This is expected in a Google Cloud environment.");
    admin.initializeApp();
  }
}


export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-pro',
});
