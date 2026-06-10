import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileSection } from "@/pages/dashboard/components/ProfileSection";

vi.mock("@/pages/dashboard/components/DeviceManagementSection", () => ({
  DeviceManagementSection: () => <div data-testid="device-management-section" />,
}));
vi.mock("@/pages/dashboard/components/UserDeviceCard", () => ({
  UserDeviceCard: () => <div data-testid="user-device-card" />,
}));

const adminUser = { name: "Admin User", role: "admin", email: "admin@smk.id", avatarFallback: "AU" };
const guruUser = { name: "Guru Test", role: "guru", email: "guru@smk.id", nip: "12345", gender: "L", avatarFallback: "GT" };
const waliUser = { name: "Wali Test", role: "wali_kelas", email: "wali@smk.id", avatarFallback: "WT" };

describe("ProfileSection", () => {
  const user = userEvent.setup();

  it("admin user: DeviceManagementSection rendered, UserDeviceCard NOT rendered", () => {
    render(<ProfileSection user={adminUser} />);
    expect(screen.getByTestId("device-management-section")).toBeInTheDocument();
    expect(screen.queryByTestId("user-device-card")).not.toBeInTheDocument();
  });

  it("guru user: UserDeviceCard rendered, DeviceManagementSection NOT rendered", () => {
    render(<ProfileSection user={guruUser} />);
    expect(screen.getByTestId("user-device-card")).toBeInTheDocument();
    expect(screen.queryByTestId("device-management-section")).not.toBeInTheDocument();
  });

  it("wali_kelas user: UserDeviceCard rendered", () => {
    render(<ProfileSection user={waliUser} />);
    expect(screen.getByTestId("user-device-card")).toBeInTheDocument();
  });

  it("displays user name and email", () => {
    render(<ProfileSection user={guruUser} />);
    expect(screen.getByText("Guru Test")).toBeInTheDocument();
    expect(screen.getByText("guru@smk.id")).toBeInTheDocument();
  });

  it("displays roleLabel from map (admin → Administrator, guru → Guru)", () => {
    const { rerender } = render(<ProfileSection user={adminUser} />);
    expect(screen.getByText("Administrator")).toBeInTheDocument();
    rerender(<ProfileSection user={guruUser} />);
    expect(screen.getByText("Guru")).toBeInTheDocument();
  });

  it("shows NIP for non-admin users with NIP set", () => {
    render(<ProfileSection user={guruUser} />);
    expect(screen.getByText("12345")).toBeInTheDocument();
  });

  it("hides NIP for admin", () => {
    render(<ProfileSection user={{ ...adminUser, nip: "99999" }} />);
    expect(screen.queryByText("99999")).not.toBeInTheDocument();
  });

  it("shows gender label when set ('L' → 'Laki-laki')", () => {
    render(<ProfileSection user={guruUser} />);
    expect(screen.getByText("Laki-laki")).toBeInTheDocument();
  });

  it("change password dialog opens on button click", async () => {
    render(<ProfileSection user={guruUser} />);
    await user.click(screen.getByText("Ubah Kata Sandi"));
    expect(await screen.findByText("Masukkan kata sandi saat ini dan kata sandi baru.")).toBeInTheDocument();
  });

  it("mismatched passwords: error toast, changePassword NOT called", async () => {
    const { toast } = await import("sonner");
    render(<ProfileSection user={guruUser} />);
    await user.click(screen.getByText("Ubah Kata Sandi"));
    await screen.findByText("Masukkan kata sandi saat ini dan kata sandi baru.");
    await user.type(screen.getByLabelText("Kata Sandi Saat Ini"), "old");
    await user.type(screen.getByLabelText("Kata Sandi Baru"), "new1");
    await user.type(screen.getByLabelText("Konfirmasi Kata Sandi Baru"), "new2");
    await user.click(screen.getByRole("button", { name: "Simpan" }));
    expect(toast.error).toHaveBeenCalled();
    expect(window.electronAPI.changePassword).not.toHaveBeenCalled();
  });

  it("matching passwords: changePassword called, success toast, dialog closes", async () => {
    window.electronAPI.changePassword = vi.fn().mockResolvedValue({});
    const { toast } = await import("sonner");
    render(<ProfileSection user={guruUser} />);
    await user.click(screen.getByText("Ubah Kata Sandi"));
    await screen.findByText("Masukkan kata sandi saat ini dan kata sandi baru.");
    await user.type(screen.getByLabelText("Kata Sandi Saat Ini"), "old");
    await user.type(screen.getByLabelText("Kata Sandi Baru"), "newpass");
    await user.type(screen.getByLabelText("Konfirmasi Kata Sandi Baru"), "newpass");
    await user.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => {
      expect(window.electronAPI.changePassword).toHaveBeenCalledWith({ currentPassword: "old", newPassword: "newpass" });
      expect(toast.success).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.queryByText("Masukkan kata sandi saat ini dan kata sandi baru.")).not.toBeInTheDocument();
    });
  });

  it("'Ubah Surel' opens email dialog", async () => {
    render(<ProfileSection user={guruUser} />);
    await user.click(screen.getByText("Ubah Surel"));
    expect(await screen.findByText("Kode OTP akan dikirim ke surel baru untuk verifikasi.")).toBeInTheDocument();
  });

  it("requestChangeEmail called with newEmail, OTP dialog opens", async () => {
    window.electronAPI.requestChangeEmail = vi.fn().mockResolvedValue({});
    render(<ProfileSection user={guruUser} />);
    await user.click(screen.getByText("Ubah Surel"));
    await screen.findByText("Kode OTP akan dikirim ke surel baru untuk verifikasi.");
    await user.type(screen.getByPlaceholderText("email.baru@gmail.com"), "new@test.com");
    await user.click(screen.getByRole("button", { name: "Kirim OTP" }));
    await waitFor(() => {
      expect(window.electronAPI.requestChangeEmail).toHaveBeenCalledWith({ newEmail: "new@test.com" });
    });
    expect(await screen.findByText(/Masukkan kode OTP/)).toBeInTheDocument();
  });

  it("OTP dialog: verifyChangeEmail called with pendingEmail + otp", async () => {
    window.electronAPI.requestChangeEmail = vi.fn().mockResolvedValue({});
    window.electronAPI.verifyChangeEmail = vi.fn().mockResolvedValue({});
    render(<ProfileSection user={guruUser} />);
    await user.click(screen.getByText("Ubah Surel"));
    await screen.findByText("Kode OTP akan dikirim ke surel baru untuk verifikasi.");
    await user.type(screen.getByPlaceholderText("email.baru@gmail.com"), "new@test.com");
    await user.click(screen.getByRole("button", { name: "Kirim OTP" }));
    await screen.findByText(/Masukkan kode OTP/);
    await user.type(screen.getByPlaceholderText("123456"), "654321");
    await user.click(screen.getByRole("button", { name: "Verifikasi" }));
    await waitFor(() => {
      expect(window.electronAPI.verifyChangeEmail).toHaveBeenCalledWith({ newEmail: "new@test.com", otp: "654321" });
    });
  });
});
