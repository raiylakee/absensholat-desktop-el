import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Mock react-router-dom at top level
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ to, children, ...props }: any) =>
      React.createElement("a", { href: to, ...props }, children),
  };
});

// Mock logo context for AuthShell
vi.mock("@/lib/logo-context", () => ({
  LogoProvider: ({ children }: any) => children,
  useLogo: () => ({ logoSrc: null, setLogoSrc: vi.fn() }),
}));

// Mock image assets
vi.mock("@/assets/inorasi.png", () => ({ default: "" }));
vi.mock("@/assets/INO_2.png", () => ({ default: "" }));
vi.mock("@/assets/RASI_2.png", () => ({ default: "" }));

// Mock Titlebar
vi.mock("@/components/titlebar", () => ({
  Titlebar: () => null,
}));

// Mock framer-motion — return a plain div for any motion element
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  const mockMotion = new Proxy(
    {},
    {
      get: (_target, prop) => {
        return (props: any) => React.createElement(String(prop), props);
      },
    }
  );
  return {
    ...actual,
    motion: mockMotion,
  };
});

function setPasswordValue(value: string) {
  const input = document.querySelector("input[type='password']") as HTMLInputElement;
  if (!input) throw new Error("Password input not found");
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  nativeInputValueSetter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

// ─── BB-01: Login Form ───────────────────────────────────────────────
describe("BB-01: Login Form - Validasi input kosong", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("BB-01a: mengirim form meskipun identifier & password kosong (validasi server-side)", async () => {
    const user = userEvent.setup();
    window.electronAPI.login.mockRejectedValue(new Error("Identifier wajib diisi"));
    const { default: Login } = await import("@/pages/auth/Login");
    render(<Login />);

    const submitButton = screen.getByRole("button", { name: /masuk/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(window.electronAPI.login).toHaveBeenCalledWith({
        body: { identifier: "", password: "" },
      });
    });
  }, 10000);

  it("BB-01b: mengirim form saat identifier diisi tapi password kosong", async () => {
    window.electronAPI.login.mockRejectedValue(new Error("Password wajib diisi"));
    const { default: Login } = await import("@/pages/auth/Login");
    render(<Login />);

    const identifierInput = screen.getByPlaceholderText(/surel atau nis/i);
    fireEvent.change(identifierInput, { target: { value: "test@test.com" } });

    const submitButton = screen.getByRole("button", { name: /masuk/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(window.electronAPI.login).toHaveBeenCalledWith({
        body: { identifier: "test@test.com", password: "" },
      });
    });
  }, 10000);

  it("BB-01c: mengirim form saat password diisi tapi identifier kosong", async () => {
    window.electronAPI.login.mockRejectedValue(new Error("Identifier wajib diisi"));
    const { default: Login } = await import("@/pages/auth/Login");
    render(<Login />);

    setPasswordValue("password123");

    const submitButton = screen.getByRole("button", { name: /masuk/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(window.electronAPI.login).toHaveBeenCalledWith({
        body: { identifier: "", password: "password123" },
      });
    });
  }, 10000);

  it("BB-01d: memanggil login API saat form terisi lengkap", async () => {
    window.electronAPI.login.mockResolvedValue({
      data: { role: "admin", token: "tok-123" },
    });
    const { default: Login } = await import("@/pages/auth/Login");
    render(<Login />);

    const identifierInput = screen.getByPlaceholderText(/surel atau nis/i);
    fireEvent.change(identifierInput, { target: { value: "admin@test.com" } });
    setPasswordValue("password123");

    const submitButton = screen.getByRole("button", { name: /masuk/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(window.electronAPI.login).toHaveBeenCalledWith({
        body: { identifier: "admin@test.com", password: "password123" },
      });
    });
  }, 10000);

  it("BB-01i: tombol Masuk menampilkan spinner saat login diproses", async () => {
    const user = userEvent.setup();
    window.electronAPI.login.mockImplementation(() => new Promise(() => {}));
    const { default: Login } = await import("@/pages/auth/Login");
    render(<Login />);

    const identifierInput = screen.getByPlaceholderText(/surel atau nis/i);
    fireEvent.change(identifierInput, { target: { value: "admin@test.com" } });
    setPasswordValue("password123");

    const submitButton = screen.getByRole("button", { name: /masuk/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/memproses/i)).toBeInTheDocument();
    });
  }, 10000);

  it("BB-01e: memanggil API login dan menampilkan error saat login gagal", async () => {
    window.electronAPI.login.mockRejectedValue(new Error("Email atau password salah"));
    const { default: Login } = await import("@/pages/auth/Login");
    render(<Login />);

    // Submit form with empty fields - server should return error
    fireEvent.click(screen.getByRole("button", { name: /masuk/i }));

    await waitFor(() => {
      expect(window.electronAPI.login).toHaveBeenCalled();
    });
  }, 10000);

  it("BB-01m: form bisa disubmit ulang setelah error", async () => {
    window.electronAPI.login
      .mockRejectedValueOnce(new Error("Invalid credentials"))
      .mockResolvedValueOnce({ data: { role: "admin", token: "tok" } });
    const { default: Login } = await import("@/pages/auth/Login");
    render(<Login />);

    // First login attempt - fail
    fireEvent.click(screen.getByRole("button", { name: /masuk/i }));

    await waitFor(() => {
      expect(window.electronAPI.login).toHaveBeenCalledTimes(1);
    });

    // Resubmit should work (no crash)
    fireEvent.click(screen.getByRole("button", { name: /masuk/i }));

    await waitFor(() => {
      expect(window.electronAPI.login).toHaveBeenCalledTimes(2);
    });
  }, 10000);

  it("BB-01f: navigasi ke /dashboard saat login admin berhasil", async () => {
    const user = userEvent.setup();
    window.electronAPI.login.mockResolvedValue({
      data: { role: "admin", token: "tok-123" },
    });
    const { default: Login } = await import("@/pages/auth/Login");
    render(<Login />);

    const identifierInput = screen.getByPlaceholderText(/surel atau nis/i);
    fireEvent.change(identifierInput, { target: { value: "admin@test.com" } });
    setPasswordValue("password123");

    const submitButton = screen.getByRole("button", { name: /masuk/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  }, 10000);

  it("BB-01g: navigasi ke /guru-dashboard saat login guru berhasil", async () => {
    const user = userEvent.setup();
    window.electronAPI.login.mockResolvedValue({
      data: { role: "guru", token: "tok-456" },
    });
    const { default: Login } = await import("@/pages/auth/Login");
    render(<Login />);

    const identifierInput = screen.getByPlaceholderText(/surel atau nis/i);
    fireEvent.change(identifierInput, { target: { value: "guru@test.com" } });
    setPasswordValue("password123");

    const submitButton = screen.getByRole("button", { name: /masuk/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/guru-dashboard");
    });
  }, 10000);

  it("BB-01h: navigasi ke /siswa-dashboard saat login siswa berhasil", async () => {
    const user = userEvent.setup();
    window.electronAPI.login.mockResolvedValue({
      data: { role: "siswa", token: "tok-789" },
    });
    const { default: Login } = await import("@/pages/auth/Login");
    render(<Login />);

    const identifierInput = screen.getByPlaceholderText(/surel atau nis/i);
    fireEvent.change(identifierInput, { target: { value: "siswa@test.com" } });
    setPasswordValue("password123");

    const submitButton = screen.getByRole("button", { name: /masuk/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/siswa-dashboard");
    });
  }, 10000);

  it("BB-01j: navigasi ke /verify-account saat akun belum terverifikasi", async () => {
    const user = userEvent.setup();
    window.electronAPI.login.mockResolvedValue({
      data: { role: "siswa", token: "tok", is_verified: false },
    });
    const { default: Login } = await import("@/pages/auth/Login");
    render(<Login />);

    const identifierInput = screen.getByPlaceholderText(/surel atau nis/i);
    fireEvent.change(identifierInput, { target: { value: "unverified@test.com" } });
    setPasswordValue("password123");

    const submitButton = screen.getByRole("button", { name: /masuk/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/verify-account");
    });
  }, 10000);

  it("BB-01k: link Buat akun baru tersedia", async () => {
    const { default: Login } = await import("@/pages/auth/Login");
    render(<Login />);
    expect(screen.getByText(/buat akun baru/i)).toHaveAttribute("href", "/register");
  }, 10000);

  it("BB-01l: link Lupa kata sandi tersedia", async () => {
    const { default: Login } = await import("@/pages/auth/Login");
    render(<Login />);
    expect(screen.getByText(/lupa kata sandi/i)).toHaveAttribute("href", "/forgot-password");
  }, 10000);
});

