
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import * as admin from 'firebase-admin';
import { config } from 'dotenv';

config();

// Initialize Firebase Admin SDK only if it hasn't been initialized yet.
if (!admin.apps.length) {
  if (process.env.GOOGLE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: `${serviceAccount.project_id}.appspot.com`
      });
       console.log("Firebase Admin SDK initialized successfully.");
    } catch (error) {
       console.error("Error parsing GOOGLE_SERVICE_ACCOUNT or initializing Firebase Admin SDK:", error);
    }
  } else {
    // Fallback for environments where GOOGLE_APPLICATION_CREDENTIALS might be set
    // or when running on Google Cloud infrastructure.
     console.log("Initializing Firebase Admin SDK with default credentials.");
    admin.initializeApp();
  }
}


export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-pro',
});

    
