import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { createRequire } from "module";

// ─── Mocks (same pattern as existing handlers.test.js) ───────────────
const { mockNotificationShow, mockNotificationConstructor } = vi.hoisted(() => ({
  mockNotificationShow: vi.fn(),
  mockNotificationConstructor: vi.fn(),
}));

class MockNotification {
  constructor(options) {
    mockNotificationConstructor(options);
    this.options = options;
  }
  show() {
    mockNotificationShow(this.options);
  }
}

const req = createRequire(import.meta.url);
try {
  const electronPath = req.resolve("electron");
  req.cache[electronPath] = {
    id: electronPath, filename: electronPath, loaded: true,
    exports: {
      dialog: { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() },
      app: { isPackaged: false, getPath: vi.fn(() => "/tmp/userdata") },
      Notification: MockNotification,
    },
  };
} catch {}

try {
  const cachePath = req.resolve("../cache.js");
  const mockCache = {
    init: vi.fn(),
    get: vi.fn(() => null),
    set: vi.fn(),
    invalidate: vi.fn(),
    clear: vi.fn(),
  };
  mockCache.default = mockCache;
  req.cache[cachePath] = { id: cachePath, filename: cachePath, loaded: true, exports: mockCache };
} catch {}

try {
  const fsPath = req.resolve("fs");
  req.cache[fsPath] = {
    id: fsPath, filename: fsPath, loaded: true,
    exports: { readFileSync: vi.fn(() => "stored-hwid-1234"), writeFileSync: vi.fn() },
  };
} catch {}

vi.mock("electron", () => ({
  dialog: { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() },
  app: { isPackaged: false, getPath: vi.fn(() => "/tmp/userdata") },
  Notification: MockNotification,
}));

const { mockCheckForUpdates, mockQuitAndInstall } = vi.hoisted(() => ({
  mockCheckForUpdates: vi.fn(() => Promise.resolve({ versionInfo: { version: "1.3.0" } })),
  mockQuitAndInstall: vi.fn(),
}));

try {
  const updaterPath = req.resolve("electron-updater");
  req.cache[updaterPath] = {
    id: updaterPath, filename: updaterPath, loaded: true,
    exports: {
      autoUpdater: {
        checkForUpdates: () => mockCheckForUpdates(),
        quitAndInstall: () => mockQuitAndInstall(),
        on: vi.fn(),
      },
    },
  };
} catch {}

vi.mock("electron-updater", () => ({
  autoUpdater: {
    checkForUpdates: () => mockCheckForUpdates(),
    quitAndInstall: () => mockQuitAndInstall(),
    on: vi.fn(),
  },
}));

vi.mock("fs", () => ({
  readFileSync: vi.fn(() => "stored-hwid-1234"),
  writeFileSync: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("os", () => ({ homedir: () => "/tmp" }));

vi.mock("../cache.js", () => ({
  default: { init: vi.fn(), get: vi.fn(() => null), set: vi.fn(), invalidate: vi.fn(), clear: vi.fn() },
}));

let handlers = {};
let mockFetch;

beforeAll(async () => {
  mockFetch = vi.fn();
  global.fetch = mockFetch;
  const mockIpcMain = { handle: (name, fn) => { handlers[name] = fn; } };
  const { register } = await import("../handlers/index.js");
  register(mockIpcMain);
});

const mockEvent = {};

function mockFetchOk(data) {
  mockFetch.mockResolvedValue({
    ok: true, status: 200,
    text: async () => JSON.stringify(data),
    arrayBuffer: async () => new ArrayBuffer(0),
  });
}

function mockFetchError(status, message) {
  mockFetch.mockResolvedValue({
    ok: false, status,
    text: async () => JSON.stringify({ message }),
    arrayBuffer: async () => new ArrayBuffer(0),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
  const cache = require("../cache.js").default;
  cache.get.mockReturnValue(null);
});

// ─── WB-01: X-Hardware-ID Header ─────────────────────────────────────
describe("WB-01: X-Hardware-ID header selalu disisipkan", () => {
  it("WB-01a: header disertakan pada request GET (getGuruList)", async () => {
    mockFetchOk({ data: [], meta: {} });
    await handlers["get-guru-list"](mockEvent, { page: 1, limit: 15 });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Hardware-ID": "stored-hwid-1234" }),
      })
    );
  });

  it("WB-01b: header disertakan pada request POST (create-guru)", async () => {
    mockFetchOk({ message: "ok" });
    await handlers["create-guru"](mockEvent, { body: { nama: "Test", email: "t@t.com", password: "Pass123" } });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Hardware-ID": "stored-hwid-1234" }),
      })
    );
  });

  it("WB-01c: header disertakan pada request DELETE (delete-guru)", async () => {
    mockFetchOk({ message: "ok" });
    await handlers["delete-guru"](mockEvent, { id: 42 });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Hardware-ID": "stored-hwid-1234" }),
      })
    );
  });

  it("WB-01d: header disertakan pada request PUT (update-guru)", async () => {
    mockFetchOk({ message: "ok" });
    await handlers["update-guru"](mockEvent, { id: 42, body: { nama: "Updated" } });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Hardware-ID": "stored-hwid-1234" }),
      })
    );
  });

  it("WB-01e: header disertakan pada request PATCH (update-izin-status)", async () => {
    mockFetchOk({ message: "ok" });
    await handlers["update-izin-status"](mockEvent, { id: 1, body: { status: "disetujui" } });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Hardware-ID": "stored-hwid-1234" }),
      })
    );
  });
});

