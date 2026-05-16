import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { setNotificationAdder } from "./notify";
import { extractData } from "@/lib/api-utils";

// --- Types ---

export interface NotificationEntry {
  id: string;
  message: string;
  timestamp: number;
  read: boolean;
  source: "toast" | "dialog" | "api";
  severity?: "success" | "error" | "info";
  outcome?: "confirmed" | "cancelled";
}

export interface NotificationState {
  notifications: NotificationEntry[];
}

export type NotificationAction =
  | { type: "ADD"; entry: NotificationEntry }
  | { type: "MARK_READ"; id: string }
  | { type: "MARK_ALL_READ" }
  | { type: "CLEAR_ALL" };

export interface NotificationContextValue {
  notifications: NotificationEntry[];
  unreadCount: number;
  addNotification: (
    entry: Omit<NotificationEntry, "id" | "timestamp" | "read">
  ) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  fetchNotificationsFromAPI: () => Promise<void>;
}

// --- Constants ---

const MAX_NOTIFICATIONS = 200;

// --- ID Generation ---

function generateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Date.now().toString(36) + Math.random().toString(36);
  }
}

// --- API Functions ---

/**
 * Fetch notifications from the API via Electron IPC and convert them to NotificationEntry format.
 * Handles both proper notification objects and attendance records for compatibility.
 */
export async function fetchNotificationsFromAPI(): Promise<NotificationEntry[]> {
  try {
    const response = await window.electronAPI.getNotifications();
    const items: any[] = extractData<any[]>(response) ?? [];

    const mapped: (NotificationEntry | null)[] = items.map((item: any) => {
      let message = "";
      let timestamp = Date.now();

      // Handle proper notification objects (have a `message` field)
      if (item.message) {
        message = item.message;
        if (item.created_at) {
          timestamp = new Date(item.created_at).getTime();
        } else if (item.timestamp) {
          timestamp = new Date(item.timestamp).getTime();
        }
      }
      // Handle attendance records (legacy format with `nama_siswa`/`status` fields)
      else if (item.nama_siswa || item.status) {
        const studentName = item.nama_siswa || item.nama || "Siswa";
        const status = item.status || "hadir";
        const date =
          item.tanggal ||
          item.date ||
          new Date().toLocaleDateString("id-ID");
        message = `${studentName} - ${status} (${date})`;
        if (item.tanggal) {
          timestamp = new Date(item.tanggal).getTime();
        } else if (item.created_at) {
          timestamp = new Date(item.created_at).getTime();
        }
      }

      // Skip empty messages
      if (!message || message.trim() === "") {
        return null;
      }

      const entry: NotificationEntry = {
        id: item.id || generateId(),
        message,
        timestamp,
        read: item.is_read === true || item.read === true || false,
        source: "api",
        severity: (item.severity || "info") as "success" | "error" | "info",
      };
      return entry;
    });

    return mapped.filter((n): n is NotificationEntry => n !== null);
  } catch (error) {
    console.error("Error fetching notifications from API:", error);
    return [];
  }
}

// --- Reducer ---

export function notificationReducer(
  state: NotificationState,
  action: NotificationAction
): NotificationState {
  switch (action.type) {
    case "ADD": {
      // Silently ignore entries with empty messages
      if (!action.entry.message || action.entry.message.trim() === "") {
        return state;
      }

      // Dedupe by id — re-fetching the same notification must be idempotent
      if (state.notifications.some((n) => n.id === action.entry.id)) {
        return state;
      }

      let notifications = [action.entry, ...state.notifications];

      // Enforce 200-entry capacity with eviction policy
      if (notifications.length > MAX_NOTIFICATIONS) {
        // Find oldest read entry to evict (last read entry since list is newest-first)
        const oldestReadIndex = findOldestReadIndex(notifications);

        if (oldestReadIndex !== -1) {
          notifications = [
            ...notifications.slice(0, oldestReadIndex),
            ...notifications.slice(oldestReadIndex + 1),
          ];
        } else {
          // All unread — remove the oldest unread (last item)
          notifications = notifications.slice(0, MAX_NOTIFICATIONS);
        }
      }

      return { notifications };
    }

    case "MARK_READ": {
      const idx = state.notifications.findIndex((n) => n.id === action.id);
      if (idx === -1 || state.notifications[idx].read) {
        return state;
      }

      const notifications = state.notifications.map((n) =>
        n.id === action.id ? { ...n, read: true } : n
      );
      return { notifications };
    }

    case "MARK_ALL_READ": {
      const hasUnread = state.notifications.some((n) => !n.read);
      if (!hasUnread) return state;

      const notifications = state.notifications.map((n) =>
        n.read ? n : { ...n, read: true }
      );
      return { notifications };
    }

    case "CLEAR_ALL": {
      return { notifications: [] };
    }

    default:
      return state;
  }
}

/**
 * Find the index of the oldest read notification.
 * Since the list is ordered newest-first, the oldest read entry
 * is the last read entry in the array.
 */
function findOldestReadIndex(notifications: NotificationEntry[]): number {
  for (let i = notifications.length - 1; i >= 0; i--) {
    if (notifications[i].read) {
      return i;
    }
  }
  return -1;
}

// --- Context ---

const NotificationContext = createContext<NotificationContextValue | null>(null);

// --- Provider ---

const initialState: NotificationState = { notifications: [] };

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // Stable across renders — depends only on `dispatch`, which useReducer guarantees is stable.
  // Keeping this stable is what prevents NotificationPanel's useEffect from looping.
  const fetchFromAPI = useCallback(async () => {
    try {
      const apiNotifications = await fetchNotificationsFromAPI();
      apiNotifications.forEach((notification) => {
        dispatch({ type: "ADD", entry: notification });
      });
    } catch (error) {
      console.error("Failed to fetch notifications from API:", error);
    }
  }, []);

  const addNotification = useCallback(
    (entry: Omit<NotificationEntry, "id" | "timestamp" | "read">) => {
      const fullEntry: NotificationEntry = {
        ...entry,
        id: generateId(),
        timestamp: Date.now(),
        read: false,
      };
      dispatch({ type: "ADD", entry: fullEntry });
    },
    []
  );

  const markRead = useCallback((id: string) => {
    dispatch({ type: "MARK_READ", id });
  }, []);

  const markAllRead = useCallback(() => {
    dispatch({ type: "MARK_ALL_READ" });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: "CLEAR_ALL" });
  }, []);

  const contextValue = useMemo<NotificationContextValue>(() => {
    const unreadCount = state.notifications.filter((n) => !n.read).length;

    return {
      notifications: state.notifications,
      unreadCount,
      addNotification,
      markRead,
      markAllRead,
      clearAll,
      fetchNotificationsFromAPI: fetchFromAPI,
    };
  }, [state.notifications, addNotification, markRead, markAllRead, clearAll, fetchFromAPI]);

  // Register the addNotification function for the module-level notify wrapper
  useEffect(() => {
    setNotificationAdder(addNotification);
    return () => {
      setNotificationAdder(null);
    };
  }, [addNotification]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

// --- Hook ---

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}
