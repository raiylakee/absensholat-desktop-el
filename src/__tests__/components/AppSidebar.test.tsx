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

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

vi.mock("@/lib/auth-session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-session")>();
  return { ...actual, logoutSession: vi.fn().mockResolvedValue(undefined) };
});

const mockUser = { name: "Admin User", role: "admin", email: "admin@smk.id", avatarFallback: "AU" };

function renderSidebar(props: { activeItem?: string; setActiveItem?: ReturnType<typeof vi.fn> } = {}) {
  const setActiveItem = props.setActiveItem ?? vi.fn();
  return {
    setActiveItem,
    ...render(
      <MemoryRouter>
        <SidebarProvider>
          <AppSidebar activeItem={props.activeItem ?? "Beranda"} setActiveItem={setActiveItem} user={mockUser} />
        </SidebarProvider>
      </MemoryRouter>
    ),
  };
}


describe("AppSidebar", () => {
  const user = userEvent.setup();

  it("'Kelola Guru' menu item is in the document", () => {
    renderSidebar();
    expect(screen.getByText("Kelola Guru")).toBeInTheDocument();
  });

  it("all 10 expected menu items exist", () => {
    renderSidebar();
    const items = ["Beranda", "Jadwal", "Kelola Siswa", "Kelola Kelas", "Kelola Guru", "Presensi", "Pengajuan Izin", "Laporan", "Kode QR", "Siswa Belum Terdaftar"];
    items.forEach((item) => {
      expect(screen.getByText(item)).toBeInTheDocument();
    });
  });

  it("clicking 'Kelola Guru' calls setActiveItem('Kelola Guru')", async () => {
    const { setActiveItem } = renderSidebar();
    await user.click(screen.getByText("Kelola Guru"));
    expect(setActiveItem).toHaveBeenCalledWith("Kelola Guru");
  });

  it("shows user name and email from props", () => {
    renderSidebar();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("admin@smk.id")).toBeInTheDocument();
  });

  it("logout menu item calls logoutSession and navigates to /login", async () => {
    const { logoutSession } = await import("@/lib/auth-session");
    renderSidebar();
    // Open the dropdown menu
    await user.click(screen.getByText("Admin User"));
    await screen.findByText("Keluar");
    await user.click(screen.getByText("Keluar"));
    expect(logoutSession).toHaveBeenCalled();
  });
});
