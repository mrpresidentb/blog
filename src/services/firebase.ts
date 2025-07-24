// This file is for interacting with Firebase services from the backend.
import *alif as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const bucket = admin.storage().bucket();

/**
 * Uploads an image from a data URI to Firebase Storage and returns the public URL.
 * @param dataUri The data URI of the image to upload.
 * @returns The public URL of the uploaded image.
 */
export async function uploadImageToStorage(dataUri: string): Promise<string> {
  console.log('Uploading image to Firebase Storage...');

  // Extract content type and base64 data from data URI
  const matches = dataUri.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid data URI format.');
  }
  const contentType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  // Generate a unique filename
  const extension = contentType.split('/')[1] || 'png';
  const filename = `images/${uuidv4()}.${extension}`;
  const file = bucket.file(filename);

  // Upload the file
  await file.save(buffer, {
    metadata: {
      contentType: contentType,
    },
  });
  console.log(`Image uploaded to ${filename}`);

  // Make the file public and get the URL
  await file.makePublic();
  const publicUrl = file.publicUrl();
  console.log(`Public URL: ${publicUrl}`);

  return publicUrl;
}