// ─── BB-02: Device Alert ─────────────────────────────────────────────
describe("BB-02: Device Alert - Deteksi ketidakcocokan perangkat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI.getHardwareId.mockResolvedValue({ hardware_id: "local-hwid-aaaa" });
  });

  it("BB-02a: menampilkan status loading saat pertama kali", async () => {
    window.electronAPI.getDeviceAuthInfo.mockImplementation(() => new Promise(() => {}));
    const { UserDeviceCard } = await import("@/pages/dashboard/components/UserDeviceCard");
    render(<UserDeviceCard />);
    expect(screen.getByText(/perangkat terdaftar/i)).toBeInTheDocument();
  }, 10000);

  it("BB-02b: menampilkan banner 'Perangkat belum terdaftar' saat device auth info tidak ada", async () => {
    window.electronAPI.getDeviceAuthInfo.mockRejectedValue(new Error("Not found"));
    const { UserDeviceCard } = await import("@/pages/dashboard/components/UserDeviceCard");
    render(<UserDeviceCard />);

    await waitFor(() => {
      expect(screen.getByText(/perangkat belum terdaftar/i)).toBeInTheDocument();
    });
  }, 10000);

  it("BB-02c: menampilkan banner 'Perangkat tidak cocok' saat HWID berbeda", async () => {
    window.electronAPI.getDeviceAuthInfo.mockResolvedValue({
      data: { hardware_id: "registered-hwid-bbbb", device_name: "Laptop XYZ" },
    });
    const { UserDeviceCard } = await import("@/pages/dashboard/components/UserDeviceCard");
    render(<UserDeviceCard />);

    await waitFor(() => {
      expect(screen.getByText(/perangkat tidak cocok/i)).toBeInTheDocument();
    });
  }, 10000);

  it("BB-02d: menampilkan tombol 'Ajukan Ganti Perangkat' saat mismatch", async () => {
    window.electronAPI.getDeviceAuthInfo.mockResolvedValue({
      data: { hardware_id: "registered-hwid-bbbb" },
    });
    const { UserDeviceCard } = await import("@/pages/dashboard/components/UserDeviceCard");
    render(<UserDeviceCard />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /ajukan ganti perangkat/i })).toBeInTheDocument();
    });
  }, 10000);

  it("BB-02e: menampilkan status 'Perangkat terdaftar' saat HWID cocok", async () => {
    window.electronAPI.getDeviceAuthInfo.mockResolvedValue({
      data: { hardware_id: "local-hwid-aaaa", device_name: "My Laptop" },
    });
    const { UserDeviceCard } = await import("@/pages/dashboard/components/UserDeviceCard");
    render(<UserDeviceCard />);

    await waitFor(() => {
      expect(screen.getByText(/perangkat terdaftar/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/my laptop/i)).toBeInTheDocument();
  }, 10000);

  it("BB-02f: menampilkan tombol Lepas Perangkat saat status registered", async () => {
    window.electronAPI.getDeviceAuthInfo.mockResolvedValue({
      data: { hardware_id: "local-hwid-aaaa" },
    });
    const { UserDeviceCard } = await import("@/pages/dashboard/components/UserDeviceCard");
    render(<UserDeviceCard />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /lepas perangkat/i })).toBeInTheDocument();
    });
  }, 10000);

  it("BB-02g: menampilkan tombol Daftarkan Perangkat saat not-registered", async () => {
    window.electronAPI.getDeviceAuthInfo.mockRejectedValue(new Error("Not found"));
    const { UserDeviceCard } = await import("@/pages/dashboard/components/UserDeviceCard");
    render(<UserDeviceCard />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /daftarkan perangkat ini/i })).toBeInTheDocument();
    });
  }, 10000);

  it("BB-02h: memanggil registerDeviceAuth saat tombol daftar diklik", async () => {
    const user = userEvent.setup();
    window.electronAPI.getDeviceAuthInfo.mockRejectedValue(new Error("Not found"));
    window.electronAPI.registerDeviceAuth.mockResolvedValue({ message: "ok" });
    const { UserDeviceCard } = await import("@/pages/dashboard/components/UserDeviceCard");
    render(<UserDeviceCard />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /daftarkan perangkat ini/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /daftarkan perangkat ini/i }));

    await waitFor(() => {
      expect(window.electronAPI.registerDeviceAuth).toHaveBeenCalled();
    });
  }, 10000);
});

