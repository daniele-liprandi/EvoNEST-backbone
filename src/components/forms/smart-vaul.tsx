"use client";

import * as React from "react";
import { Plus } from "@phosphor-icons/react";
import { useSession } from "next-auth/react";

import { useIsMobile } from "@/hooks/use-mobile";
import { getUserByProviderId } from "@/hooks/userHooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { TraitForm } from "./trait-form";
import { SampleForm } from "./sample-form";
import { UserForm } from "./user-form";
import { ExperimentForm } from "./experiment-form";

type FormType = "traits" | "samples" | "users" | "experiments";

interface SmartVaulProps {
  formType: FormType;
  users?: unknown;
  samples?: unknown;
  traits?: unknown;
  experiments?: unknown;
  id?: string | number;
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  page?: string;
  customTrigger?: React.ReactNode;
  children?: React.ReactNode;
}

const TITLES: Record<FormType, string> = {
  samples: "New sample",
  users: "New user",
  traits: "New trait",
  experiments: "New experiment",
};

export function SmartVaul({
  formType,
  users,
  samples,
  traits,
  experiments,
  id,
  size,
  className,
  page,
  customTrigger,
  children,
}: SmartVaulProps) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();
  const { data: authUser, status } = useSession();

  const user =
    status === "authenticated" ? getUserByProviderId(authUser?.user?.sub, users) : undefined;

  const title = TITLES[formType];
  const description = `Fill in the details for the ${title.replace("New ", "")}.`;

  const trigger = customTrigger ||
    children || (
      <Button size={size} className={className}>
        <Plus /> Add {title.replace("New ", "")}
      </Button>
    );

  const body =
    status !== "authenticated" ? (
      <div className="space-y-3 p-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-9 w-full" />
      </div>
    ) : formType === "traits" ? (
      <TraitForm users={users} samples={samples} user={user} />
    ) : formType === "samples" ? (
      <SampleForm users={users} samples={samples} id={id} user={user} page={page} />
    ) : formType === "experiments" ? (
      <ExperimentForm
        users={users}
        samples={samples}
        user={user}
        experiments={experiments}
      />
    ) : (
      <UserForm />
    );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4">{body}</div>
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      {/* Anchored near the top, not vertically centred: the form's tabs have
          different heights, and a centred dialog re-centres on every switch,
          moving the tab bar out from under the pointer. */}
      <DialogContent className="top-[7vh] translate-y-0 max-h-[86vh] overflow-y-auto sm:max-w-2xl data-[state=open]:slide-in-from-top-4 data-[state=closed]:slide-out-to-top-4">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
