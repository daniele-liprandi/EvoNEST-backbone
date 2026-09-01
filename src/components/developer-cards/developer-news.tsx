"use client";

import { cn, prepend_path } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import ReactTimeAgo from "react-time-ago";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en";
import { X } from "@phosphor-icons/react";

// Setup react-time-ago
TimeAgo.addDefaultLocale(en);

// Matches the shape /api/notifications normalizes every item to, whichever
// schema the feed itself uses.
export interface Notification {
  id: string;
  date: string; // ISO 8601
  title: string;
  body: string;
  level: "info" | "warning" | "critical";
  link?: string | null;
  icon?: string | null;
  color?: string | null;
}

const LEVEL_DEFAULTS: Record<Notification["level"], { icon: string; color: string }> = {
  info: { icon: "💬", color: "#3b82f6" },
  warning: { icon: "⚠️", color: "#f59e0b" },
  critical: { icon: "🚨", color: "#ef4444" },
};

const DISMISSED_KEY = "evonest.dismissedNotifications";

function loadDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set(); // private window, blocked storage, or corrupt value — start clean
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {
    // best-effort only; worst case a dismissed item reappears next visit
  }
}

/**
 * Fetches and polls the developer news feed, and remembers per-browser which
 * items the user has dismissed. Single source of truth so the navbar badge
 * and the popover list agree — call this once and pass the result down.
 */
export function useDeveloperNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => loadDismissed());

  useEffect(() => {
    let cancelled = false;

    const fetchNotifications = async () => {
      try {
        const response = await fetch(prepend_path + "/api/notifications");
        if (!response.ok) {
          throw new Error("Failed to fetch notifications");
        }
        const data = await response.json();

        // Handle both response formats: direct array (200) or object with notifications property (206)
        let list: Notification[] = [];
        if (Array.isArray(data)) {
          list = data;
        } else if (Array.isArray(data?.notifications)) {
          list = data.notifications;
          if (data.warning) console.warn("Notifications API warning:", data.warning);
          if (data.error) console.warn("Notifications API error:", data.error);
        } else {
          console.error("Unexpected notifications response format:", data);
        }

        if (!cancelled) setNotifications(list);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();

    // Set up polling to check for updates every 5 minutes
    const pollInterval = setInterval(fetchNotifications, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  }, []);

  const visible = useMemo(
    () => notifications.filter((n) => !dismissedIds.has(n.id)),
    [notifications, dismissedIds]
  );

  return { notifications: visible, dismiss, unreadCount: visible.length };
}

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
  };

  return (
    <motion.div
      {...animations}
      transition={{ type: "spring", stiffness: 350, damping: 40 }}
      layout
      className="mx-auto w-full"
    >
      {children}
    </motion.div>
  );
}

const NotificationItem = ({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: (id: string) => void;
}) => {
  const { id, title, body, date, level, link, icon, color } = notification;
  const defaults = LEVEL_DEFAULTS[level] ?? LEVEL_DEFAULTS.info;
  const parsedDate = new Date(date);

  const body_ = (
    <div className="flex items-start gap-3 pr-5">
      <div
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: color || defaults.color }}
      >
        <span className="text-lg">{icon || defaults.icon}</span>
      </div>
      <div className="flex flex-col overflow-hidden">
        <figcaption className="flex flex-wrap items-center gap-1 text-sm font-medium">
          <span className="mr-1">{title}</span>
          {!Number.isNaN(parsedDate.getTime()) && (
            <span className="text-xs text-gray-500">
              <ReactTimeAgo date={parsedDate} locale="en-US" timeStyle="twitter" />
            </span>
          )}
        </figcaption>
        <p className="text-sm font-normal line-clamp-3">{body}</p>
      </div>
    </div>
  );

  return (
    <figure
      className={cn(
        "relative mx-auto w-full max-w-[400px] transform cursor-pointer overflow-hidden rounded-lg p-4",
        "transition-all duration-1000 ease-in-out hover:scale-[103%]",
        "[box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        "transform-gpu dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]"
      )}
    >
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(id);
        }}
      >
        <X size={14} />
      </button>
      {link ? (
        <a href={link} target="_blank" rel="noreferrer">
          {body_}
        </a>
      ) : (
        body_
      )}
    </figure>
  );
};

export function DeveloperNewsCard({
  notifications,
  onDismiss,
}: {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="relative flex h-full min-h-[500px] w-full max-w-[32rem] transform-gpu flex-col justify-between overflow-hidden rounded-lg border [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)] dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]">
      <div className="flex items-center justify-center overflow-hidden">
        {notifications.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </p>
        ) : (
          <AnimatedList>
            {notifications.slice(0, 4).map((item) => (
              <NotificationItem notification={item} onDismiss={onDismiss} key={item.id} />
            ))}
          </AnimatedList>
        )}
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