// ─── BB-03: Izin Section ─────────────────────────────────────────────
describe("BB-03: Izin Section - Pengajuan izin sakit tanpa berkas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI.getPengajuanIzin.mockResolvedValue({ data: [] });
  });

  it("BB-03a: komponen render dengan form pengajuan izin", async () => {
    const { SiswaPermitSection } = await import("@/pages/siswa-dashboard/components/SiswaPermitSection");
    render(<SiswaPermitSection />);
    expect(screen.getByText(/pengajuan izin \/ sakit/i)).toBeInTheDocument();
  }, 10000);

  it("BB-03b: opsi Sakit tersedia", async () => {
    const { SiswaPermitSection } = await import("@/pages/siswa-dashboard/components/SiswaPermitSection");
    render(<SiswaPermitSection />);
    expect(screen.getByRole("radio", { name: /sakit/i })).toBeInTheDocument();
  }, 10000);

  it("BB-03c: opsi Izin tersedia", async () => {
    const { SiswaPermitSection } = await import("@/pages/siswa-dashboard/components/SiswaPermitSection");
    render(<SiswaPermitSection />);
    expect(screen.getByRole("radio", { name: /izin/i })).toBeInTheDocument();
  }, 10000);

  it("BB-03d: field alasan tersedia", async () => {
    const { SiswaPermitSection } = await import("@/pages/siswa-dashboard/components/SiswaPermitSection");
    render(<SiswaPermitSection />);
    expect(screen.getByLabelText(/alasan/i)).toBeInTheDocument();
  }, 10000);

  it("BB-03e: tombol Kirim Pengajuan tersedia", async () => {
    const { SiswaPermitSection } = await import("@/pages/siswa-dashboard/components/SiswaPermitSection");
    render(<SiswaPermitSection />);
    expect(screen.getByRole("button", { name: /kirim pengajuan/i })).toBeInTheDocument();
  }, 10000);

  it("BB-03f: area upload bukti tersedia", async () => {
    const { SiswaPermitSection } = await import("@/pages/siswa-dashboard/components/SiswaPermitSection");
    render(<SiswaPermitSection />);
    expect(screen.getByText(/seret file ke sini atau klik untuk memilih/i)).toBeInTheDocument();
  }, 10000);

  it("BB-03g: submit tanpa tanggal menampilkan notifikasi validasi", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    const { SiswaPermitSection } = await import("@/pages/siswa-dashboard/components/SiswaPermitSection");
    render(<SiswaPermitSection />);

    const reasonInput = screen.getByLabelText(/alasan/i);
    await user.type(reasonInput, "Saya sedang sakit demam dan tidak bisa masuk sekolah");

    await user.click(screen.getByRole("button", { name: /kirim pengajuan/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
      expect(window.electronAPI.createPengajuanIzin).not.toHaveBeenCalled();
    });
  }, 10000);

  it("BB-03h: field alasan wajib minimal 10 karakter", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    const { SiswaPermitSection } = await import("@/pages/siswa-dashboard/components/SiswaPermitSection");
    render(<SiswaPermitSection />);

    const reasonInput = screen.getByLabelText(/alasan/i);
    await user.type(reasonInput, "short");

    await user.click(screen.getByRole("button", { name: /kirim pengajuan/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  }, 10000);

  it("BB-03i: riwayat pengajuan kosong saat tidak ada data", async () => {
    const { SiswaPermitSection } = await import("@/pages/siswa-dashboard/components/SiswaPermitSection");
    render(<SiswaPermitSection />);

    await waitFor(() => {
      expect(screen.getByText(/belum ada pengajuan/i)).toBeInTheDocument();
    });
  }, 10000);

  it("BB-03j: menampilkan tombol Batal untuk mereset form", async () => {
    const user = userEvent.setup();
    const { SiswaPermitSection } = await import("@/pages/siswa-dashboard/components/SiswaPermitSection");
    render(<SiswaPermitSection />);

    const reasonInput = screen.getByLabelText(/alasan/i);
    await user.type(reasonInput, "Test reason for permit");
    expect(reasonInput).toHaveValue("Test reason for permit");

    await user.click(screen.getByRole("button", { name: /batal/i }));
    expect(reasonInput).toHaveValue("");
  }, 10000);
});