// ─── WB-02: Login Swallowing 409 ─────────────────────────────────────
describe("WB-02: Penanganan 409 pada auto-registrasi device", () => {
  it("WB-02a: login berhasil meskipun device register mengembalikan 409", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({ data: { token: "tok-123", role: "admin" } }),
        arrayBuffer: async () => new ArrayBuffer(0),
      })
      .mockResolvedValueOnce({
        ok: false, status: 409,
        text: async () => JSON.stringify({ message: "Already Registered" }),
        arrayBuffer: async () => new ArrayBuffer(0),
      });

    const result = await handlers["login"](mockEvent, { body: { email: "a@b.com", password: "pass" } });
    expect(result.data.token).toBe("tok-123");
  });

  it("WB-02b: login berhasil meskipun device register error mengandung 'already'", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({ data: { token: "tok-456", role: "guru" } }),
        arrayBuffer: async () => new ArrayBuffer(0),
      })
      .mockResolvedValueOnce({
        ok: false, status: 409,
        text: async () => JSON.stringify({ message: "device already registered" }),
        arrayBuffer: async () => new ArrayBuffer(0),
      });

    const result = await handlers["login"](mockEvent, { body: { email: "b@b.com", password: "pass" } });
    expect(result.data.token).toBe("tok-456");
  });

  it("WB-02c: login tetap lanjut meskipun device register mengembalikan error 409", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({ data: { token: "tok-789", role: "siswa" } }),
        arrayBuffer: async () => new ArrayBuffer(0),
      })
      .mockResolvedValueOnce({
        ok: false, status: 409,
        text: async () => JSON.stringify({ error: "409 Conflict" }),
        arrayBuffer: async () => new ArrayBuffer(0),
      });

    const result = await handlers["login"](mockEvent, { body: { email: "c@b.com", password: "pass" } });
    expect(result.data).toBeDefined();
    expect(result.data.token).toBeDefined();
  });
});

// ─── WB-03: api-utils normalizeStudent ────────────────────────────────
describe("WB-03: normalizeStudent - pembersihan data mentah API", () => {
  it("WB-03a: menghasilkan objek datar dari data nested snake_case", async () => {
    const { normalizeStudent } = await import("../../src/lib/api-utils");
    const input = {
      nis: "2401001",
      nama_siswa: "Ahmad Budi",
      nama_jurusan: "RPL",
      kelas: "XI RPL 1",
      jk: "L",
      id_jurusan: 1,
      id_kelas: 5,
      id_tahun_masuk: 2024,
    };
    const result = normalizeStudent(input);
    expect(result).toEqual(expect.objectContaining({
      nis: "2401001",
      nama: "Ahmad Budi",
      jurusan: "RPL",
      kelas: "XI RPL 1",
      jenisKelamin: "Laki-laki",
      id_jurusan: 1,
      id_kelas: 5,
      id_tahun_masuk: 2024,
    }));
    // Verify flat structure (no nested properties)
    expect(typeof result.nis).toBe("string");
    expect(typeof result.nama).toBe("string");
    expect(typeof result.jurusan).toBe("string");
    expect(typeof result.kelas).toBe("string");
  });

  it("WB-03b: menghasilkan objek datar dari data nested PascalCase", async () => {
    const { normalizeStudent } = await import("../../src/lib/api-utils");
    const input = {
      NIS: "2401002",
      Nama: "Budi Cahyono",
      Jurusan: "TKJ",
      Kelas: "X TKJ 2",
      jk: "P",
    };
    const result = normalizeStudent(input);
    expect(result).toEqual(expect.objectContaining({
      nis: "2401002",
      nama: "Budi Cahyono",
      jurusan: "TKJ",
      kelas: "X TKJ 2",
      jenisKelamin: "Perempuan",
    }));
  });

  it("WB-03c: membersihkan artefak Go fmt.Sprintf dari nama", async () => {
    const { normalizeStudent } = await import("../../src/lib/api-utils");
    const input = {
      nis: "2401003",
      nama_siswa: "Ahmad%!s(int=123) Fauzi",
    };
    const result = normalizeStudent(input);
    expect(result.nama).toBe("Ahmad Fauzi");
  });

  it("WB-03d: memperbaiki kelas malformed 'D-11' menjadi reconstructed format", async () => {
    const { normalizeStudent } = await import("../../src/lib/api-utils");
    const input = {
      nis: "2401004",
      kelas: "D-11",
      tingkatan: "XI",
      jurusan: "RPL",
    };
    const result = normalizeStudent(input);
    expect(result.kelas).toBe("XI RPL");
  });

  it("WB-03e: normalisasi gender dari 'P' menjadi 'Perempuan'", async () => {
    const { normalizeStudent } = await import("../../src/lib/api-utils");
    const input = { nis: "1", jk: "P" };
    const result = normalizeStudent(input);
    expect(result.jenisKelamin).toBe("Perempuan");
  });

  it("WB-03f: normalisasi gender dari 'L' menjadi 'Laki-laki'", async () => {
    const { normalizeStudent } = await import("../../src/lib/api-utils");
    const input = { nis: "1", jk: "L" };
    const result = normalizeStudent(input);
    expect(result.jenisKelamin).toBe("Laki-laki");
  });

  it("WB-03g: default value untuk field yang kosong", async () => {
    const { normalizeStudent } = await import("../../src/lib/api-utils");
    const input = {};
    const result = normalizeStudent(input);
    expect(result.nis).toBe("");
    expect(result.nama).toBe("");
    expect(result.jurusan).toBe("-");
    expect(result.kelas).toBe("-");
    expect(result.jenisKelamin).toBe("Laki-laki");
    expect(result.agama).toBe("Islam");
    expect(result.class_status).toBe("active");
    expect(result.status_akademik).toBe("AKTIF");
  });
});

