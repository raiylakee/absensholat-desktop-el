import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { AutoUpdaterListener } from "@/components/AutoUpdaterListener";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "mock-toast-id"),
    dismiss: vi.fn(),
  },
}));

describe("AutoUpdaterListener", () => {
  let statusCallback: (status: string, info: any) => void;
  let progressCallback: (percent: number) => void;
  const unsubscribeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    window.electronAPI.onUpdateStatus = vi.fn((cb) => {
      statusCallback = cb;
      return unsubscribeMock;
    });

    window.electronAPI.onUpdateProgress = vi.fn((cb) => {
      progressCallback = cb;
      return unsubscribeMock;
    });
  });

  it("subscribes to update events on mount and unsubscribes on unmount", () => {
    const { unmount } = render(<AutoUpdaterListener />);
    
    expect(window.electronAPI.onUpdateStatus).toHaveBeenCalled();
    expect(window.electronAPI.onUpdateProgress).toHaveBeenCalled();

    unmount();
    expect(unsubscribeMock).toHaveBeenCalledTimes(2);
  });

  it("shows loading toast when update is available", () => {
    render(<AutoUpdaterListener />);
    
    // Simulate update available event
    statusCallback("available", { version: "1.3.0" });
    
    expect(toast.loading).toHaveBeenCalledWith(
      expect.stringContaining("Pembaruan tersedia (v1.3.0)"),
      expect.any(Object)
    );
  });

  it("dismisses loading toast and shows success toast when update is downloaded", () => {
    render(<AutoUpdaterListener />);
    
    // Simulate progress and available
    statusCallback("available", { version: "1.3.0" });
    statusCallback("downloaded", { version: "1.3.0" });
    
    expect(toast.dismiss).toHaveBeenCalledWith("mock-toast-id");
    expect(toast.success).toHaveBeenCalledWith(
      "Pembaruan selesai diunduh!",
      expect.objectContaining({
        description: expect.any(String),
        action: expect.any(Object),
      })
    );

    // Test the action click
    const successCallArgs = vi.mocked(toast.success).mock.calls[0][1] as any;
    expect(successCallArgs.action.label).toBe("Restart");
    
    successCallArgs.action.onClick();
    expect(window.electronAPI.quitAndInstall).toHaveBeenCalled();
  });

  it("updates progress text when download progress event fires", () => {
    render(<AutoUpdaterListener />);
    
    // Simulate available to get the toast ID
    statusCallback("available", { version: "1.3.0" });
    progressCallback(45.6);
    
    expect(toast.loading).toHaveBeenLastCalledWith(
      expect.stringContaining("Mengunduh pembaruan... 46%"),
      expect.objectContaining({ id: "mock-toast-id" })
    );
  });
});