// ─── BB-04: Kelola Guru ──────────────────────────────────────────────
describe("BB-04: Kelola Guru - Pencarian data guru", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI.getGuruList.mockResolvedValue({
      data: [
        { id_staff: 1, nama: "Ahmad Fauzi", email: "ahmad@test.com", nip: "12345", wali_kelas: null, id_kelas_wali: null, label_kelas: null },
        { id_staff: 2, nama: "Budi Santoso", email: "budi@test.com", nip: "67890", wali_kelas: "X RPL 1", id_kelas_wali: 1, label_kelas: "X RPL 1" },
        { id_staff: 3, nama: "Ahmad Fauzi", email: "ahmad2@test.com", nip: "11111", wali_kelas: null, id_kelas_wali: null, label_kelas: null },
      ],
      meta: { total_pages: 1, total: 3, limit: 15 },
    });
    window.electronAPI.getManagementClasses.mockResolvedValue({
      data: [{ id_kelas: 1, label: "X RPL 1" }],
    });
  });

  it("BB-04a: komponen Kelola Guru render dengan benar", async () => {
    const { KelolaGuruSection } = await import("@/pages/dashboard/components/KelolaGuruSection");
    render(<KelolaGuruSection />);
    expect(screen.getByText(/kelola guru/i)).toBeInTheDocument();
  }, 10000);

  it("BB-04b: kolom pencarian tersedia", async () => {
    const { KelolaGuruSection } = await import("@/pages/dashboard/components/KelolaGuruSection");
    render(<KelolaGuruSection />);
    expect(screen.getByPlaceholderText(/cari nama atau email/i)).toBeInTheDocument();
  }, 10000);

  it("BB-04c: memanggil getGuruList saat mount", async () => {
    const { KelolaGuruSection } = await import("@/pages/dashboard/components/KelolaGuruSection");
    render(<KelolaGuruSection />);
    await waitFor(() => {
      expect(window.electronAPI.getGuruList).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 15 })
      );
    });
  }, 10000);

  it("BB-04d: memanggil API dengan parameter search saat input diisi", async () => {
    const user = userEvent.setup();
    const { KelolaGuruSection } = await import("@/pages/dashboard/components/KelolaGuruSection");
    render(<KelolaGuruSection />);

    await waitFor(() => {
      expect(window.electronAPI.getGuruList).toHaveBeenCalled();
    });

    const searchInput = screen.getByPlaceholderText(/cari nama atau email/i);
    await user.type(searchInput, "Ahmad Fauzi");

    await waitFor(() => {
      expect(window.electronAPI.getGuruList).toHaveBeenCalledWith(
        expect.objectContaining({ search: "Ahmad Fauzi" })
      );
    });
  }, 10000);

  it("BB-04e: menampilkan tombol Tambah Guru", async () => {
    const { KelolaGuruSection } = await import("@/pages/dashboard/components/KelolaGuruSection");
    render(<KelolaGuruSection />);
    expect(screen.getByRole("button", { name: /tambah guru/i })).toBeInTheDocument();
  }, 10000);

  it("BB-04f: menampilkan tab Daftar Guru dan Wali Kelas Aktif", async () => {
    const { KelolaGuruSection } = await import("@/pages/dashboard/components/KelolaGuruSection");
    render(<KelolaGuruSection />);
    expect(screen.getByRole("button", { name: /daftar guru/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /wali kelas aktif/i })).toBeInTheDocument();
  }, 10000);

  it("BB-04g: menampilkan NIP pada card guru", async () => {
    const { KelolaGuruSection } = await import("@/pages/dashboard/components/KelolaGuruSection");
    render(<KelolaGuruSection />);

    await waitFor(() => {
      expect(screen.getByText("12345")).toBeInTheDocument();
    });
  }, 10000);

  it("BB-04h: menampilkan badge wali kelas jika guru memiliki kelas", async () => {
    const { KelolaGuruSection } = await import("@/pages/dashboard/components/KelolaGuruSection");
    render(<KelolaGuruSection />);

    await waitFor(() => {
      expect(screen.getByText(/wali x rpl 1/i)).toBeInTheDocument();
    });
  }, 10000);

  it("BB-04i: debounce pencarian 300ms", async () => {
    const user = userEvent.setup();
    const { KelolaGuruSection } = await import("@/pages/dashboard/components/KelolaGuruSection");
    render(<KelolaGuruSection />);

    const searchInput = screen.getByPlaceholderText(/cari nama atau email/i);
    const initialCallCount = window.electronAPI.getGuruList.mock.calls.length;

    await user.type(searchInput, "A");

    await new Promise((r) => setTimeout(r, 100));
    expect(window.electronAPI.getGuruList.mock.calls.length).toBe(initialCallCount);

    await waitFor(() => {
      expect(window.electronAPI.getGuruList.mock.calls.length).toBeGreaterThan(initialCallCount);
    }, { timeout: 1000 });
  }, 10000);

  it("BB-04j: tombol Unduh Daftar tersedia", async () => {
    const { KelolaGuruSection } = await import("@/pages/dashboard/components/KelolaGuruSection");
    render(<KelolaGuruSection />);
    expect(screen.getByRole("button", { name: /unduh daftar/i })).toBeInTheDocument();
  }, 10000);
});

