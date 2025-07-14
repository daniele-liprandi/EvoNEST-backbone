"use client";

import { cn, prepend_path } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import React, { ReactElement, useEffect, useState } from "react";
import ReactTimeAgo from "react-time-ago";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";

// Setup react-time-ago
TimeAgo.addDefaultLocale(en);

// Define the Notification interface
export interface Notification {
  name: string;
  description: string;
  icon: string;
  color: string;
  time: string; // Format: "yymmdd-hh:mm"
}

// Function to parse our date string format
const parseDate = (dateString: string): Date => {
  const [datePart, timePart] = dateString.split("-");
  const year = parseInt(`20${datePart.slice(0, 2)}`, 10);
  const month = parseInt(datePart.slice(2, 4), 10) - 1; // JS months are 0-indexed
  const day = parseInt(datePart.slice(4, 6), 10);
  const [hours, minutes] = timePart.split(":").map(Number);
  return new Date(year, month, day, hours, minutes);
};

export const AnimatedList = React.memo(
  ({
    className,
    children,
    delay = 1500,
  }: {
    className?: string;
    children: React.ReactNode;
    delay?: number;
  }) => {
    const [index, setIndex] = useState(0);
    const [allItemsShown, setAllItemsShown] = useState(false);
    const childrenArray = React.Children.toArray(children);

    useEffect(() => {
      if (allItemsShown) return; // Don't set up the interval if all items are already shown

      const interval = setInterval(() => {
        setIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          if (nextIndex >= childrenArray.length) {
            clearInterval(interval);
            setAllItemsShown(true);
            return childrenArray.length - 1; // Ensure we don't exceed the number of children
          }
          return nextIndex;
        });
      }, delay);

      return () => clearInterval(interval);
    }, [childrenArray.length, delay, allItemsShown]);

    const itemsToShow = childrenArray.slice(0, index + 1).reverse();

    return (
      <div className={`flex flex-col items-center gap-4 ${className}`}>
        <AnimatePresence>
          {itemsToShow.map((item) => (
            <AnimatedListItem key={(item as ReactElement).key}>
              {item}
            </AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    );
  }
);

AnimatedList.displayName = "AnimatedList";

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  const animations = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, originY: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: { type: "spring", stiffness: 350, damping: 40 },
  };

  return (
    <motion.div {...animations} layout className="mx-auto w-full">
      {children}
    </motion.div>
  );
}

const NotificationItem = ({
  name,
  description,
  icon,
  color,
  time,
}: Notification) => {
  const date = parseDate(time);

  return (
    <figure
      className={cn(
        "relative mx-auto w-full max-w-[400px] transform cursor-pointer overflow-hidden rounded-lg p-4",
        "transition-all duration-1000 ease-in-out hover:scale-[103%]",
        "[box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        "transform-gpu dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: color,
          }}
        >
          <span className="text-lg">{icon}</span>
        </div>
        <div className="flex flex-col overflow-hidden">
          <figcaption className="flex flex-wrap items-center gap-1 text-sm font-medium">
            <span className="mr-1">{name}</span>
            <span className="text-xs text-gray-500">
              <ReactTimeAgo date={date} locale="en-US" timeStyle="twitter" />
            </span>
          </figcaption>
          <p className="text-sm font-normal line-clamp-3">{description}</p>
        </div>
      </div>
    </figure>
  );
};

export function DeveloperNewsCard() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch(prepend_path + "/api/notifications");
        if (!response.ok) {
          throw new Error("Failed to fetch notifications");
        }
        const data = await response.json();

        // Handle both response formats: direct array (200) or object with notifications property (206)
        if (Array.isArray(data)) {
          // Status 200: Direct array response
          setNotifications(data);
        } else if (data.notifications && Array.isArray(data.notifications)) {
          // Status 206: Fallback response with notifications property
          setNotifications(data.notifications);

          // Log warning if present
          if (data.warning) {
            console.warn("Notifications API warning:", data.warning);
          }
          if (data.error) {
            console.warn("Notifications API error:", data.error);
          }
        } else {
          // Unexpected response format
          console.error("Unexpected notifications response format:", data);
          setNotifications([]);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();

    // Set up polling to check for updates every 5 minutes
    const pollInterval = setInterval(fetchNotifications, 5 * 60 * 1000);

    return () => clearInterval(pollInterval);
  }, []);

  return (
    <div className="relative flex h-full min-h-[500px] w-full max-w-[32rem] transform-gpu flex-col justify-between overflow-hidden rounded-lg border [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)] dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]">
      <div className="flex items-center justify-center overflow-hidden">
        <AnimatedList>
          {notifications.slice(0, 4).map((item: Notification, idx: number) => (
            <NotificationItem {...item} key={idx} />
          ))}
        </AnimatedList>
      </div>
      <div className="flex flex-col items-start gap-y-1 border-t p-4 dark:border-neutral-800">
        <h2 className="text-xl font-semibold">News from the Devs</h2>
        <p className="text-base font-normal text-neutral-500 dark:text-neutral-400">
          Stay up to date with the latest news from us.
        </p>
      </div>
    </div>
  );
}
