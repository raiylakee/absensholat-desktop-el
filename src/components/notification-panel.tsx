import { Bell, MessageSquare, Megaphone } from "lucide-react";
import { useEffect } from "react";
import { useNotifications, type NotificationEntry } from "@/lib/notification-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// --- Relative Timestamp Formatting ---

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return "Baru saja";
  if (diffMinutes < 60) return `${diffMinutes} mnt lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffHours < 48) return "Kemarin";
  return `${diffDays} hari lalu`;
}

// --- Message Truncation ---

function truncateMessage(message: string, maxLength = 120): string {
  if (message.length <= maxLength) return message;
  return message.slice(0, maxLength) + "…";
}

// --- Source Icon ---

function SourceIcon({ source }: { source: "toast" | "dialog" | "api" }) {
  if (source === "dialog") {
    return <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />;
  }
  if (source === "api") {
    return <Bell className="size-3.5 shrink-0 text-muted-foreground" />;
  }
  return <Megaphone className="size-3.5 shrink-0 text-muted-foreground" />;
}

// --- Notification Entry Item ---

function NotificationItem({
  entry,
  onMarkRead,
}: {
  entry: NotificationEntry;
  onMarkRead: (id: string) => void;
}) {
  const handleClick = () => {
    if (!entry.read) {
      onMarkRead(entry.id);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full text-left px-3 py-2.5 border-b border-border/50 last:border-b-0 transition-colors",
        !entry.read
          ? "bg-primary/5 hover:bg-primary/10 cursor-pointer"
          : "hover:bg-muted/50"
      )}
    >
      <div className="flex items-start gap-2">
        {/* Unread indicator dot */}
        <div className="mt-1.5 shrink-0">
          {!entry.read ? (
            <span className="block size-2 rounded-full bg-primary" />
          ) : (
            <span className="block size-2" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm leading-snug break-words",
              !entry.read ? "font-bold" : "font-normal"
            )}
          >
            {truncateMessage(entry.message)}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <SourceIcon source={entry.source} />
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(entry.timestamp)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// --- Empty State ---

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <Bell className="size-8 text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">tidak ada notifikasi</p>
      <p className="text-xs text-muted-foreground/70 mt-0.5">
        Semua sudah terbaca
      </p>
    </div>
  );
}

// --- Notification Panel ---

export function NotificationPanel() {
  const { notifications, unreadCount, markRead, markAllRead, clearAll, fetchNotificationsFromAPI } =
    useNotifications();

  // Fetch notifications from API on mount
  useEffect(() => {
    fetchNotificationsFromAPI();
  }, [fetchNotificationsFromAPI]);

  // Display at most 50 entries, newest first (store already orders newest-first)
  const displayedNotifications = notifications.slice(0, 50);
  const allRead = unreadCount === 0;
  const hasNotifications = notifications.length > 0;

  return (
    <div
      role="dialog"
      aria-label="Panel notifikasi"
      className="flex flex-col max-h-[60vh] w-full rounded-b-lg"
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border shrink-0">
        <h2 className="text-sm font-semibold">Notifikasi</h2>
      </div>

      {/* Scrollable notification list */}
      <div className="flex-1 overflow-y-auto">
        {hasNotifications ? (
          displayedNotifications.map((entry) => (
            <NotificationItem
              key={entry.id}
              entry={entry}
              onMarkRead={markRead}
            />
          ))
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Sticky footer with actions */}
      {hasNotifications && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-border shrink-0 bg-background">
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            disabled={allRead}
            className="text-xs"
          >
            Tandai Semua Dibaca
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="text-xs text-destructive hover:text-destructive"
          >
            Hapus Semua
          </Button>
        </div>
      )}
    </div>
  );
}
