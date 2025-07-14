"use client"

import { FilesMarquee } from "@/components/ui/custom/file-card"
import { ProfileFormExperiments } from "@/components/forms/profile-form-experiments"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useExperimentsData } from "@/hooks/useExperimentData"
import { useSampleData } from "@/hooks/useSampleData"
import { useUserData } from "@/hooks/useUserData"
import { useSession } from "next-auth/react"
import { prepend_path } from "@/lib/utils"
import { ExclamationTriangleIcon } from "@radix-ui/react-icons"
import Link from "next/link"
import { useState } from "react"
import { getUserByProviderId } from "@/hooks/userHooks"
import { SmartVaul } from "@/components/forms/smart-vaul"

export default function ExperimentGeneralPage() {
  const [droppedFile, setDroppedFile] = useState<FileList | null>(null)
  const { samplesData, samplesError } = useSampleData(prepend_path);
  const { experimentsData, experimentsError } = useExperimentsData(prepend_path);
  const { usersData, usersError } = useUserData(prepend_path);
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isFileHeavy, setIsFileHeavy] = useState(false)
  const { data: session } = useSession()


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {

      setDroppedFile(e.target.files)
      // If the file is larger than 10 MB, show an Alert Dialog
      if (e.target.files[0].size > 10 * 1024 * 1024) {
        setIsFileHeavy(true)
        return
      } else {
        setIsFileHeavy(false)
      }
      setIsDialogOpen(true)
    }
  }

  if (!samplesData || !usersData || !experimentsData) {
    return (<p className="text-lg text-center">Loading...</p>);
  }
  if (samplesError || usersError || experimentsError) {
    return (<p className="text-lg text-center">An error occurred while fetching the data.</p>);
  }

  const user = getUserByProviderId(session?.user?.sub, usersData)


  return (
    <section className="w-full py-12 md:py-24 lg:py-32">
      <div className="container grid gap-6 md:gap-8 px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
          <div className="grid gap-1">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Experiments</h1>
            <p className="text-gray-500 dark:text-gray-400 max-w-[600px]">
              All the experiments in your NEST.
            </p>
          </div>
        </div>

        <SmartVaul
          formType='experiments'
          users={usersData}
          samples={samplesData}
          experiments={experimentsData}
        >
          <Label
            htmlFor="dropzone-file"
            className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
              </svg>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold">Click to upload</span>
              </p>
            </div>
          </Label>
        </SmartVaul>

        {isFileHeavy && (
          <Alert>
            <ExclamationTriangleIcon className="h4-w4" />
            <AlertTitle>Heavy file!</AlertTitle>
            <AlertDescription>
              {/* Put the button below the text */}
              <div className="flex items-center gap-2">
                Our current NEST has a limited hard disk space. We will let you insert a custom destination for the file, store it safely!
                <Button
                  variant="secondary"
                  onClick={() => { setIsDialogOpen(true); setIsFileHeavy(false) }}
                >
                  Load the file
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="w-auto">
          <FilesMarquee />
        </div>


        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          <Link href="/experiments/general">
            <Card className="p-6 lg:p-8 rounded-xl shadow-lg dark:shadow-orange-500/50">
              <CardHeader>
                <CardTitle>General</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center gap-2 ">
                  <span>
                    Visit the general table containing all the experiments in the NEST.
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/experiments/media">
            <Card className="p-6 lg:p-8 rounded-xl shadow-lg dark:shadow-orange-500/50">
              <CardHeader>
                <CardTitle>Media</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center gap-2">
                  <span>
                    Navigate through the media in the NEST.
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/experiments/document">
            <Card className="p-6 lg:p-8 rounded-xl shadow-lg dark:shadow-orange-500/50">
              <CardHeader>
                <CardTitle>Documents</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center gap-2">
                  <span>
                    Navigate through the pdfs and docs in the NEST.
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </section>
  )
}
