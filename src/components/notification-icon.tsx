import { Bell } from "lucide-react";
import { useNotifications } from "@/lib/notification-store";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationPanel } from "@/components/notification-panel";

function NotificationBadge({
  unreadCount,
  totalCount,
}: {
  unreadCount: number;
  totalCount: number;
}) {
  // No badge when there are no notifications at all
  if (totalCount === 0) {
    return null;
  }

  // Small red dot when all notifications are read but some exist
  if (unreadCount === 0 && totalCount > 0) {
    return (
      <span
        className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-destructive"
        aria-hidden="true"
      />
    );
  }

  // Numeric count or "99+"
  const displayText = unreadCount >= 100 ? "99+" : String(unreadCount);

  return (
    <span
      className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold leading-none"
      aria-hidden="true"
    >
      {displayText}
    </span>
  );
}

function getBadgeAriaLabel(
  unreadCount: number,
  totalCount: number
): string {
  if (totalCount === 0) {
    return "Notifikasi";
  }
  if (unreadCount === 0) {
    return "Notifikasi, ada notifikasi tersedia";
  }
  if (unreadCount === 1) {
    return "Notifikasi, 1 belum dibaca";
  }
  if (unreadCount >= 100) {
    return "Notifikasi, 99+ belum dibaca";
  }
  return `Notifikasi, ${unreadCount} belum dibaca`;
}

export function NotificationIcon() {
  const { notifications, unreadCount } = useNotifications();
  const totalCount = notifications.length;

  return (
    <Popover>
      <PopoverTrigger
        className="relative inline-flex items-center justify-center size-8 rounded-md cursor-pointer border-none bg-transparent text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        aria-label={getBadgeAriaLabel(unreadCount, totalCount)}
      >
        <Bell className="size-4 pointer-events-none" />
        <NotificationBadge unreadCount={unreadCount} totalCount={totalCount} />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={4}
        className="w-80 max-h-[60vh] p-0 flex flex-col"
      >
        <NotificationPanel />
      </PopoverContent>
    </Popover>
  );
}
