// Test script to verify Replit Object Storage functionality
import fs from 'fs';
import fetch from 'node-fetch';

async function testObjectStorage() {
  try {
    // Create test file
    const testContent = Buffer.from('Test document content for Replit Object Storage verification');
    
    // Test the upload functionality by calling our upload function directly
    const { uploadFileToMinio, generatePresignedUrl, deleteFileFromMinio } = await import('./server/replitOSS.js');
    
    console.log('Testing Replit Object Storage upload...');
    
    // Test upload
    const objectPath = await uploadFileToMinio(testContent, 'test-document.txt', 'text/plain');
    console.log('Upload successful, object path:', objectPath);
    
    // Test presigned URL generation
    const presignedUrl = await generatePresignedUrl(objectPath);
    console.log('Presigned URL generated:', presignedUrl.substring(0, 50) + '...');
    
    // Test file retrieval
    const response = await fetch(presignedUrl);
    if (response.ok) {
      const downloadedContent = await response.text();
      console.log('Download successful, content:', downloadedContent);
    } else {
      console.error('Download failed:', response.statusText);
    }
    
    // Clean up - delete test file
    await deleteFileFromMinio(objectPath);
    console.log('Test file deleted successfully');
    
    console.log('✅ All Replit Object Storage tests passed!');
    
  } catch (error) {
    console.error('❌ Object Storage test failed:', error);
  }
}

testObjectStorage();