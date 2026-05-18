import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

// Mock electron
vi.mock("electron", () => ({
  dialog: { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() },
  app: { isPackaged: false, getPath: vi.fn(() => "/tmp/userdata") },
}));

// Mock fs (sync) - must be before handler import
vi.mock("fs", () => ({
  readFileSync: vi.fn(() => "stored-hwid-1234"),
  writeFileSync: vi.fn(),
}));

// Mock fs/promises
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

// Mock os
vi.mock("os", () => ({ homedir: () => "/tmp" }));

// Mock cache
vi.mock("../cache.js", () => ({
  default: { init: vi.fn(), get: vi.fn(() => null), set: vi.fn(), invalidate: vi.fn() },
}));

let handlers = {};
let mockFetch;

beforeAll(async () => {
  // Set up global fetch mock
  mockFetch = vi.fn();
  global.fetch = mockFetch;

  // Import and register handlers
  const mockIpcMain = { handle: (name, fn) => { handlers[name] = fn; } };
  const { register } = await import("../handlers/index.js");
  register(mockIpcMain);
});

const mockEvent = {};

function mockFetchOk(data) {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(data),
    arrayBuffer: async () => new ArrayBuffer(0),
  });
}

function mockFetchError(status, message) {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    text: async () => JSON.stringify({ message }),
    arrayBuffer: async () => new ArrayBuffer(0),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset fetch
  mockFetch.mockReset();
  // Reset cache mock
  const cache = require("../cache.js").default;
  cache.get.mockReturnValue(null);
});

