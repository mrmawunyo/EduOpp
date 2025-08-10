import crypto from "crypto";
import {
  initializeLocalStorage,
  uploadFileToLocalStorage,
  generateLocalDownloadUrl,
  getFileFromLocalStorage,
  deleteFileFromLocalStorage,
} from "./localStorage";

const BUCKET_ID = "replit-objstore-4f70ac13-e167-4adc-8e8d-28ffd43eb48e";
const UPLOAD_FOLDER = "upload";

let storageAvailable = false;
let localStorage = false;

// Extract token from REPLIT_DB_URL
function getReplitToken(): string | null {
  const dbUrl = process.env.REPLIT_DB_URL;
  if (!dbUrl) return null;
  
  try {
    // Extract JWT token from URL path
    const url = new URL(dbUrl);
    const pathParts = url.pathname.split('/');
    const token = pathParts[pathParts.length - 1]; // Last part should be the token
    return token;
  } catch {
    return null;
  }
}

// Initialize Replit Object Storage
export async function initializeReplitStorage() {
  try {
    // Try to get token from REPLIT_TOKEN or extract from DB URL
    const token = process.env.REPLIT_TOKEN || getReplitToken();
    const hasFetch = typeof fetch !== "undefined";
    
    if (token && hasFetch) {
      // Test connectivity with a simple request
      const testResponse = await fetch(
        `https://objstore.replit.com/buckets/${BUCKET_ID}`,
        {
          method: "HEAD",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );
      
      if (testResponse.ok || testResponse.status === 404) {
        storageAvailable = true;
        console.log(
          `Replit Object Storage bucket '${BUCKET_ID}' initialized successfully`,
        );
        return;
      } else {
        throw new Error(`Storage test failed: ${testResponse.status}`);
      }
    } else {
      throw new Error(`Missing requirements - Token: ${!!token}, Fetch: ${hasFetch}`);
    }
  } catch (error) {
    console.error("Object Storage initialization error:", error);
    
    // Fall back to local storage for development
    try {
      localStorage = await initializeLocalStorage();
      if (localStorage) {
        storageAvailable = true;
        console.log("Using local file storage for development");
      } else {
        throw new Error("Local storage initialization failed");
      }
    } catch (localError) {
      console.error("Local storage fallback failed:", localError);
      console.log("Operating in metadata-only mode");
      storageAvailable = false;
      localStorage = false;
    }
  }
}

export function isStorageAvailable(): boolean {
  return storageAvailable;
}

// Generate random hash for folder structure
function generateHashFolder(): string {
  return crypto.randomBytes(16).toString("hex");
}

// Upload file to storage (Object Storage or local fallback)
export async function uploadFileToStorage(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string> {
  if (!storageAvailable) {
    throw new Error("Storage not available");
  }

  try {
    // Use local storage if Object Storage is not available
    if (localStorage) {
      return await uploadFileToLocalStorage(fileBuffer, fileName, mimeType);
    }

    // Use Object Storage
    const hashFolder = generateHashFolder();
    const timestamp = Date.now();
    const objectPath = `${UPLOAD_FOLDER}/${hashFolder}/${timestamp}-${fileName}`;

    const token = process.env.REPLIT_TOKEN || getReplitToken();
    const response = await fetch(
      `https://objstore.replit.com/buckets/${BUCKET_ID}/objects`,
      {
        method: "POST",
        body: fileBuffer,
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Object-Key": objectPath,
          "Authorization": `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return objectPath;
  } catch (error) {
    console.error("Storage upload error:", error);
    throw error;
  }
}

// Generate download URL for file access
export async function generatePresignedUrl(
  objectPath: string,
  expiry: number = 24 * 60 * 60, // 24 hours in seconds
): Promise<string> {
  try {
    // Use local storage if Object Storage is not available
    if (localStorage) {
      return await generateLocalDownloadUrl(objectPath);
    }

    // Use Object Storage
    const expirationTime = Math.floor(Date.now() / 1000) + expiry;
    const token = process.env.REPLIT_TOKEN || getReplitToken();
    const response = await fetch(
      `https://objstore.replit.com/buckets/${BUCKET_ID}/objects/${objectPath}/presigned-url`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          method: "GET",
          expires_in: expiry,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to generate presigned URL: ${response.statusText}`,
      );
    }

    const data = (await response.json()) as { url: string };
    return data.url;
  } catch (error) {
    console.error("Storage presigned URL error:", error);
    throw error;
  }
}

// Delete file from Object Storage
export async function deleteFileFromMinio(objectPath: string): Promise<void> {
  try {
    const response = await fetch(
      `https://objstore.replit.com/buckets/${BUCKET_ID}/objects/${objectPath}`,
      {
        method: "DELETE",
      },
    );

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Object Storage delete error:", error);
    throw error;
  }
}

// Get file stream from Object Storage
export async function getFileFromMinio(objectPath: string): Promise<Response> {
  try {
    const response = await fetch(
      `https://objstore.replit.com/buckets/${BUCKET_ID}/objects/${objectPath}`,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get file: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    console.error("Object Storage get file error:", error);
    throw error;
  }
}

export { BUCKET_ID, UPLOAD_FOLDER };