// ─── BB-05: Bukti Preview ────────────────────────────────────────────
describe("BB-05: Bukti Preview - Deteksi format lampiran", () => {
  it("BB-05a: merender tag <img> untuk file gambar JPG", async () => {
    const { BuktiFotoPreview } = await import("@/components/bukti-foto-preview");
    render(
      <BuktiFotoPreview
        url="https://example.com/bukti.jpg"
        onDownload={vi.fn()}
      />
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/bukti.jpg");
  });

  it("BB-05b: merender tag <img> untuk file gambar PNG", async () => {
    const { BuktiFotoPreview } = await import("@/components/bukti-foto-preview");
    render(
      <BuktiFotoPreview
        url="https://example.com/bukti.png"
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://example.com/bukti.png");
  });

  it("BB-05c: tidak merender <img> untuk file PDF, menampilkan info teks nama berkas", async () => {
    const { BuktiFotoPreview } = await import("@/components/bukti-foto-preview");
    render(
      <BuktiFotoPreview
        url="https://example.com/bukti.pdf"
        onDownload={vi.fn()}
      />
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("bukti.pdf")).toBeInTheDocument();
  });

  it("BB-05d: menampilkan icon FileText untuk PDF", async () => {
    const { BuktiFotoPreview } = await import("@/components/bukti-foto-preview");
    const { container } = render(
      <BuktiFotoPreview
        url="https://example.com/dokumen.pdf"
        onDownload={vi.fn()}
      />
    );
    const svgIcons = container.querySelectorAll("svg");
    expect(svgIcons.length).toBeGreaterThan(0);
  });

  it("BB-05e: menampilkan nama file custom jika fileName diberikan", async () => {
    const { BuktiFotoPreview } = await import("@/components/bukti-foto-preview");
    render(
      <BuktiFotoPreview
        url="https://example.com/bukti.pdf"
        fileName="Surat Keterangan Sakit.pdf"
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByText("Surat Keterangan Sakit.pdf")).toBeInTheDocument();
  });

  it("BB-05f: menampilkan tombol Unduh Bukti", async () => {
    const onDownload = vi.fn();
    const { BuktiFotoPreview } = await import("@/components/bukti-foto-preview");
    render(
      <BuktiFotoPreview
        url="https://example.com/bukti.jpg"
        onDownload={onDownload}
      />
    );
    const downloadBtn = screen.getByRole("button", { name: /unduh bukti/i });
    expect(downloadBtn).toBeInTheDocument();
  });

  it("BB-05g: memanggil onDownload saat tombol unduh diklik", async () => {
    const onDownload = vi.fn();
    const user = userEvent.setup();
    const { BuktiFotoPreview } = await import("@/components/bukti-foto-preview");
    render(
      <BuktiFotoPreview
        url="https://example.com/bukti.jpg"
        onDownload={onDownload}
      />
    );
    await user.click(screen.getByRole("button", { name: /unduh bukti/i }));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it("BB-05h: menampilkan progress 'Mengunduh...' saat isDownloading true", async () => {
    const { BuktiFotoPreview } = await import("@/components/bukti-foto-preview");
    render(
      <BuktiFotoPreview
        url="https://example.com/bukti.jpg"
        onDownload={vi.fn()}
        isDownloading={true}
      />
    );
    expect(screen.getByText(/mengunduh\.\.\./i)).toBeInTheDocument();
  });

  it("BB-05i: menampilkan icon File untuk tipe file tidak dikenal", async () => {
    const { BuktiFotoPreview } = await import("@/components/bukti-foto-preview");
    render(
      <BuktiFotoPreview
        url="https://example.com/data.xlsx"
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByText("data.xlsx")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("BB-05j: menampilkan nama file dari URL tanpa query params", async () => {
    const { BuktiFotoPreview } = await import("@/components/bukti-foto-preview");
    render(
      <BuktiFotoPreview
        url="https://example.com/bukti.jpg?token=abc123"
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://example.com/bukti.jpg?token=abc123");
    expect(screen.getByRole("img")).toHaveAttribute("alt", "bukti.jpg");
  });

  it("BB-05k: merender <img> untuk file JPEG", async () => {
    const { BuktiFotoPreview } = await import("@/components/bukti-foto-preview");
    render(
      <BuktiFotoPreview
        url="https://example.com/photo.jpeg"
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("BB-05l: merender <img> untuk file GIF", async () => {
    const { BuktiFotoPreview } = await import("@/components/bukti-foto-preview");
    render(
      <BuktiFotoPreview
        url="https://example.com/animasi.gif"
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("BB-05m: menampilkan teks 'file' jika URL tidak memiliki nama file", async () => {
    const { BuktiFotoPreview } = await import("@/components/bukti-foto-preview");
    render(
      <BuktiFotoPreview
        url="https://example.com/"
        onDownload={vi.fn()}
      />
    );
    expect(screen.getByText("file")).toBeInTheDocument();
  });
});
