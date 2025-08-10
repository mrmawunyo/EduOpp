import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const STORAGE_DIR = path.join(process.cwd(), "uploads");

// Ensure uploads directory exists
async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create storage directory:", error);
  }
}

// Initialize local storage
export async function initializeLocalStorage() {
  try {
    await ensureStorageDir();
    console.log("Local file storage initialized successfully");
    return true;
  } catch (error) {
    console.error("Local storage initialization error:", error);
    return false;
  }
}

// Upload file to local storage
export async function uploadFileToLocalStorage(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string> {
  await ensureStorageDir();
  
  const hashFolder = crypto.randomBytes(8).toString("hex");
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const objectPath = `${hashFolder}/${timestamp}-${sanitizedFileName}`;
  const fullPath = path.join(STORAGE_DIR, objectPath);
  
  // Create subdirectory
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  
  // Write file
  await fs.writeFile(fullPath, fileBuffer);
  
  return objectPath;
}

// Generate download URL for local storage
export async function generateLocalDownloadUrl(objectPath: string): Promise<string> {
  const fullPath = path.join(STORAGE_DIR, objectPath);
  
  try {
    await fs.access(fullPath);
    // Return the object path which will be handled by the download endpoint
    return `/api/documents/local/${encodeURIComponent(objectPath)}`;
  } catch {
    throw new Error("File not found in local storage");
  }
}

// Get file from local storage
export async function getFileFromLocalStorage(objectPath: string): Promise<Buffer> {
  const fullPath = path.join(STORAGE_DIR, objectPath);
  
  try {
    return await fs.readFile(fullPath);
  } catch {
    throw new Error("File not found in local storage");
  }
}

// Delete file from local storage
export async function deleteFileFromLocalStorage(objectPath: string): Promise<void> {
  const fullPath = path.join(STORAGE_DIR, objectPath);
  
  try {
    await fs.unlink(fullPath);
  } catch {
    // File already deleted or doesn't exist
  }
}