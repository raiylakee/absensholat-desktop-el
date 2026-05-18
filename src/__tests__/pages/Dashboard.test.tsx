import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

vi.mock("@/pages/dashboard/components/DashboardOverviewSection", () => ({
  DashboardOverviewSection: () => <div data-testid="dashboard-overview-section" />,
}));
vi.mock("@/pages/dashboard/components/KelolaGuruSection", () => ({
  KelolaGuruSection: () => <div data-testid="kelola-guru-section" />,
}));
vi.mock("@/pages/dashboard/components/KelolaKelasSection", () => ({
  KelolaKelasSection: () => <div data-testid="kelola-kelas-section" />,
}));
vi.mock("@/pages/dashboard/components/PresensiSection", () => ({
  PresensiSection: () => <div data-testid="presensi-section" />,
}));
vi.mock("@/pages/dashboard/components/ProfileSection", () => ({
  ProfileSection: () => <div data-testid="profile-section" />,
}));
vi.mock("@/pages/dashboard/components/JadwalSection", () => ({
  JadwalSection: () => <div data-testid="jadwal-section" />,
}));
vi.mock("@/pages/dashboard/components/LaporanSection", () => ({
  LaporanSection: () => <div data-testid="laporan-section" />,
}));
vi.mock("@/pages/dashboard/components/ManageSiswaSection", () => ({
  ManageSiswaSection: () => <div data-testid="manage-siswa-section" />,
}));
vi.mock("@/pages/dashboard/components/QRGeneratorSection", () => ({
  QRGeneratorSection: () => <div data-testid="qr-generator-section" />,
}));
vi.mock("@/pages/dashboard/components/UnregisteredStudentsSection", () => ({
  UnregisteredStudentsSection: () => <div data-testid="unregistered-students-section" />,
}));
vi.mock("@/pages/dashboard/components/PengajuanIzinSection", () => ({
  PengajuanIzinSection: () => <div data-testid="pengajuan-izin-section" />,
}));
vi.mock("@/pages/dashboard/components/SettingsSection", () => ({
  SettingsSection: () => <div data-testid="settings-section" />,
}));
vi.mock("@/pages/dashboard/components/PlaceholderSection", () => ({
  PlaceholderSection: ({ title }: { title: string }) => <div data-testid="placeholder-section">{title}</div>,
}));
vi.mock("@/components/app-sidebar", () => ({
  AppSidebar: ({ setActiveItem }: { activeItem: string; setActiveItem: (s: string) => void }) => (
    <div data-testid="app-sidebar">
      <button onClick={() => setActiveItem("Kelola Guru")}>Kelola Guru</button>
      <button onClick={() => setActiveItem("Kelola Kelas")}>Kelola Kelas</button>
      <button onClick={() => setActiveItem("Presensi")}>Presensi</button>
      <button onClick={() => setActiveItem("Profile")}>Profile</button>
      <button onClick={() => setActiveItem("Unknown")}>Unknown</button>
    </div>
  ),
}));
vi.mock("@/components/titlebar", () => ({ WindowControls: () => null }));
vi.mock("@/components/notification-icon", () => ({ NotificationIcon: () => null }));
vi.mock("@/components/FloatingFAQ", () => ({ FloatingFAQ: () => null }));
vi.mock("@/hooks/use-current-profile", () => ({
  useCurrentProfile: () => ({ profile: null, isLoading: false }),
}));

import Dashboard from "@/pages/Dashboard";

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

describe("Dashboard", () => {
  const user = userEvent.setup();

  it("default renders DashboardOverviewSection", () => {
    renderDashboard();
    expect(screen.getByTestId("dashboard-overview-section")).toBeInTheDocument();
  });

  it("clicking sidebar 'Kelola Guru' renders KelolaGuruSection", async () => {
    renderDashboard();
    await user.click(screen.getByText("Kelola Guru"));
    expect(screen.getByTestId("kelola-guru-section")).toBeInTheDocument();
  });

  it("clicking 'Kelola Kelas' renders KelolaKelasSection", async () => {
    renderDashboard();
    await user.click(screen.getByText("Kelola Kelas"));
    expect(screen.getByTestId("kelola-kelas-section")).toBeInTheDocument();
  });

  it("clicking 'Presensi' renders PresensiSection", async () => {
    renderDashboard();
    await user.click(screen.getByText("Presensi"));
    expect(screen.getByTestId("presensi-section")).toBeInTheDocument();
  });

  it("clicking 'Profile' renders ProfileSection", async () => {
    renderDashboard();
    await user.click(screen.getByText("Profile"));
    expect(screen.getByTestId("profile-section")).toBeInTheDocument();
  });

  it("unknown activeItem renders PlaceholderSection", async () => {
    renderDashboard();
    await user.click(screen.getByText("Unknown"));
    expect(screen.getByTestId("placeholder-section")).toBeInTheDocument();
  });
});
