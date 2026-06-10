import { toast } from "sonner";
import type { NotificationEntry } from "./notification-store";

type NotifySeverity = "success" | "error" | "info" | "warning";

type AddNotificationFn = (
  entry: Omit<NotificationEntry, "id" | "timestamp" | "read">
) => void;

// Module-level reference to the addNotification function from NotificationProvider.
// Set via `setNotificationAdder` when the provider mounts.
let addNotificationFn: AddNotificationFn | null = null;

/**
 * Register the addNotification function from NotificationProvider.
 * Call this inside the provider component (e.g., in a useEffect) so that
 * `notify` and `notifyDialogAction` can dispatch to the store from anywhere.
 */
export function setNotificationAdder(fn: AddNotificationFn | null): void {
  addNotificationFn = fn;
}

function triggerSystemNotification(message: string): void {
  if (
    typeof window !== "undefined" &&
    window.electronAPI &&
    typeof window.electronAPI.showSystemNotification === "function"
  ) {
    const promise = window.electronAPI.showSystemNotification({
      title: "Presensi Sholat Desktop",
      body: message,
    });
    if (promise && typeof promise.catch === "function") {
      promise.catch((err) => {
        console.error("Failed to show system notification:", err);
      });
    }
  }
}

/**
 * Show a Sonner toast and add a notification entry to the store.
 * If severity is not provided, defaults to "info".
 */
export function notify(message: string, severity?: NotifySeverity): void {
  const level = severity ?? "info";

  // Trigger the appropriate Sonner toast variant
  switch (level) {
    case "success":
      toast.success(message);
      break;
    case "error":
      toast.error(message);
      break;
    case "info":
    default:
      toast(message);
      break;
  }

  // Dispatch to the notification store if registered
  if (addNotificationFn) {
    addNotificationFn({
      message,
      source: "toast",
      severity: level,
    });
  }

  triggerSystemNotification(message);
}

/**
 * Record a dialog confirmation action in the notification store and show a toast.
 * Used after dialog-based actions (e.g., enabling auto-login, deleting a record).
 */
export function notifyDialogAction(
  description: string,
  outcome: "confirmed" | "cancelled"
): void {
  const message =
    outcome === "confirmed"
      ? `${description} — dikonfirmasi`
      : `${description} — dibatalkan`;

  // Show a toast for the dialog action
  if (outcome === "confirmed") {
    toast.success(message);
  } else {
    toast(message);
  }

  // Dispatch to the notification store if registered
  if (addNotificationFn) {
    addNotificationFn({
      message: description,
      source: "dialog",
      outcome,
    });
  }

  triggerSystemNotification(message);
}
