import { describe, it, expect, vi, beforeEach } from "vitest";
import { notify, notifyDialogAction } from "@/lib/notify";

describe("notify system notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should trigger system notification when notify is called", () => {
    const showSystemNotificationSpy = vi.spyOn(window.electronAPI, "showSystemNotification");

    notify("Test message success", "success");

    expect(showSystemNotificationSpy).toHaveBeenCalledWith({
      title: "Presensi Sholat Desktop",
      body: "Test message success",
    });
  });

  it("should trigger system notification when notifyDialogAction is called with confirmed", () => {
    const showSystemNotificationSpy = vi.spyOn(window.electronAPI, "showSystemNotification");

    notifyDialogAction("Simpan data", "confirmed");

    expect(showSystemNotificationSpy).toHaveBeenCalledWith({
      title: "Presensi Sholat Desktop",
      body: "Simpan data — dikonfirmasi",
    });
  });

  it("should trigger system notification when notifyDialogAction is called with cancelled", () => {
    const showSystemNotificationSpy = vi.spyOn(window.electronAPI, "showSystemNotification");

    notifyDialogAction("Simpan data", "cancelled");

    expect(showSystemNotificationSpy).toHaveBeenCalledWith({
      title: "Presensi Sholat Desktop",
      body: "Simpan data — dibatalkan",
    });
  });
});
