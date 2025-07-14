"use client" // Enables client-side rendering in Next.js

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LogbookCard from '@/components/ui/custom/logbook-card';
import PhotoUpload from '@/components/ui/custom/photo-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { getUserNameById } from "@/hooks/userHooks";
import { useSampleData } from '@/hooks/useSampleData';
import { useUserData } from '@/hooks/useUserData';
import { prepend_path } from "@/lib/utils";
import { handleDeleteSample, handleStatusChangeSample, handleStatusIncrementSample } from "@/utils/handlers/sampleHandlers";
import { Scanner } from '@yudiel/react-qr-scanner';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PiArrowLeftBold, PiMagnifyingGlassBold } from 'react-icons/pi';

// Import the modular card system
import { getMainCards, getSidebarCards, getFilteredCards } from '@/components/sample-cards/registry';


export default function IdPage() {
  const sampleId = usePathname().split('/').pop();
  const { samplesData, samplesError } = useSampleData(prepend_path);
  const { usersData, usersError } = useUserData(prepend_path);
  const [notes, setNotes] = useState("");
  const [sample, setSample] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (samplesData) {
      const currentSample = samplesData.find(s => s._id === sampleId);

      if (!currentSample) {
        router.push(`/sample/new/${sampleId}`);
      }

      setSample(currentSample);
      setNotes(currentSample?.notes)
    }
  }, [samplesData, sampleId, router]);

  // Get cards for this sample type
  const mainCards = sample ? getFilteredCards(getMainCards(sample.type), sample) : [];
  const sidebarCards = sample ? getFilteredCards(getSidebarCards(sample.type), sample) : [];

  // Common props for all cards
  const cardProps = {
    sample,
    handleChange,
    setSample,
    samplesData,
    usersData,
    handleStatusIncrementSample,
    onParentChange: handleParentChange,
    sampleId
  };


  async function handleChange(field, value, customLogbookEntry = null) {
    setSample(prev => ({ ...prev, [field]: value }));
    await handleStatusChangeSample(sampleId, field, value, customLogbookEntry, true);
  };

  async function handleNotesChange(newValue, sample) {
    setNotes(newValue); // Update local state
    await handleStatusChangeSample(sample._id, "notes", newValue, false); // Update global state or backend
  }

  async function handleParentChange(newParentId) {
    setSample(prev => ({ ...prev, parentId: newParentId }));
    await handleStatusChangeSample(sampleId, "parentId", newParentId, true);
  }

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      const foundSample = samplesData.find(sample => sample.name.toLowerCase().includes(searchInput.toLowerCase()) || sample._id.includes(searchInput));
      if (foundSample) {
        router.push(`/sample/${foundSample._id}`);
      }
    }
  };

  const handleBarcodeScanned = (results) => {
    if (results && results.length > 0) {
      const qrData = results[0].rawValue;
      const compressedId = qrData.split('?')[0];
      // Check if the scanned data is a valid hex string
      const isHex = /^[0-9a-f]{24}$/i.test(compressedId);
      // If it is a valid hex string, use it as is, otherwise convert it from base64url to hex
      const id = isHex ? compressedId : Buffer.from(
        compressedId
          .replace(/-/g, '+')  // Convert - back to +
          .replace(/_/g, '/'), // Convert _ back to /
        'base64'
      ).toString('hex');
      setSearchInput(id);
      setScanning(false);
      router.push(`/sample/${id}`);
    }
  };

  if (samplesError) {
    return <div>Error loading data</div>;
  }

  if (!sample || !usersData) {
    return <Skeleton className="h-[500px] w-[1000px] rounded-xl" />;
  }


  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Breadcrumb className="hidden md:flex">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/samples">
                    Samples
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/samples/${sample.type}`}>
                    {sample.type}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/sample/${sampleId}`}>
                    {sample?.name}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="relative ml-auto flex-1 md:grow-0">
            {/* Search samples by name */}
            <PiMagnifyingGlassBold className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearch}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScanning(true)}
              className="absolute right-0 top-0 mt-1 mr-1"
            >
              Scan QR
            </Button>
            {scanning && (
              <div className="sm:fixed md:absolute sm:inset-0 md:w-500 md:h-500 bg-white z-50 flex flex-col items-center justify-center">
                <Scanner
                  onScan={handleBarcodeScanned}
                  formats={['code_128', 'qr_code']}
                  components={{ zoom: true }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScanning(false)}
                  className="absolute top-4 right-4"
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </header>
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <PhotoUpload entryType="sample" entryId={sampleId} />
          <div className="mx-auto grid max-w-[59rem] flex-1 auto-rows-max gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                <Link href={`/samples/${sample.type}`}>
                  <PiArrowLeftBold className="h-4 w-4" />
                  <span className="sr-only">Back</span>
                </Link>
              </Button>
              <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                {sample?.name}
              </h1>
              <Badge variant="outline" className="ml-auto sm:ml-0">
                {sample?.type}
              </Badge>
              <Button
                variant="secondary"
                size="sm"
                asChild
                className="ml-auto"
              >
                <Link href={`/sample/${sampleId}/s_trait`}>
                  See sample traits
                </Link>
              </Button>
              <div className="hidden items-center gap-2 md:ml-auto md:flex">
                <AlertDialog>
                  <AlertDialogTrigger><Button variant="outline" size="sm">Delete</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete sample {sample.name}?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => {
                        handleDeleteSample(sample._id)
                        /* go back to previous page */
                        window.history.back()
                      }
                      }>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-[1fr_250px] lg:grid-cols-3 lg:gap-8">
              <div className="grid auto-rows-max items-start gap-4 lg:col-span-2 lg:gap-8">
                <Card x-chunk="dashboard-07-chunk-0">
                  <CardHeader>
                    <CardTitle>{sample?.name}</CardTitle>
                    <CardDescription>
                      <div className='flex flex-col sm:flex-row sm:justify-between'>
                        <div className='sm:w-1/2'>
                          <p>Sampled by {getUserNameById(sample.responsible, usersData)} the {new Date(sample.date).toLocaleDateString([], { year: 'numeric', month: 'numeric', day: 'numeric' })}.</p>
                          <p>Last updated {new Date(sample?.recentChangeDate).toLocaleDateString()}</p>
                          <p>Collected in {sample?.location}</p>
                          <p>Unique ID: {sampleId}</p>
                        </div>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6">
                      <div className="grid gap-3">
                        <Label htmlFor="sampleName">Name</Label>
                        <Input
                          label="Name"
                          value={sample.name}
                          onChange={(e) => handleChange("name", e.target.value)}
                        />
                      </div>
                      <div className="grid gap-3">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)} // Handle change to update local state immediately
                          onBlur={() => handleNotesChange(notes, sample)} // Only call handleChange when the textarea loses focus
                          className='min-h-32'
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Render main cards dynamically */}
                {mainCards.map((CardComponent, index) => (
                  <CardComponent key={`${CardComponent.displayName}-${index}`} {...cardProps} />
                ))}
                
                <LogbookCard logbook={sample.logbook} />
              </div>
              <div className="grid auto-rows-max items-start gap-4 lg:gap-8">
                {/* Render sidebar cards dynamically */}
                {sidebarCards.map((CardComponent, index) => (
                  <CardComponent key={`${CardComponent.displayName}-${index}`} {...cardProps} />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 md:hidden">
              <AlertDialog>
                <AlertDialogTrigger><Button variant="outline" size="sm">Delete</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete sample {sample.name}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => {
                      handleDeleteSample(sample._id)
                      /* go back to previous page */
                      window.history.back()
                    }
                    }>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
