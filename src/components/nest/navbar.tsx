"use client";

import * as React from "react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { mutate } from "swr";
import {
  BugBeetle,
  Bell,
  Database,
  Ruler,
  User,
  UserCircle,
  Wrench,
  MathOperations,
  List,
} from "@phosphor-icons/react";
import { cn, prepend_path } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { ThemeMenu } from "../ui/custom/theme-menu";
import { EvoNestLogo } from "../ui/custom/evonest-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Scanner } from "@yudiel/react-qr-scanner";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DeveloperNewsCard, useDeveloperNotifications } from "@/components/developer-cards/developer-news";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfigTypes } from "@/hooks/useConfigTypes";

const usersProps = {
  label: "Users",
  icon: <User size={60} />, // Replace with the actual icon component
  description: "All the users in the NEST",
  options: [],
  href: "/users",
};

const experimentsProps = {
  label: "Experiments",
  icon: <MathOperations size={60} />,
  description: "All the experiments collected in the NEST",
  options: [
    {
      title: "Media",
      href: "/experiments/media",
      description: "Image- and video-based experiments",
    },
  ],
  href: "/experiments",
};

const traitsProps = {
  label: "Traits",
  icon: <Ruler size={60} />,
  description: "Traits in the NEST",
  options: [
    {
      title: "Analysis",
      href: "/traits/analysis",
      description: "Trait analysis and statistics",
    },
  ],
  href: "/traits",
};

const settingsProps = {
  label: "Settings",
  icon: <Wrench size={60} />,
  description: "Settings for the NEST",
  options: [
    {
      title: "Main",
      href: "/settings/main",
      description: "Main settings for the NEST",
    },
    {
      title: "Types",
      href: "/settings/types",
      description: "Description of types in the NEST",
    },
  ],
  href: "/settings",
};

// Types for the component props
interface NavStandardItemProps {
  label: string;
  icon: React.ReactNode;
  description: string;
  options: { title: string; href: string; description: string }[];
  href: string;
}

// SampleMenuItem component
const NavStandardItem: React.FC<NavStandardItemProps> = ({
  label,
  icon,
  description,
  options,
  href,
}) => {
  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger>{label}</NavigationMenuTrigger>
      <NavigationMenuContent className="z-40">
        <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
          <li className="row-span-3">
            <NavigationMenuLink asChild>
              <Link
                className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md transition-colors hover:bg-accent hover:text-accent-foreground"
                href={href}
              >
                {icon}
                <div className="mb-2 mt-4 text-lg font-medium">{label}</div>
                <p className="text-sm leading-tight text-muted-foreground">
                  {description}
                </p>
              </Link>
            </NavigationMenuLink>
          </li>
          {options.map((component) => (
            <ListItem
              key={component.title}
              title={component.title}
              href={prepend_path + component.href}
            >
              {component.description}
            </ListItem>
          ))}
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
};

