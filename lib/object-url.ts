/**
 * Object URL management utilities for Storytime Library
 * Handles creation and cleanup of object URLs to prevent memory leaks
 */

const activeUrls = new Map<string, string>();

/**
 * Create an object URL for a blob and track it for cleanup
 */
export function createObjectURL(blob: Blob, key: string): string {
  // If URL already exists, return it (don't recreate)
  if (activeUrls.has(key)) {
    return activeUrls.get(key)!;
  }
  
  const url = URL.createObjectURL(blob);
  activeUrls.set(key, url);
  console.log(`Created and stored URL for key ${key}:`, url);
  console.log(`Active URLs count:`, activeUrls.size);
  return url;
}

/**
 * Revoke an object URL by key
 */
export function revokeObjectURL(key: string): void {
  if (activeUrls.has(key)) {
    URL.revokeObjectURL(activeUrls.get(key)!);
    activeUrls.delete(key);
  }
}

/**
 * Revoke all active object URLs
 */
export function revokeAllObjectURLs(): void {
  activeUrls.forEach(url => URL.revokeObjectURL(url));
  activeUrls.clear();
}

/**
 * Get the current object URL for a key
 */
export function getObjectURL(key: string): string | undefined {
  return activeUrls.get(key);
}

/**
 * Ensure an object URL exists for a key, creating it if necessary
 */
export function ensureObjectURL(blob: Blob, key: string): string {
  if (activeUrls.has(key)) {
    console.log(`Reusing existing URL for key: ${key}`);
    return activeUrls.get(key)!;
  }
  console.log(`Creating new URL for key: ${key}`);
  return createObjectURL(blob, key);
}

/**
 * Check if an object URL exists for a key
 */
export function hasObjectURL(key: string): boolean {
  return activeUrls.has(key);
}

/**
 * Get all active object URL keys
 */
export function getActiveObjectURLKeys(): string[] {
  return Array.from(activeUrls.keys());
}

/**
 * Debug function to log all active URLs
 */
export function debugActiveURLs(): void {
  console.log('=== Active Object URLs ===');
  activeUrls.forEach((url, key) => {
    console.log(`Key: ${key} -> URL: ${url}`);
  });
  console.log(`Total active URLs: ${activeUrls.size}`);
  console.log('========================');
}

/**
 * Cleanup function for component unmount
 */
export function cleanupObjectURLs(keys: string[]): void {
  keys.forEach(key => revokeObjectURL(key));
}