describe("electron handlers", () => {
  describe("X-Hardware-ID header", () => {
    it("includes X-Hardware-ID in API requests", async () => {
      mockFetchOk({ data: [], meta: {} });
      await handlers["get-guru-list"](mockEvent, { page: 1, limit: 15 });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ "X-Hardware-ID": "stored-hwid-1234" }),
        })
      );
    });
  });

  describe("login handler", () => {
    it("calls POST /auth/sessions then POST /device-auth/register, swallows 409", async () => {
      // First call: login success
      mockFetch
        .mockResolvedValueOnce({
          ok: true, status: 200,
          text: async () => JSON.stringify({ data: { token: "tok-123", role: "admin" } }),
          arrayBuffer: async () => new ArrayBuffer(0),
        })
        // Second call: device register 409
        .mockResolvedValueOnce({
          ok: false, status: 409,
          text: async () => JSON.stringify({ message: "already registered" }),
          arrayBuffer: async () => new ArrayBuffer(0),
        });

      const result = await handlers["login"](mockEvent, { body: { email: "a@b.com", password: "pass" } });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v2/auth/sessions"),
        expect.objectContaining({ method: "POST" })
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v2/device-auth/register"),
        expect.objectContaining({ method: "POST" })
      );
      expect(result.data.token).toBe("tok-123");
    });
  });

  describe("get-guru-list", () => {
    it("calls GET with correct URL and query params", async () => {
      mockFetchOk({ data: [], meta: {} });
      await handlers["get-guru-list"](mockEvent, { page: 1, limit: 15, search: "Ali" });
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("/api/v2/admin/management/guru");
      expect(url).toContain("page=1");
      expect(url).toContain("limit=15");
      expect(url).toContain("search=Ali");
      expect(mockFetch.mock.calls[0][1].method).toBe("GET");
    });
  });

  describe("create-guru", () => {
    it("calls POST /api/v2/admin/management/guru with correct body", async () => {
      mockFetchOk({ message: "ok" });
      await handlers["create-guru"](mockEvent, { body: { nama: "Test", email: "t@t.com", password: "Pass123" } });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v2/admin/management/guru"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ nama: "Test", email: "t@t.com", password: "Pass123" }),
        })
      );
    });

    it("invalidates cache after mutation", async () => {
      mockFetchOk({ message: "ok" });
      const cache = require("../cache.js").default;
      await handlers["create-guru"](mockEvent, { body: { nama: "Test", email: "t@t.com", password: "Pass123" } });
      expect(cache.invalidate).toHaveBeenCalled();
    });
  });

  describe("update-guru", () => {
    it("calls PUT /api/v2/admin/management/guru/42", async () => {
      mockFetchOk({ message: "ok" });
      await handlers["update-guru"](mockEvent, { id: 42, body: { nama: "Updated" } });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v2/admin/management/guru/42"),
        expect.objectContaining({ method: "PUT" })
      );
    });
  });

  describe("delete-guru", () => {
    it("calls DELETE /api/v2/admin/management/guru/42", async () => {
      mockFetchOk({ message: "ok" });
      await handlers["delete-guru"](mockEvent, { id: 42 });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v2/admin/management/guru/42"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("assign-guru-wali-kelas", () => {
    it("calls PUT /api/v2/admin/management/guru/42/wali-kelas with body", async () => {
      mockFetchOk({ message: "ok" });
      await handlers["assign-guru-wali-kelas"](mockEvent, { id: 42, body: { id_kelas: 1 } });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v2/admin/management/guru/42/wali-kelas"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ id_kelas: 1 }),
        })
      );
    });
  });

  describe("remove-guru-wali-kelas", () => {
    it("calls DELETE /api/v2/admin/management/guru/42/wali-kelas", async () => {
      mockFetchOk({ message: "ok" });
      await handlers["remove-guru-wali-kelas"](mockEvent, { id: 42 });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v2/admin/management/guru/42/wali-kelas"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("get-wali-kelas-list", () => {
    it("calls GET /api/v2/admin/management/wali-kelas?limit=100", async () => {
      mockFetchOk({ data: [] });
      await handlers["get-wali-kelas-list"](mockEvent, { limit: 100 });
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("/api/v2/admin/management/wali-kelas");
      expect(url).toContain("limit=100");
    });
  });

  describe("get-hardware-id", () => {
    it("returns hardware_id without calling fetch", async () => {
      const result = await handlers["get-hardware-id"](mockEvent, {});
      expect(result).toEqual({ hardware_id: "stored-hwid-1234" });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("register-device-auth", () => {
    it("calls POST /api/v2/device-auth/register with hardware_id", async () => {
      mockFetchOk({ message: "ok" });
      await handlers["register-device-auth"](mockEvent, {});
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v2/device-auth/register"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("stored-hwid-1234"),
        })
      );
    });
  });

  describe("get-device-auth-info", () => {
    it("calls GET /api/v2/device-auth/info", async () => {
      mockFetchOk({ data: { hardware_id: "hw" } });
      await handlers["get-device-auth-info"](mockEvent, {});
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v2/device-auth/info"),
        expect.objectContaining({ method: "GET" })
      );
    });
  });

  describe("logout handler", () => {
    it("clears authToken (subsequent requests have no Authorization)", async () => {
      // First set a token via login
      mockFetch
        .mockResolvedValueOnce({
          ok: true, status: 200,
          text: async () => JSON.stringify({ data: { token: "my-token" } }),
          arrayBuffer: async () => new ArrayBuffer(0),
        })
        .mockResolvedValueOnce({
          ok: true, status: 200,
          text: async () => JSON.stringify({}),
          arrayBuffer: async () => new ArrayBuffer(0),
        });
      await handlers["login"](mockEvent, { body: { email: "a@b.com", password: "p" } });

      // Now logout
      mockFetch.mockResolvedValue({
        ok: true, status: 200,
        text: async () => JSON.stringify({}),
        arrayBuffer: async () => new ArrayBuffer(0),
      });
      await handlers["logout"](mockEvent, {});

      // Next request should not have Authorization
      mockFetchOk({ data: [] });
      await handlers["get-guru-list"](mockEvent, { page: 1 });
      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      expect(lastCall[1].headers.Authorization).toBeUndefined();
    });
  });

  describe("handler error propagation", () => {
    it("throws Error with message from API", async () => {
      mockFetchError(400, "Nama sudah ada");
      await expect(
        handlers["create-guru"](mockEvent, { body: { nama: "X", email: "x@x.com", password: "p" } })
      ).rejects.toThrow("Nama sudah ada");
    });
  });

  describe("cache invalidation", () => {
    it("after create-guru: invalidates guru and wali-kelas patterns", async () => {
      mockFetchOk({ message: "ok" });
      const cache = require("../cache.js").default;
      await handlers["create-guru"](mockEvent, { body: { nama: "T", email: "t@t.com", password: "p" } });
      const invalidatedPatterns = cache.invalidate.mock.calls.map(c => c[0]);
      expect(invalidatedPatterns.some(p => p.includes("/admin/management/guru"))).toBe(true);
      expect(invalidatedPatterns.some(p => p.includes("/admin/management/wali-kelas"))).toBe(true);
    });
  });
});
