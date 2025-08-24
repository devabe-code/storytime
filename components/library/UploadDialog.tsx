/**
 * Upload dialog component with drag-and-drop support
 */

import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { UploadDialogProps, UploadProgress } from '@/types/library';
import { addBooks } from '@/lib/books-repo';
import { useLibraryStore } from './store';

export default function UploadDialog({ 
  open, 
  onOpenChange, 
  onUploadComplete 
}: UploadDialogProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setUploading } = useLibraryStore();

  const handleFiles = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    const epubFiles = fileArray.filter(file => file.name.toLowerCase().endsWith('.epub'));
    
    if (epubFiles.length === 0) {
      alert('Please select EPUB files only.');
      return;
    }

    setIsProcessing(true);
    setUploading(true);
    
    // Initialize progress tracking
    const progress: UploadProgress[] = epubFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0
    }));
    
    setUploadProgress(progress);

    try {
      // Process files
      for (let i = 0; i < epubFiles.length; i++) {
        const file = epubFiles[i];
        
        try {
          // Update status to processing
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, status: 'processing', progress: 25 } : p
          ));

          // Simulate processing steps
          await new Promise(resolve => setTimeout(resolve, 100));
          
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, status: 'extracting', progress: 50 } : p
          ));

          await new Promise(resolve => setTimeout(resolve, 200));
          
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, status: 'saving', progress: 75 } : p
          ));

          await new Promise(resolve => setTimeout(resolve, 100));
          
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, status: 'complete', progress: 100 } : p
          ));
        } catch (error) {
          // Mark this file as failed
          setUploadProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, status: 'error', progress: 0, error: error instanceof Error ? error.message : 'Unknown error' } : p
          ));
        }
      }

      // Add books to library
      const result = await addBooks(epubFiles);
      
      // Show results
      if (result.errors.length > 0) {
        const errorMessage = `Upload completed with some errors:\n\n${result.errors.join('\n')}\n\n${result.added.length > 0 ? `Successfully uploaded: ${result.added.length} book(s)` : 'No books were uploaded successfully.'}`;
        alert(errorMessage);
      } else {
        alert(`Successfully uploaded ${result.added.length} book(s)`);
      }

      // Refresh library and close dialog
      onUploadComplete();
      onOpenChange(false);
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setUploading(false);
      setUploadProgress([]);
    }
  }, [onUploadComplete, onOpenChange, setUploading]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const getStatusIcon = (status: UploadProgress['status']) => {
    switch (status) {
      case 'pending':
        return <FileText className="w-4 h-4" />;
      case 'processing':
      case 'extracting':
      case 'saving':
        return <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: UploadProgress['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing...';
      case 'extracting':
        return 'Extracting metadata...';
      case 'saving':
        return 'Saving...';
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Books</DialogTitle>
          <DialogDescription>
            Upload EPUB files to your library. Drag and drop files here or click browse.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drag and Drop Area */}
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragOver 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop EPUB files here
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              or
            </p>
            <Button onClick={handleBrowseClick} disabled={isProcessing}>
              Browse Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".epub"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Upload Progress */}
          {uploadProgress.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Upload Progress</h4>
              {uploadProgress.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.status)}
                      <span className="truncate">{item.file.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {getStatusText(item.status)}
                    </span>
                  </div>
                  <Progress value={item.progress} className="h-2" />
                </div>
              ))}
            </div>
          )}

          {/* Error Display */}
          {uploadProgress.some(p => p.status === 'error') && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                Some files failed to upload. Please check the file format and try again.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
