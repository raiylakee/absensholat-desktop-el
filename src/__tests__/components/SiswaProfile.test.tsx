import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiswaProfile } from "@/pages/siswa-dashboard/components/SiswaProfile";

vi.mock("@/pages/dashboard/components/UserDeviceCard", () => ({
  UserDeviceCard: () => <div data-testid="user-device-card" />,
}));

const mockUser = {
  name: "Ahmad Siswa",
  role: "siswa",
  email: "ahmad@smk.id",
  nis: "2401001",
  className: "XI RPL 1",
  major: "RPL",
  gender: "L",
  avatarFallback: "AS",
};

describe("SiswaProfile", () => {
  const user = userEvent.setup();

  it("renders student data: nama, NIS, kelas, jurusan, gender, email", () => {
    render(<SiswaProfile user={mockUser} />);
    expect(screen.getByText("Ahmad Siswa")).toBeInTheDocument();
    expect(screen.getByText("2401001")).toBeInTheDocument();
    expect(screen.getByText("XI RPL 1")).toBeInTheDocument();
    expect(screen.getByText("RPL")).toBeInTheDocument();
    expect(screen.getByText("Laki-laki")).toBeInTheDocument();
    expect(screen.getByText("ahmad@smk.id")).toBeInTheDocument();
  });

  it("missing fields show '-'", () => {
    render(<SiswaProfile user={{ name: "Test", role: "siswa", email: "t@t.com", avatarFallback: "T" }} />);
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  it("'L' gender → 'Laki-laki', 'P' → 'Perempuan'", () => {
    const { rerender } = render(<SiswaProfile user={{ ...mockUser, gender: "L" }} />);
    expect(screen.getByText("Laki-laki")).toBeInTheDocument();
    rerender(<SiswaProfile user={{ ...mockUser, gender: "P" }} />);
    expect(screen.getByText("Perempuan")).toBeInTheDocument();
  });

  it("UserDeviceCard is rendered", () => {
    render(<SiswaProfile user={mockUser} />);
    expect(screen.getByTestId("user-device-card")).toBeInTheDocument();
  });

  it("change password dialog works", async () => {
    window.electronAPI.changePassword = vi.fn().mockResolvedValue({});
    const { toast } = await import("sonner");
    render(<SiswaProfile user={mockUser} />);
    await user.click(screen.getByText("Ganti Kata Sandi"));
    await screen.findByText("Masukkan kata sandi lama dan baru Anda.");
    await user.type(screen.getByLabelText("Kata Sandi Lama"), "old");
    await user.type(screen.getByLabelText("Kata Sandi Baru"), "new1");
    await user.type(screen.getByLabelText("Konfirmasi Kata Sandi Baru"), "new1");
    await user.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => {
      expect(window.electronAPI.changePassword).toHaveBeenCalledWith({ currentPassword: "old", newPassword: "new1" });
      expect(toast.success).toHaveBeenCalled();
    });
  });

  it("email change + OTP works", async () => {
    window.electronAPI.requestChangeEmail = vi.fn().mockResolvedValue({});
    window.electronAPI.verifyChangeEmail = vi.fn().mockResolvedValue({});
    render(<SiswaProfile user={mockUser} />);
    await user.click(screen.getByText("Ubah Email"));
    await screen.findByText("Kode OTP akan dikirim ke email baru untuk verifikasi.");
    await user.type(screen.getByPlaceholderText("email.baru@gmail.com"), "new@s.id");
    await user.click(screen.getByRole("button", { name: "Kirim OTP" }));
    await waitFor(() => {
      expect(window.electronAPI.requestChangeEmail).toHaveBeenCalledWith({ newEmail: "new@s.id" });
    });
    await screen.findByText(/Masukkan kode OTP/);
    await user.type(screen.getByPlaceholderText("123456"), "111222");
    await user.click(screen.getByRole("button", { name: "Verifikasi" }));
    await waitFor(() => {
      expect(window.electronAPI.verifyChangeEmail).toHaveBeenCalledWith({ newEmail: "new@s.id", otp: "111222" });
    });
  });
});
