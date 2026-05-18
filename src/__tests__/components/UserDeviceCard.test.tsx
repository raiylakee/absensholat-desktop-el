import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserDeviceCard } from "@/pages/dashboard/components/UserDeviceCard";

describe("UserDeviceCard", () => {
  const user = userEvent.setup();

  it("shows spinner while loading", () => {
    window.electronAPI.getHardwareId = vi.fn().mockReturnValue(new Promise(() => {}));
    window.electronAPI.getDeviceAuthInfo = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<UserDeviceCard />);
    expect(document.querySelector("[class*='animate-spin'], svg") || screen.getByText((_, el) => el?.closest("[class*='spinner']") !== null)).toBeTruthy();
  });

  it("not-registered when getDeviceAuthInfo rejects: shows yellow alert", async () => {
    window.electronAPI.getHardwareId = vi.fn().mockResolvedValue({ hardware_id: "local-hw" });
    window.electronAPI.getDeviceAuthInfo = vi.fn().mockRejectedValue(new Error("Not found"));
    render(<UserDeviceCard />);
    expect(await screen.findByText("Perangkat belum terdaftar")).toBeInTheDocument();
    expect(screen.getByText("Daftarkan Perangkat Ini")).toBeInTheDocument();
  });

  it("not-registered when getDeviceAuthInfo resolves with null", async () => {
    window.electronAPI.getHardwareId = vi.fn().mockResolvedValue({ hardware_id: "local-hw" });
    window.electronAPI.getDeviceAuthInfo = vi.fn().mockResolvedValue(null);
    render(<UserDeviceCard />);
    expect(await screen.findByText("Perangkat belum terdaftar")).toBeInTheDocument();
  });

  it("not-registered when getDeviceAuthInfo resolves with no hardware_id", async () => {
    window.electronAPI.getHardwareId = vi.fn().mockResolvedValue({ hardware_id: "local-hw" });
    window.electronAPI.getDeviceAuthInfo = vi.fn().mockResolvedValue({ data: {} });
    render(<UserDeviceCard />);
    expect(await screen.findByText("Perangkat belum terdaftar")).toBeInTheDocument();
  });

  it("registered state shows green alert and buttons", async () => {
    window.electronAPI.getHardwareId = vi.fn().mockResolvedValue({ hardware_id: "hw-1234-abcd-5678-efgh" });
    window.electronAPI.getDeviceAuthInfo = vi.fn().mockResolvedValue({
      data: { hardware_id: "hw-1234-abcd-5678-efgh", device_name: null, last_auth_at: null },
    });
    render(<UserDeviceCard />);
    expect(await screen.findByText("Perangkat terdaftar")).toBeInTheDocument();
    expect(screen.getByText("Ajukan Ganti Perangkat")).toBeInTheDocument();
    expect(screen.getByText("Lepas Perangkat")).toBeInTheDocument();
  });

  it("registered: shows truncated HW ID", async () => {
    window.electronAPI.getHardwareId = vi.fn().mockResolvedValue({ hardware_id: "hw-1234-abcd-5678-efgh-ijkl-mnop" });
    window.electronAPI.getDeviceAuthInfo = vi.fn().mockResolvedValue({
      data: { hardware_id: "hw-1234-abcd-5678-efgh-ijkl-mnop", device_name: null, last_auth_at: null },
    });
    render(<UserDeviceCard />);
    await screen.findByText("Perangkat terdaftar");
    // truncate(s, 24) → first 24 chars + "…"
    expect(screen.getByText("hw-1234-abcd-5678-efgh-i…")).toBeInTheDocument();
  });

  it("registered: shows device_name when present", async () => {
    window.electronAPI.getHardwareId = vi.fn().mockResolvedValue({ hardware_id: "hw-123" });
    window.electronAPI.getDeviceAuthInfo = vi.fn().mockResolvedValue({
      data: { hardware_id: "hw-123", device_name: "MacBook Pro", last_auth_at: null },
    });
    render(<UserDeviceCard />);
    await screen.findByText("Perangkat terdaftar");
    expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
  });

  it("registered: shows formatted last_auth_at when present", async () => {
    window.electronAPI.getHardwareId = vi.fn().mockResolvedValue({ hardware_id: "hw-123" });
    window.electronAPI.getDeviceAuthInfo = vi.fn().mockResolvedValue({
      data: { hardware_id: "hw-123", device_name: null, last_auth_at: "2024-06-15T10:30:00Z" },
    });
    render(<UserDeviceCard />);
    await screen.findByText("Perangkat terdaftar");
    expect(screen.getByText("Terakhir Auth")).toBeInTheDocument();
  });

  it("mismatch state shows red alert", async () => {
    window.electronAPI.getHardwareId = vi.fn().mockResolvedValue({ hardware_id: "local-hw" });
    window.electronAPI.getDeviceAuthInfo = vi.fn().mockResolvedValue({
      data: { hardware_id: "different-hw", device_name: null, last_auth_at: null },
    });
    render(<UserDeviceCard />);
    expect(await screen.findByText("Perangkat tidak cocok")).toBeInTheDocument();
    expect(screen.getByText("Ajukan Ganti Perangkat")).toBeInTheDocument();
  });

  it("register action: clicks button → calls registerDeviceAuth, success toast", async () => {
    window.electronAPI.getHardwareId = vi.fn().mockResolvedValue({ hardware_id: "local-hw" });
    window.electronAPI.getDeviceAuthInfo = vi.fn().mockRejectedValue(new Error("Not found"));
    window.electronAPI.registerDeviceAuth = vi.fn().mockResolvedValue({});
    const { toast } = await import("sonner");
    render(<UserDeviceCard />);
    await screen.findByText("Daftarkan Perangkat Ini");
    await user.click(screen.getByText("Daftarkan Perangkat Ini"));
    await waitFor(() => {
      expect(window.electronAPI.registerDeviceAuth).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("change request dialog: clicking button opens dialog", async () => {
    window.electronAPI.getHardwareId = vi.fn().mockResolvedValue({ hardware_id: "hw-123" });
    window.electronAPI.getDeviceAuthInfo = vi.fn().mockResolvedValue({
      data: { hardware_id: "hw-123", device_name: null, last_auth_at: null },
    });
    render(<UserDeviceCard />);
    await screen.findByText("Ajukan Ganti Perangkat");
    await user.click(screen.getByText("Ajukan Ganti Perangkat"));
    expect(await screen.findByText(/Admin akan meninjau/)).toBeInTheDocument();
  });

  it("change request: submitting empty alasan shows error toast", async () => {
    window.electronAPI.getHardwareId = vi.fn().mockResolvedValue({ hardware_id: "hw-123" });
    window.electronAPI.getDeviceAuthInfo = vi.fn().mockResolvedValue({
      data: { hardware_id: "hw-123", device_name: null, last_auth_at: null },
    });
    const { toast } = await import("sonner");
    render(<UserDeviceCard />);
    await screen.findByText("Ajukan Ganti Perangkat");
    await user.click(screen.getByText("Ajukan Ganti Perangkat"));
    await screen.findByText(/Admin akan meninjau/);
    await user.click(screen.getByRole("button", { name: "Ajukan" }));
    expect(toast.error).toHaveBeenCalled();
    expect(window.electronAPI.createDeviceChangeRequest).not.toHaveBeenCalled();
  });

  it("change request: valid alasan calls createDeviceChangeRequest", async () => {
    window.electronAPI.getHardwareId = vi.fn().mockResolvedValue({ hardware_id: "new-hw" });
    window.electronAPI.getDeviceAuthInfo = vi.fn().mockResolvedValue({
      data: { hardware_id: "old-hw", device_name: null, last_auth_at: null },
    });
    window.electronAPI.createDeviceChangeRequest = vi.fn().mockResolvedValue({});
    // This is mismatch state
    render(<UserDeviceCard />);
    await screen.findByText("Ajukan Ganti Perangkat");
    await user.click(screen.getByText("Ajukan Ganti Perangkat"));
    await screen.findByText(/Admin akan meninjau/);
    const textarea = screen.getByPlaceholderText(/Contoh/);
    await user.type(textarea, "Perangkat rusak");
    await user.click(screen.getByRole("button", { name: "Ajukan" }));
    await waitFor(() => {
      expect(window.electronAPI.createDeviceChangeRequest).toHaveBeenCalledWith({
        body: { alasan: "Perangkat rusak", old_hardware_id: "old-hw", new_hardware_id: "new-hw" },
      });
    });
  });

  it("change request success: success toast + dialog closes", async () => {
    window.electronAPI.getHardwareId = vi.fn().mockResolvedValue({ hardware_id: "new-hw" });
    window.electronAPI.getDeviceAuthInfo = vi.fn().mockResolvedValue({
      data: { hardware_id: "old-hw", device_name: null, last_auth_at: null },
    });
    window.electronAPI.createDeviceChangeRequest = vi.fn().mockResolvedValue({});
    const { toast } = await import("sonner");
    render(<UserDeviceCard />);
    await screen.findByText("Ajukan Ganti Perangkat");
    await user.click(screen.getByText("Ajukan Ganti Perangkat"));
    await screen.findByText(/Admin akan meninjau/);
    await user.type(screen.getByPlaceholderText(/Contoh/), "Rusak");
    await user.click(screen.getByRole("button", { name: "Ajukan" }));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.queryByText(/Admin akan meninjau/)).not.toBeInTheDocument();
    });
  });

  it("unbind dialog: 'Lepas Perangkat' opens confirm dialog", async () => {
    window.electronAPI.getHardwareId = vi.fn().mockResolvedValue({ hardware_id: "hw-123" });
    window.electronAPI.getDeviceAuthInfo = vi.fn().mockResolvedValue({
      data: { hardware_id: "hw-123", device_name: null, last_auth_at: null },
    });
    render(<UserDeviceCard />);
    await screen.findByText("Lepas Perangkat");
    await user.click(screen.getByText("Lepas Perangkat"));
    expect(await screen.findByText(/Yakin ingin melepas perangkat/)).toBeInTheDocument();
  });

  it("unbind confirm: calls deleteProfileDevice, success toast", async () => {
    window.electronAPI.getHardwareId = vi.fn().mockResolvedValue({ hardware_id: "hw-123" });
    window.electronAPI.getDeviceAuthInfo = vi.fn().mockResolvedValue({
      data: { hardware_id: "hw-123", device_name: null, last_auth_at: null },
    });
    window.electronAPI.deleteProfileDevice = vi.fn().mockResolvedValue({});
    const { toast } = await import("sonner");
    render(<UserDeviceCard />);
    await screen.findByText("Lepas Perangkat");
    await user.click(screen.getByText("Lepas Perangkat"));
    await screen.findByText(/Yakin ingin melepas perangkat/);
    // Click the destructive "Lepas" button in the dialog footer
    const buttons = screen.getAllByRole("button", { name: "Lepas" });
    const confirmBtn = buttons.find(b => b.closest("[role='dialog']"));
    await user.click(confirmBtn!);
    await waitFor(() => {
      expect(window.electronAPI.deleteProfileDevice).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("unbind Batal closes dialog without calling deleteProfileDevice", async () => {
    window.electronAPI.getHardwareId = vi.fn().mockResolvedValue({ hardware_id: "hw-123" });
    window.electronAPI.getDeviceAuthInfo = vi.fn().mockResolvedValue({
      data: { hardware_id: "hw-123", device_name: null, last_auth_at: null },
    });
    render(<UserDeviceCard />);
    await screen.findByText("Lepas Perangkat");
    await user.click(screen.getByText("Lepas Perangkat"));
    await screen.findByText(/Yakin ingin melepas perangkat/);
    await user.click(screen.getByRole("button", { name: "Batal" }));
    await waitFor(() => {
      expect(screen.queryByText(/Yakin ingin melepas perangkat/)).not.toBeInTheDocument();
    });
    expect(window.electronAPI.deleteProfileDevice).not.toHaveBeenCalled();
  });
});
