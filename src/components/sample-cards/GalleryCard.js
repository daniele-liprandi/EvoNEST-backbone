import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Trash2Icon, X } from "lucide-react";
import { prepend_path } from "@/lib/utils";
import { useState } from 'react';
import { toast } from "sonner";
import { mutate } from 'swr';

export function GalleryCard({ sample, setSample }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [deletingImage, setDeletingImage] = useState(null);
  const imagesPerPage = 4;

  // Guard clause for required props
  if (!sample) {
    return <Skeleton className="h-[200px] w-full" />;
  }

  // Add function to handle image deletion
  const handleDeleteImage = async (fileId) => {
    try {
      const response = await fetch(`${prepend_path}/api/files/${fileId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete image');

      // Update the sample state to remove the file ID
      if (setSample) {
        setSample(prev => ({
          ...prev,
          filesId: prev.filesId.filter(id => id !== fileId)
        }));
      }

      toast.success('Image deleted successfully');
      mutate(`${prepend_path}/api/samples`);
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  };

  if (!sample.filesId || sample.filesId.length === 0) {
    return null;
  }

  const totalPages = Math.ceil(sample.filesId.length / imagesPerPage);
  const paginatedFiles = sample.filesId.slice(
    currentPage * imagesPerPage,
    (currentPage + 1) * imagesPerPage
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gallery</CardTitle>
        <CardDescription>
          Images associated with this sample
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {paginatedFiles.map((fileId) => (
            <div key={fileId} className="relative group">
              <img
                src={`${prepend_path}/api/files/${fileId}`}
                alt="Sample image"
                className="rounded-lg object-cover aspect-square w-full cursor-pointer"
                onClick={() => setSelectedImage(fileId)}
              />
              <AlertDialog>
                <AlertDialogTrigger>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      setDeletingImage(fileId);
                    }}
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Image</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this image? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setDeletingImage(null)}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        handleDeleteImage(deletingImage);
                        setDeletingImage(null);
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <span className="text-sm">
              {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>

      {/* Full-screen image dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-7xl w-full h-[90vh] p-0">
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="h-full w-full flex items-center justify-center">
            <img
              src={selectedImage ? `${prepend_path}/api/files/${selectedImage}` : ''}
              alt="Full size"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Card metadata for the registry system
GalleryCard.displayName = 'GalleryCard';
GalleryCard.supportedTypes = ['*']; // Universal card
GalleryCard.position = 'sidebar';
GalleryCard.dependencies = ['setSample'];
GalleryCard.shouldRender = (sample) => sample?.filesId && sample.filesId.length > 0;
