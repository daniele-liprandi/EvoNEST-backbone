import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { uploadFiles } from '@/utils/handlers/fileHandlers';
import { mutate } from 'swr';
import { prepend_path } from '@/lib/utils';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface PhotoUploadProps {
  entryType: 'sample' | 'trait';
  entryId: string;
  className?: string;
}

export default function PhotoUpload({ entryType, entryId, className }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const metadata = { entryType, entryId };

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 2880;
          const MAX_HEIGHT = 1620;
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to file with reduced quality
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Compression failed'));
              }
            },
            'image/jpeg',
            0.7  // 70% quality
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setIsUploading(true);
      setProgress(0);
      
      try {
        // Convert FileList to Array for processing
        const fileArray = Array.from(files);
        const totalFiles = fileArray.length;
        
        // Compress all images
        const compressedFiles: File[] = [];
        for (let i = 0; i < fileArray.length; i++) {
          const compressedFile = await compressImage(fileArray[i]);
          compressedFiles.push(compressedFile);
          setProgress((i + 1) / totalFiles * 100);
        }

        // Create new FileList-like object for upload
        const dataTransfer = new DataTransfer();
        compressedFiles.forEach(file => dataTransfer.items.add(file));
        
        // Upload compressed files
        await uploadFiles(dataTransfer.files, 'photos', metadata);
        
        // Mutate both collections since we don't know which one needs updating
        mutate(`${prepend_path}/api/samples`);
        mutate(`${prepend_path}/api/traits`);
        
        toast.success('Files uploaded successfully');
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload files');
      } finally {
        setIsUploading(false);
        setProgress(0);
        // Reset input so the same file can be selected again
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      }
    }
  };
  
  return (
    <div className="fixed bottom-4 right-4 flex flex-col items-end gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        multiple
      />
      
      {isUploading && (
        <div className="w-32 rounded-lg bg-background p-2 shadow-lg">
          <Progress value={progress} className="h-2" />
          <p className="mt-1 text-xs text-muted-foreground">
            Processing... {Math.round(progress)}%
          </p>
        </div>
      )}
      
      <Button 
        onClick={() => inputRef.current?.click()}
        className={`rounded-full p-3 ${className}`}
        size="icon"
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Camera className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
}