// ─── WB-04: Cache Invalidation ────────────────────────────────────────
describe("WB-04: Pembersihan cache otomatis saat mutasi data", () => {
  it("WB-04a: create-guru menginvalidasi cache guru dan wali-kelas", async () => {
    mockFetchOk({ message: "ok" });
    const cache = require("../cache.js").default;
    await handlers["create-guru"](mockEvent, { body: { nama: "T", email: "t@t.com", password: "p" } });
    const patterns = cache.invalidate.mock.calls.map((c) => c[0]);
    expect(patterns.some((p) => p.includes("/admin/management/guru"))).toBe(true);
    expect(patterns.some((p) => p.includes("/admin/management/wali-kelas"))).toBe(true);
  });

  it("WB-04b: update-guru menginvalidasi cache", async () => {
    mockFetchOk({ message: "ok" });
    const cache = require("../cache.js").default;
    await handlers["update-guru"](mockEvent, { id: 1, body: { nama: "Updated" } });
    expect(cache.invalidate).toHaveBeenCalled();
  });

  it("WB-04c: delete-guru menginvalidasi cache", async () => {
    mockFetchOk({ message: "ok" });
    const cache = require("../cache.js").default;
    await handlers["delete-guru"](mockEvent, { id: 1 });
    expect(cache.invalidate).toHaveBeenCalled();
  });

  it("WB-04d: create-student menginvalidasi cache students dan analytics", async () => {
    mockFetchOk({ message: "ok" });
    const cache = require("../cache.js").default;
    await handlers["create-student"](mockEvent, { body: { nis: "1", nama: "Test" } });
    const patterns = cache.invalidate.mock.calls.map((c) => c[0]);
    expect(patterns.some((p) => p.includes("/students"))).toBe(true);
  });

  it("WB-04e: create-prayer-schedule menginvalidasi cache prayer-schedules", async () => {
    mockFetchOk({ message: "ok" });
    const cache = require("../cache.js").default;
    await handlers["create-prayer-schedule"](mockEvent, { body: { hari: "Senin" } });
    const patterns = cache.invalidate.mock.calls.map((c) => c[0]);
    expect(patterns.some((p) => p.includes("/prayer-schedules"))).toBe(true);
  });

  it("WB-04f: GET request menyimpan data ke cache", async () => {
    mockFetchOk({ data: [{ id: 1 }], meta: {} });
    const cache = require("../cache.js").default;
    await handlers["get-guru-list"](mockEvent, { page: 1, limit: 15 });
    expect(cache.set).toHaveBeenCalled();
  });

  it("WB-04g: cache hit mengembalikan data tanpa fetch", async () => {
    const cache = require("../cache.js").default;
    cache.get.mockReturnValue({ data: [{ cached: true }], meta: {} });
    await handlers["get-guru-list"](mockEvent, { page: 1, limit: 15 });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("WB-04h: logout membersihkan seluruh cache", async () => {
    mockFetch.mockResolvedValue({
      ok: true, status: 200,
      text: async () => JSON.stringify({}),
      arrayBuffer: async () => new ArrayBuffer(0),
    });
    const cache = require("../cache.js").default;
    await handlers["logout"](mockEvent, {});
    expect(cache.clear).toHaveBeenCalled();
  });

  it("WB-04i: login membersihkan cache sebelum auto-register device", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({ data: { token: "tok" } }),
        arrayBuffer: async () => new ArrayBuffer(0),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        text: async () => JSON.stringify({ message: "ok" }),
        arrayBuffer: async () => new ArrayBuffer(0),
      });
    const cache = require("../cache.js").default;
    await handlers["login"](mockEvent, { body: { email: "a@b.com", password: "p" } });
    expect(cache.clear).toHaveBeenCalled();
  });
});
