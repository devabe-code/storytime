/**
 * EPUB metadata and cover extraction utility
 * Follows the design: container.xml + OPF metadata + manifest href + fallback to first image
 */

export interface EPUBMetadata {
  title: string;
  author: string | null;
  language: string | null;
  identifier: string | null;
  description: string | null;
  publisher: string | null;
  published: string | null;
  modified: string | null;
  coverHref: string | null;
}

export interface EPUBExtractionResult {
  metadata: EPUBMetadata;
  coverBlob: Blob | null;
}

/**
 * Extract metadata and cover from an EPUB file
 */
export async function extractEPUBMetadataAndCover(file: File): Promise<EPUBExtractionResult> {
  try {
    // Create a zip reader for the EPUB
    const zip = await import('jszip');
    const jszip = new zip.default();
    const zipContent = await jszip.loadAsync(file);
    
    // Extract container.xml to find OPF file
    const containerXml = await zipContent.file('META-INF/container.xml')?.async('text');
    if (!containerXml) {
      throw new Error('No container.xml found');
    }
    
    const opfPath = extractOPFPath(containerXml);
    if (!opfPath) {
      throw new Error('No OPF file found in container.xml');
    }
    
    // Extract OPF file for metadata
    const opfContent = await zipContent.file(opfPath)?.async('text');
    if (!opfContent) {
      throw new Error('OPF file not found');
    }
    
    // Parse metadata
    const metadata = parseOPFMetadata(opfContent);
    
    // Try to extract cover
    let coverBlob: Blob | null = null;
    
    if (metadata.coverHref) {
      // Try to get cover from manifest href
      const coverPath = resolveRelativePath(opfPath, metadata.coverHref);
      const coverFile = zipContent.file(coverPath);
      if (coverFile) {
        coverBlob = await coverFile.async('blob');
      }
    }
    
    // Fallback: look for first image file
    if (!coverBlob) {
      const imageFiles = Object.keys(zipContent.files).filter(name => 
        /\.(jpg|jpeg|png|gif|webp)$/i.test(name)
      );
      
      if (imageFiles.length > 0) {
        const firstImage = zipContent.file(imageFiles[0]);
        if (firstImage) {
          coverBlob = await firstImage.async('blob');
        }
      }
    }
    
    return { metadata, coverBlob };
    
  } catch (error) {
    console.error('Failed to extract EPUB metadata:', error);
    // Return basic metadata from filename
    return {
      metadata: {
        title: file.name.replace(/\.epub$/i, ''),
        author: null,
        language: null,
        identifier: null,
        description: null,
        publisher: null,
        published: null,
        modified: null,
        coverHref: null
      },
      coverBlob: null
    };
  }
}

/**
 * Extract OPF file path from container.xml
 */
function extractOPFPath(containerXml: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(containerXml, 'text/xml');
  
  const rootfile = doc.querySelector('rootfile[media-type="application/oebps-package+xml"]');
  return rootfile?.getAttribute('full-path') || null;
}

/**
 * Parse OPF metadata
 */
function parseOPFMetadata(opfContent: string): EPUBMetadata {
  const parser = new DOMParser();
  const doc = parser.parseFromString(opfContent, 'text/xml');
  
  // Extract basic metadata
  const title = doc.querySelector('dc\\:title, title')?.textContent?.trim() || '';
  const author = doc.querySelector('dc\\:creator, creator')?.textContent?.trim() || null;
  const language = doc.querySelector('dc\\:language, language')?.textContent?.trim() || null;
  const identifier = doc.querySelector('dc\\:identifier, identifier')?.textContent?.trim() || null;
  const description = doc.querySelector('dc\\:description, description')?.textContent?.trim() || null;
  const publisher = doc.querySelector('dc\\:publisher, publisher')?.textContent?.trim() || null;
  const published = doc.querySelector('dc\\:date[event="publication"], date[event="publication"]')?.textContent?.trim() || null;
  const modified = doc.querySelector('dc\\:date[event="modification"], date[event="modification"]')?.textContent?.trim() || null;
  
  // Look for cover in manifest
  let coverHref: string | null = null;
  const coverItem = doc.querySelector('item[id*="cover"], item[properties*="cover-image"]');
  if (coverItem) {
    coverHref = coverItem.getAttribute('href');
  }
  
  return {
    title,
    author,
    language,
    identifier,
    description,
    publisher,
    published,
    modified,
    coverHref
  };
}

/**
 * Resolve relative path from OPF file
 */
function resolveRelativePath(opfPath: string, relativePath: string): string {
  const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
  return opfDir + relativePath;
}

/**
 * Generate a placeholder cover with initials
 */
export async function generatePlaceholderCover(title: string, author: string | null): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = 300;
  canvas.height = 400;
  
  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add text
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.font = 'bold 48px system-ui';
  
  // Get initials from title
  const initials = title
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
  
  ctx.fillText(initials, canvas.width / 2, canvas.height / 2);
  
  // Add title below
  ctx.font = '16px system-ui';
  ctx.fillText(title.substring(0, 20), canvas.width / 2, canvas.height / 2 + 40);
  
  // Convert to blob
  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, 'image/png');
  });
}
