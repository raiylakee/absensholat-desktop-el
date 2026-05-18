import { describe, it, expect, vi } from "vitest";
import {
  getSavedToken,
  saveAuthSession,
  clearSavedSession,
  fetchCurrentProfile,
  logoutSession,
  AUTH_TOKEN_KEY,
  AUTH_ROLE_KEY,
  AUTH_REFRESH_TOKEN_KEY,
} from "@/lib/auth-session";

describe("getSavedToken", () => {
  it("reads from localStorage", () => {
    localStorage.setItem(AUTH_TOKEN_KEY, "my-token");
    expect(getSavedToken()).toBe("my-token");
  });

  it("returns null when not set", () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    expect(getSavedToken()).toBeNull();
  });
});

describe("saveAuthSession", () => {
  it("writes token, role, refresh_token to localStorage", () => {
    saveAuthSession({ token: "t1", role: "admin", refresh_token: "rt1" });
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe("t1");
    expect(localStorage.getItem(AUTH_ROLE_KEY)).toBe("admin");
    expect(localStorage.getItem(AUTH_REFRESH_TOKEN_KEY)).toBe("rt1");
  });

  it("does not write empty values", () => {
    localStorage.clear();
    saveAuthSession({ token: "", role: "", refresh_token: "" });
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });
});

describe("clearSavedSession", () => {
  it("removes all auth keys", () => {
    localStorage.setItem(AUTH_TOKEN_KEY, "x");
    localStorage.setItem(AUTH_ROLE_KEY, "y");
    localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, "z");
    clearSavedSession();
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_ROLE_KEY)).toBeNull();
    expect(localStorage.getItem(AUTH_REFRESH_TOKEN_KEY)).toBeNull();
  });
});

describe("fetchCurrentProfile", () => {
  it("normalizes name/role/email/avatarFallback", async () => {
    window.electronAPI.getCurrentProfile = vi.fn().mockResolvedValue({
      data: { nama: "Ahmad Fauzi", role: "guru", email: "af@smk.id", nip: "123" },
    });
    const p = await fetchCurrentProfile();
    expect(p.name).toBe("Ahmad Fauzi");
    expect(p.role).toBe("guru");
    expect(p.email).toBe("af@smk.id");
    expect(p.avatarFallback).toBe("AF");
  });

  it("single word name uses first 2 chars for avatar", async () => {
    window.electronAPI.getCurrentProfile = vi.fn().mockResolvedValue({
      data: { nama: "Admin", role: "admin", email: "a@b.com" },
    });
    const p = await fetchCurrentProfile();
    expect(p.avatarFallback).toBe("AD");
  });

  it("for wali_kelas without class, tries getManagementClasses", async () => {
    window.electronAPI.getCurrentProfile = vi.fn().mockResolvedValue({
      data: { nama: "Guru", role: "wali_kelas", email: "g@s.id", id_staff: 99 },
    });
    window.electronAPI.getManagementClasses = vi.fn().mockResolvedValue({
      data: [{ id_kelas: 1, label: "X RPL 1", id_staff_wali: 99 }],
    });
    const p = await fetchCurrentProfile();
    expect(p.className).toBe("X RPL 1");
    expect(window.electronAPI.getManagementClasses).toHaveBeenCalled();
  });
});

describe("logoutSession", () => {
  it("calls logout + clearSavedSession + clearAuthToken even when logout throws", async () => {
    window.electronAPI.logout = vi.fn().mockRejectedValue(new Error("network"));
    window.electronAPI.clearAuthToken = vi.fn().mockResolvedValue(undefined);
    localStorage.setItem(AUTH_TOKEN_KEY, "tok");

    await logoutSession().catch(() => {});

    expect(window.electronAPI.logout).toHaveBeenCalled();
    expect(window.electronAPI.clearAuthToken).toHaveBeenCalled();
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });
});