export function NavBar() {
  const { data: session, status } = useSession();
  const [searchInput, setSearchInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const router = useRouter();
  const [userDatabases, setUserDatabases] = useState<string[]>([]);
  const [activeDatabase, setActiveDatabase] = useState<string>("");
  // Switching database now navigates with router.push instead of a full page
  // reload (see handleDatabaseChange), so the mobile sheet no longer gets
  // torn down for free by the reload — close it explicitly instead.
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Owned here (not inside DeveloperNewsCard) so the bell's badge and the
  // popover's list agree on the same fetch and the same dismissals.
  const { notifications: devNotifications, dismiss: dismissDevNotification, unreadCount: devUnreadCount } =
    useDeveloperNotifications();

  // Get configuration types from database or defaults
  const { sampletypes } = useConfigTypes();

  const samplesProps = {
    label: "Samples",
    icon: <BugBeetle size={60} />, // Replace with the actual icon component
    description: "All the samples collected in the NEST",
    options: [
      ...sampletypes.map((sampletype) => ({
        title: sampletype.label,
        href: `/samples/${sampletype.value}`,
        description: sampletype.description || "",
      })),
      {
        title: "Maintenance",
        href: "/samples/maintenance",
        description: "Keep your animals tidy",
      },
      { title: "Analysis", href: "/samples/analysis", description: "Analysis" },
      {
        title: "QR labels",
        href: "/samples/qrlabels",
        description: "QR labels",
      },
    ],
    href: "/samples",
  };

  useEffect(() => {
    async function fetchDatabases() {
      if (session?.user) {
        // Changed from user to session?.user
        try {
          const response = await fetch("/api/user/database");
          if (!response.ok) throw new Error("Failed to fetch databases");
          const data = await response.json();
          setUserDatabases(data.databases);
          setActiveDatabase(data.activeDatabase);
        } catch (error) {
          console.error("Error fetching databases:", error);
          toast.error("Failed to load databases");
        }
      }
    }
    fetchDatabases();
  }, [session?.user]); // Changed dependency from user to session?.user

  const handleDatabaseChange = async (value: string) => {
    try {
      const response = await fetch("/api/user/database", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ database: value }),
      });

      if (!response.ok) throw new Error("Failed to update database");

      const data = await response.json();
      setActiveDatabase(data.activeDatabase);
      toast.success("Database changed successfully");

      // Every cached SWR response (samples, users, traits...) belongs to the
      // database we just left. Revalidate it all in the background — not
      // awaited, so this doesn't stall the navigation below on every
      // in-flight request across the app — so mounted components (this
      // navbar included, since it doesn't unmount on navigation) pick up
      // the new database instead of keeping the previous one's data.
      mutate(() => true, undefined, { revalidate: true });
      setMobileMenuOpen(false);
      router.push("/home");
    } catch (error) {
      console.error("Error changing database:", error);
      toast.error("Failed to change database");
    }
  };

  const handleSearch = (e: { key: string }) => {
    if (e.key === "Enter") {
      router.push(`/sample/${searchInput}`);
    }
  };

  const handleBarcodeScanned = (results: any[]) => {
    if (results && results.length > 0) {
      const qrData = results[0].rawValue;

      const compressedId = qrData.split("?")[0];
      // Check if the scanned data is a valid hex string
      const isHex = /^[0-9a-f]{24}$/i.test(compressedId);
      // If it is a valid hex string, use it as is, otherwise convert it from base64url to hex
      const id = isHex
        ? compressedId
        : Buffer.from(
            compressedId
              .replace(/-/g, "+") // Convert - back to +
              .replace(/_/g, "/"), // Convert _ back to /
            "base64"
          ).toString("hex");
      setSearchInput(id);
      setScanning(false);
      router.push(`/sample/${id}`);
    }
  };

  if (status === "loading") return <div></div>;

  return (
    <header className="">
      {/* -------------------------------------------------------------------------------------- */}
      {/*                                  PC and large screens                                  */}
      {/* -------------------------------------------------------------------------------------- */}
      <NavigationMenu className="hidden md:block z-50" orientation="vertical">
        <NavigationMenuList>
          <Button
            asChild
            variant="ghost"
            className="h-5 w-5 justify-end rounded-md bg-gradient-to-b p-6 no-underline outline-none focus:shadow-md transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Link href="/home" className="shrink-0">
              <EvoNestLogo
                size="sm"
                className="absolute left-3 top-3"
                outline={true}
              />
              <span className="sr-only">Home button</span>
            </Link>
          </Button>
          <NavStandardItem {...usersProps} />
          <NavStandardItem {...samplesProps} />
          <NavStandardItem {...experimentsProps} />
          <NavStandardItem {...traitsProps} />
          <NavStandardItem {...settingsProps} />
          {/*link to utils*/}

          <NavigationMenuItem>
            <NavigationMenuTrigger>Documentation</NavigationMenuTrigger>
            <NavigationMenuContent className="z-40">
              <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-1">
                <ListItem
                  title="Documentation"
                  href="https://daniele-liprandi.github.io/EvoNEST-backbone/"
                  className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  EvoNEST Documentation
                </ListItem>
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
      {/* -------------------------------------------------------------------------------------- */}
      {/*                                  Mobiles and Vertical                                  */}
      {/* -------------------------------------------------------------------------------------- */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <List className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="/home"
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <EvoNestLogo size="sm" />
              <span className="sr-only">EvoNEST</span>
            </Link>
            {/* Select the database */}
            <Select value={activeDatabase} onValueChange={handleDatabaseChange}>
              <SelectTrigger className="flex w-[150px] md:hidden ">
                <SelectValue placeholder="Select database" />
              </SelectTrigger>
              <SelectContent>
                {userDatabases.map((db) => (
                  <SelectItem key={db} value={db}>
                    {db}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Same sections as the desktop menu (samplesProps included, so a
                lab's custom sample types and Settings show up here too),
                just laid out as a flat list instead of dropdowns. */}
            {[usersProps, samplesProps, experimentsProps, traitsProps, settingsProps].map((section) => (
              <div key={section.label} className="grid gap-2">
                <Link
                  href={section.href}
                  className="text-foreground hover:text-primary"
                >
                  {section.label}
                </Link>
                {section.options.length > 0 && (
                  <div className="grid gap-2 pl-3 text-base">
                    {section.options.map((option) => (
                      <Link
                        key={option.href}
                        href={prepend_path + option.href}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {option.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Link
              href="https://daniele-liprandi.github.io/EvoNEST-backbone/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              Documentation
            </Link>
            <Link
              href="/api-docs"
              className="text-muted-foreground hover:text-foreground"
            >
              API Docs
            </Link>
          </nav>
        </SheetContent>
      </Sheet>
      {/* Top right section */}
      <div className="absolute top-0 right-0 h-10 flex items-center gap-2 px-4">
        {!scanning && (
          <Button variant="outline" size="sm" onClick={() => setScanning(true)}>
            Scan QR
          </Button>
        )}
        {scanning && (
          <>
            {/* QR Scanner - full screen on sm/md, corner on lg+ */}
            <div className="fixed inset-0 z-40 bg-black bg-opacity-80 lg:inset-auto lg:top-16 lg:right-4 lg:w-80 lg:h-60 lg:bg-transparent">
              <div className="w-full h-full lg:bg-black lg:bg-opacity-50 lg:rounded-lg lg:overflow-hidden">
                <Scanner
                  onScan={handleBarcodeScanned}
                  formats={["code_128", "qr_code"]}
                  components={{ zoom: true, finder: false }}
                />
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setScanning(false)}
              className="fixed top-4 right-4 z-50 lg:absolute lg:top-2 lg:right-2"
            >
              Close
            </Button>
          </>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell className="h-5 w-5" />
              {devUnreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium leading-none text-primary-foreground">
                  {devUnreadCount > 9 ? "9+" : devUnreadCount}
                </span>
              )}
              <span className="sr-only">Developer news</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <DeveloperNewsCard notifications={devNotifications} onDismiss={dismissDevNotification} />
          </PopoverContent>
        </Popover>

        <ThemeMenu />

        {session?.user && (
          <Select value={activeDatabase} onValueChange={handleDatabaseChange}>
            <SelectTrigger className="hidden w-10 md:flex md:w-[150px]">
              <Database className="h-5 w-5" />
              <SelectValue placeholder="Select database" />
            </SelectTrigger>
            <SelectContent>
              {userDatabases.map((db) => (
                <SelectItem key={db} value={db}>
                  {db}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* User Avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {session?.user?.name && session?.user?.image ? (
              <Avatar>
                <AvatarImage
                  src={session.user.image}
                  alt={session.user.name}
                  className="my-1 w-8 h-8 rounded-full"
                />
                <AvatarFallback>{session.user.name}</AvatarFallback>
              </Avatar>
            ) : (
              <Button variant="outline" size="icon">
                <UserCircle className="h-8 w-8" />
              </Button>
            )}
          </DropdownMenuTrigger>
          {session ? (
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/user/" passHref>
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/api/auth/signout" passHref>
                  Logout
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </DropdownMenuContent>
          ) : (
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/api/auth/signin" passHref>
                  Login
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      </div>
    </header>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";
