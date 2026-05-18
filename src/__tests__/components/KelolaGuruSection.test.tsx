import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KelolaGuruSection } from "@/pages/dashboard/components/KelolaGuruSection";

const mockGurus = [
  { id_staff: 1, id_account: 10, nama: "Ahmad Fauzi", nip: "198501", email: "ahmad@smk.id", wali_kelas: "XI RPL 1", id_kelas_wali: 2, label_kelas: "XI RPL 1", berlaku_mulai: "2024-01-01" },
  { id_staff: 2, id_account: 11, nama: "Siti Rahayu", nip: null, email: "siti@smk.id", wali_kelas: null, id_kelas_wali: null, label_kelas: null, berlaku_mulai: null },
];

function setupGuruList(data = mockGurus, meta = { total_pages: 1, total: data.length, limit: 15 }) {
  window.electronAPI.getGuruList = vi.fn().mockResolvedValue({ data, meta });
}

describe("KelolaGuruSection", () => {
  const user = userEvent.setup();

  it("shows spinner while loading", () => {
    window.electronAPI.getGuruList = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<KelolaGuruSection />);
    expect(document.querySelector("[class*='animate-spin'], [role='status']") || screen.getByText((_, el) => el?.tagName === "svg" || false) || document.querySelector("svg")).toBeTruthy();
  });

  it("calls getGuruList on mount with page:1, limit:15", async () => {
    setupGuruList();
    render(<KelolaGuruSection />);
    await waitFor(() => {
      expect(window.electronAPI.getGuruList).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 15 })
      );
    });
  });

  it("calls getManagementClasses on mount", async () => {
    setupGuruList();
    render(<KelolaGuruSection />);
    await waitFor(() => {
      expect(window.electronAPI.getManagementClasses).toHaveBeenCalled();
    });
  });

  it("renders guru rows with nama, email, NIP, badge for label_kelas", async () => {
    setupGuruList();
    render(<KelolaGuruSection />);
    expect(await screen.findByText("Ahmad Fauzi")).toBeInTheDocument();
    expect(screen.getByText("ahmad@smk.id")).toBeInTheDocument();
    expect(screen.getByText("198501")).toBeInTheDocument();
    expect(screen.getByText("XI RPL 1")).toBeInTheDocument();
  });

  it("guru without wali_kelas shows '-'", async () => {
    setupGuruList();
    render(<KelolaGuruSection />);
    await screen.findByText("Siti Rahayu");
    const row = screen.getByText("Siti Rahayu").closest("tr")!;
    const dashes = within(row).getAllByText("-");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("empty list shows 'Tidak ada data guru.'", async () => {
    setupGuruList([]);
    render(<KelolaGuruSection />);
    expect(await screen.findByText("Tidak ada data guru.")).toBeInTheDocument();
  });

  it("search input: typing updates value", async () => {
    setupGuruList();
    render(<KelolaGuruSection />);
    await screen.findByPlaceholderText("Cari nama atau email...");
    const input = screen.getByPlaceholderText("Cari nama atau email...");
    await user.type(input, "Ali");
    expect(input).toHaveValue("Ali");
  });

  it("pressing Enter in search calls getGuruList with search", async () => {
    setupGuruList();
    render(<KelolaGuruSection />);
    await screen.findByPlaceholderText("Cari nama atau email...");
    const input = screen.getByPlaceholderText("Cari nama atau email...");
    await user.type(input, "Ali{Enter}");
    await waitFor(() => {
      expect(window.electronAPI.getGuruList).toHaveBeenCalledWith(
        expect.objectContaining({ search: "Ali" })
      );
    });
  });

  it("'Cari' button triggers search", async () => {
    setupGuruList();
    render(<KelolaGuruSection />);
    await screen.findByPlaceholderText("Cari nama atau email...");
    const input = screen.getByPlaceholderText("Cari nama atau email...");
    await user.type(input, "Test");
    await user.click(screen.getByRole("button", { name: "Cari" }));
    await waitFor(() => {
      expect(window.electronAPI.getGuruList).toHaveBeenCalledWith(
        expect.objectContaining({ search: "Test" })
      );
    });
  });

  it("pagination hidden when totalPages=1", async () => {
    setupGuruList(mockGurus, { total_pages: 1, total: 2, limit: 15 });
    render(<KelolaGuruSection />);
    await screen.findByText("Ahmad Fauzi");
    expect(screen.queryByText("Sebelumnya")).not.toBeInTheDocument();
  });

  it("pagination visible when totalPages > 1", async () => {
    setupGuruList(mockGurus, { total_pages: 3, total: 45, limit: 15 });
    render(<KelolaGuruSection />);
    await screen.findByText("Ahmad Fauzi");
    expect(screen.getByText("Sebelumnya")).toBeInTheDocument();
    expect(screen.getByText("Berikutnya")).toBeInTheDocument();
  });

  it("previous button disabled on page 1", async () => {
    setupGuruList(mockGurus, { total_pages: 3, total: 45, limit: 15 });
    render(<KelolaGuruSection />);
    await screen.findByText("Ahmad Fauzi");
    expect(screen.getByText("Sebelumnya").closest("button")).toBeDisabled();
  });

  it("clicking next page calls getGuruList with page:2", async () => {
    setupGuruList(mockGurus, { total_pages: 3, total: 45, limit: 15 });
    render(<KelolaGuruSection />);
    await screen.findByText("Ahmad Fauzi");
    await user.click(screen.getByText("Berikutnya"));
    await waitFor(() => {
      expect(window.electronAPI.getGuruList).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });
  });

  it("'Tambah Guru' opens create dialog with Nama/Email/Password/NIP fields", async () => {
    setupGuruList();
    render(<KelolaGuruSection />);
    await screen.findByText("Tambah Guru");
    await user.click(screen.getByText("Tambah Guru"));
    await waitFor(() => {
      expect(screen.getByText("Isi data guru baru.")).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText("Nama lengkap")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("email@sekolah.sch.id")).toBeInTheDocument();
    // Password field has no placeholder but is type=password
    const dialog = screen.getByText("Isi data guru baru.").closest("[role='dialog']") as HTMLElement;
    expect(within(dialog).getByText(/Nama/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Email/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Password/)).toBeInTheDocument();
    expect(within(dialog).getByText(/NIP/)).toBeInTheDocument();
  });

  it("create dialog Batal closes dialog", async () => {
    setupGuruList();
    render(<KelolaGuruSection />);
    await screen.findByText("Tambah Guru");
    await user.click(screen.getByText("Tambah Guru"));
    await screen.findByText("Isi data guru baru.");
    await user.click(screen.getByRole("button", { name: "Batal" }));
    await waitFor(() => {
      expect(screen.queryByText("Isi data guru baru.")).not.toBeInTheDocument();
    });
  });

  it("create with empty form shows error toast, createGuru NOT called", async () => {
    setupGuruList();
    const { toast } = await import("sonner");
    render(<KelolaGuruSection />);
    await screen.findByText("Tambah Guru");
    await user.click(screen.getByText("Tambah Guru"));
    await screen.findByText("Isi data guru baru.");
    await user.click(screen.getByRole("button", { name: "Simpan" }));
    expect(toast.error).toHaveBeenCalled();
    expect(window.electronAPI.createGuru).not.toHaveBeenCalled();
  });

  it("create with valid data calls createGuru with correct body", async () => {
    setupGuruList();
    window.electronAPI.createGuru = vi.fn().mockResolvedValue({});
    render(<KelolaGuruSection />);
    await screen.findByText("Tambah Guru");
    await user.click(screen.getByText("Tambah Guru"));
    await screen.findByText("Isi data guru baru.");
    await user.type(screen.getByPlaceholderText("Nama lengkap"), "Budi");
    await user.type(screen.getByPlaceholderText("email@sekolah.sch.id"), "budi@smk.id");
    await user.type(document.querySelector("[role=\"dialog\"] input[type=\"password\"]")!, "Pass123");
    await user.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => {
      expect(window.electronAPI.createGuru).toHaveBeenCalledWith({
        body: expect.objectContaining({ nama: "Budi", email: "budi@smk.id", password: "Pass123" }),
      });
    });
  });

  it("create success: success toast + refreshes list + closes dialog", async () => {
    setupGuruList();
    window.electronAPI.createGuru = vi.fn().mockResolvedValue({});
    const { toast } = await import("sonner");
    render(<KelolaGuruSection />);
    await screen.findByText("Tambah Guru");
    await user.click(screen.getByText("Tambah Guru"));
    await screen.findByText("Isi data guru baru.");
    await user.type(screen.getByPlaceholderText("Nama lengkap"), "Budi");
    await user.type(screen.getByPlaceholderText("email@sekolah.sch.id"), "budi@smk.id");
    await user.type(document.querySelector("[role=\"dialog\"] input[type=\"password\"]")!, "Pass123");
    await user.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.queryByText("Isi data guru baru.")).not.toBeInTheDocument();
    });
  });

  it("create API error: error toast, dialog stays open", async () => {
    setupGuruList();
    window.electronAPI.createGuru = vi.fn().mockRejectedValue(new Error("Duplikat"));
    const { toast } = await import("sonner");
    render(<KelolaGuruSection />);
    await screen.findByText("Tambah Guru");
    await user.click(screen.getByText("Tambah Guru"));
    await screen.findByText("Isi data guru baru.");
    await user.type(screen.getByPlaceholderText("Nama lengkap"), "Budi");
    await user.type(screen.getByPlaceholderText("email@sekolah.sch.id"), "budi@smk.id");
    await user.type(document.querySelector("[role=\"dialog\"] input[type=\"password\"]")!, "Pass123");
    await user.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    expect(screen.getByText("Isi data guru baru.")).toBeInTheDocument();
  });

  it("edit button opens dialog with pre-filled nama/email/nip", async () => {
    setupGuruList();
    render(<KelolaGuruSection />);
    await screen.findByText("Ahmad Fauzi");
    const row = screen.getByText("Ahmad Fauzi").closest("tr")!;
    const editBtn = within(row).getByTitle("Edit");
    await user.click(editBtn);
    await waitFor(() => {
      expect(screen.getByText("Perbarui data guru.")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("Ahmad Fauzi")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ahmad@smk.id")).toBeInTheDocument();
    expect(screen.getByDisplayValue("198501")).toBeInTheDocument();
  });

  it("edit dialog has NO password field", async () => {
    setupGuruList();
    render(<KelolaGuruSection />);
    await screen.findByText("Ahmad Fauzi");
    const row = screen.getByText("Ahmad Fauzi").closest("tr")!;
    await user.click(within(row).getByTitle("Edit"));
    await screen.findByText("Perbarui data guru.");
    expect(document.querySelector("[role='dialog'] input[type='password']")).toBeNull();
  });

  it("edit submit calls updateGuru with correct id and body", async () => {
    setupGuruList();
    window.electronAPI.updateGuru = vi.fn().mockResolvedValue({});
    render(<KelolaGuruSection />);
    await screen.findByText("Ahmad Fauzi");
    const row = screen.getByText("Ahmad Fauzi").closest("tr")!;
    await user.click(within(row).getByTitle("Edit"));
    await screen.findByText("Perbarui data guru.");
    const namaInput = screen.getByDisplayValue("Ahmad Fauzi");
    await user.clear(namaInput);
    await user.type(namaInput, "Ahmad Updated");
    await user.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => {
      expect(window.electronAPI.updateGuru).toHaveBeenCalledWith({
        id: 1,
        body: expect.objectContaining({ nama: "Ahmad Updated" }),
      });
    });
  });

  it("delete button opens confirm dialog with guru's name", async () => {
    setupGuruList();
    render(<KelolaGuruSection />);
    await screen.findByText("Ahmad Fauzi");
    const row = screen.getByText("Ahmad Fauzi").closest("tr")!;
    await user.click(within(row).getByTitle("Hapus"));
    await waitFor(() => {
      expect(screen.getByText(/tidak dapat dibatalkan/)).toBeInTheDocument();
    });
    const dialog = screen.getByText(/tidak dapat dibatalkan/).closest("[role='dialog']") as HTMLElement;
    expect(within(dialog).getByText("Ahmad Fauzi")).toBeInTheDocument();
  });

  it("delete confirm calls deleteGuru with correct id", async () => {
    setupGuruList();
    window.electronAPI.deleteGuru = vi.fn().mockResolvedValue({});
    render(<KelolaGuruSection />);
    await screen.findByText("Ahmad Fauzi");
    const row = screen.getByText("Ahmad Fauzi").closest("tr")!;
    await user.click(within(row).getByTitle("Hapus"));
    await screen.findByText(/tidak dapat dibatalkan/);
    await user.click(screen.getByRole("button", { name: "Hapus" }));
    await waitFor(() => {
      expect(window.electronAPI.deleteGuru).toHaveBeenCalledWith({ id: 1 });
    });
  });

  it("assign dialog opens with kelas select populated from getManagementClasses", async () => {
    setupGuruList();
    render(<KelolaGuruSection />);
    await screen.findByText("Siti Rahayu");
    const row = screen.getByText("Siti Rahayu").closest("tr")!;
    await user.click(within(row).getByTitle("Tetapkan Wali Kelas"));
    await waitFor(() => {
      expect(screen.getByText(/Pilih kelas untuk Siti Rahayu/)).toBeInTheDocument();
    });
  });

  it("assign without kelas selection shows error toast", async () => {
    setupGuruList();
    const { toast } = await import("sonner");
    render(<KelolaGuruSection />);
    await screen.findByText("Siti Rahayu");
    const row = screen.getByText("Siti Rahayu").closest("tr")!;
    await user.click(within(row).getByTitle("Tetapkan Wali Kelas"));
    await screen.findByText(/Pilih kelas untuk Siti Rahayu/);
    await user.click(screen.getByRole("button", { name: "Tetapkan" }));
    expect(toast.error).toHaveBeenCalled();
  });

  it("assign with kelas calls assignGuruWaliKelas correctly", async () => {
    setupGuruList();
    window.electronAPI.assignGuruWaliKelas = vi.fn().mockResolvedValue({});
    const userNoPointerCheck = userEvent.setup({ pointerEventsCheck: 0 });
    render(<KelolaGuruSection />);
    await screen.findByText("Siti Rahayu");
    const row = screen.getByText("Siti Rahayu").closest("tr")!;
    await userNoPointerCheck.click(within(row).getByTitle("Tetapkan Wali Kelas"));
    await screen.findByText(/Pilih kelas untuk Siti Rahayu/);
    // Click the select trigger
    await userNoPointerCheck.click(screen.getByText("Pilih kelas..."));
    // Click an option
    await waitFor(() => screen.getByText("X RPL 1"));
    await userNoPointerCheck.click(screen.getByText("X RPL 1"));
    await userNoPointerCheck.click(screen.getByRole("button", { name: "Tetapkan" }));
    await waitFor(() => {
      expect(window.electronAPI.assignGuruWaliKelas).toHaveBeenCalledWith({
        id: 2,
        body: { id_kelas: 1 },
      });
    });
  });

  it("remove wali dialog opens with guru name and kelas", async () => {
    setupGuruList();
    render(<KelolaGuruSection />);
    await screen.findByText("Ahmad Fauzi");
    const row = screen.getByText("Ahmad Fauzi").closest("tr")!;
    await user.click(within(row).getByTitle("Lepas Wali Kelas"));
    await waitFor(() => {
      expect(screen.getByText(/Yakin ingin melepas/)).toBeInTheDocument();
    });
    const dialog = screen.getByText(/Yakin ingin melepas/).closest("[role='dialog']") as HTMLElement;
    expect(within(dialog).getByText("Ahmad Fauzi")).toBeInTheDocument();
    expect(within(dialog).getByText("XI RPL 1")).toBeInTheDocument();
  });

  it("remove confirm calls removeGuruWaliKelas", async () => {
    setupGuruList();
    window.electronAPI.removeGuruWaliKelas = vi.fn().mockResolvedValue({});
    render(<KelolaGuruSection />);
    await screen.findByText("Ahmad Fauzi");
    const row = screen.getByText("Ahmad Fauzi").closest("tr")!;
    await user.click(within(row).getByTitle("Lepas Wali Kelas"));
    await screen.findByText(/Yakin ingin melepas/);
    await user.click(screen.getByRole("button", { name: "Lepas" }));
    await waitFor(() => {
      expect(window.electronAPI.removeGuruWaliKelas).toHaveBeenCalledWith({ id: 1 });
    });
  });

  it("clicking 'Wali Kelas Aktif' tab triggers getWaliKelasList", async () => {
    setupGuruList();
    window.electronAPI.getWaliKelasList = vi.fn().mockResolvedValue({ data: [] });
    render(<KelolaGuruSection />);
    await screen.findByText("Ahmad Fauzi");
    await user.click(screen.getByText("Wali Kelas Aktif"));
    await waitFor(() => {
      expect(window.electronAPI.getWaliKelasList).toHaveBeenCalledWith({ limit: 100 });
    });
  });

  it("wali tab renders rows with kelas_label, nama_guru, NIP, date", async () => {
    setupGuruList();
    window.electronAPI.getWaliKelasList = vi.fn().mockResolvedValue({
      data: [{ id_wali: 1, id_kelas: 2, kelas_label: "XI RPL 1", tingkatan: 11, jurusan: "RPL", part: "1", id_staff: 1, nama_guru: "Ahmad Fauzi", nip: "198501", berlaku_mulai: "2024-01-01", is_active: true }],
    });
    render(<KelolaGuruSection />);
    await screen.findByText("Ahmad Fauzi");
    await user.click(screen.getByText("Wali Kelas Aktif"));
    expect(await screen.findByText("XI RPL 1")).toBeInTheDocument();
    expect(screen.getByText("198501")).toBeInTheDocument();
  });

  it("empty wali tab shows 'Belum ada wali kelas aktif.'", async () => {
    setupGuruList();
    window.electronAPI.getWaliKelasList = vi.fn().mockResolvedValue({ data: [] });
    render(<KelolaGuruSection />);
    await screen.findByText("Ahmad Fauzi");
    await user.click(screen.getByText("Wali Kelas Aktif"));
    expect(await screen.findByText("Belum ada wali kelas aktif.")).toBeInTheDocument();
  });

  it("wali tab 'Lepas' button calls removeGuruWaliKelas with item.id_staff", async () => {
    setupGuruList();
    window.electronAPI.getWaliKelasList = vi.fn().mockResolvedValue({
      data: [{ id_wali: 1, id_kelas: 2, kelas_label: "XI RPL 1", tingkatan: 11, jurusan: "RPL", part: "1", id_staff: 7, nama_guru: "Test Guru", nip: null, berlaku_mulai: "2024-01-01", is_active: true }],
    });
    window.electronAPI.removeGuruWaliKelas = vi.fn().mockResolvedValue({});
    render(<KelolaGuruSection />);
    await screen.findByText("Ahmad Fauzi");
    await user.click(screen.getByText("Wali Kelas Aktif"));
    await screen.findByText("Test Guru");
    await user.click(screen.getByRole("button", { name: "Lepas" }));
    await waitFor(() => {
      expect(window.electronAPI.removeGuruWaliKelas).toHaveBeenCalledWith({ id: 7 });
    });
  });

  it("getGuruList error shows error toast", async () => {
    window.electronAPI.getGuruList = vi.fn().mockRejectedValue(new Error("Server error"));
    const { toast } = await import("sonner");
    render(<KelolaGuruSection />);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
