
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import * as admin from 'firebase-admin';
import { config } from 'dotenv';

config();

// Initialize Firebase Admin SDK only if it hasn't been initialized yet.
if (!admin.apps.length) {
  if (process.env.GOOGLE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: `${serviceAccount.project_id}.appspot.com`
    });
  } else {
    // Fallback for environments where GOOGLE_APPLICATION_CREDENTIALS might be set
    // or when running on Google Cloud infrastructure.
    admin.initializeApp();
  }
}


export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-pro',
});

    
