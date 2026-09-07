import { Skeleton } from '@/components/ui/skeleton';
import { AttachmentPanel } from '@/components/attachments/AttachmentPanel';

// Universal sidebar card: every sample gets an attachments gallery + upload.
// Replaces GalleryCard, which read the retired `sample.filesId` array directly.
export function AttachmentsCard({ sample, sampleId }) {
  const id = sampleId || sample?._id;
  if (!id) {
    return <Skeleton className="h-[200px] w-full" />;
  }
  return (
    <AttachmentPanel
      targetType="sample"
      targetId={id}
      description="Images and files linked to this sample"
    />
  );
}

AttachmentsCard.displayName = 'AttachmentsCard';
AttachmentsCard.supportedTypes = ['*'];
AttachmentsCard.position = 'sidebar';
