"use client"

import * as React from "react"
import { useMediaQuery } from '@react-hook/media-query'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { ProfileFormTraits } from "./profile-form-traits"
import { ProfileFormSamples } from "./profile-form-samples"
import { ProfileFormUsers } from "./profile-form-users"
import { ProfileFormExperiments } from "./profile-form-experiments"
import { PiPlusBold } from "react-icons/pi"
import { useSession } from "next-auth/react"
import { getUserByProviderId } from "@/hooks/userHooks"

// SmartVaul component updated
interface SmartVaulProps {
  formType: 'traits' | 'samples' | 'users' | 'pisaura' | 'experiments';
  users?: any;
  samples?: any;
  traits?: any;
  id?: string | number;
  size?: any;
  className?: string;
  page?: string;
  experiments?: any;
  customTrigger?: React.ReactNode;
  children?: React.ReactNode;
}

export function SmartVaul({ 
  formType, 
  users, 
  samples, 
  traits, 
  id, 
  size, 
  className, 
  experiments, 
  page,
  customTrigger,
  children,
  ...props 
}: SmartVaulProps) {
  const [open, setOpen] = React.useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const { data: authUser, status } = useSession()

  if (status == 'loading') return <div>Loading user</div>
  const user = getUserByProviderId(authUser?.user?.sub, users)

  let usersForm = users

  const renderForm = () => {
    switch (formType) {
      case 'samples':
        return <ProfileFormSamples users={usersForm} samples={samples} id={id} user={user} page={page} {...props} />
      case 'users':
        return <ProfileFormUsers {...props} />
      case 'traits':
        return <ProfileFormTraits users={usersForm} samples={samples} user={user} {...props} />
      case 'experiments':
        return <ProfileFormExperiments users={usersForm} samples={samples} user={user} experiments={experiments} {...props} />
      default:
        return null
    }
  }

  const defaultTrigger = (
    <Button size={size} className={className}>
      <PiPlusBold /> Add New {formType.charAt(0).toUpperCase() + formType.slice(1)}
    </Button>
  )

  const triggerElement = customTrigger || children || defaultTrigger

  const dialogTitle = () => {
    switch (formType) {
      case 'samples':
        return "New Sample"
      case 'users':
        return "New User"
      case 'traits':
        return "New Trait"
      case 'experiments':
        return "New Experiment"
      default:
        return "New Form"
    }
  }

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {triggerElement}
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] p-8">
          <DialogHeader>
            <DialogTitle>{dialogTitle()}</DialogTitle>
          </DialogHeader>
          {renderForm()}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {triggerElement}
      </DrawerTrigger>
      <DrawerContent className="h-full font-size: 1rem">
        <DrawerHeader className="text-left">
          <DrawerTitle>{dialogTitle()}</DrawerTitle>
        </DrawerHeader>
        {renderForm()}
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}