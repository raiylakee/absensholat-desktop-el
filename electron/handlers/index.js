const { dialog, Notification } = require("electron");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");
const cache = require("../cache");

const BASE_URL = process.env.API_BASE_URL || (require("electron").app.isPackaged ? "https://absensholat-api.vercel.app" : "http://localhost:3000");
let authToken = null;

// Initialize cache with userData path
try { cache.init(require("electron").app.getPath("userData")); } catch {}

function getHardwareId() {
  const configPath = path.join(os.homedir(), ".absensholat-hwid");
  try {
    return require("fs").readFileSync(configPath, "utf8").trim();
  } catch {
    const { randomUUID } = require("crypto");
    const id = randomUUID();
    try { require("fs").writeFileSync(configPath, id); } catch {}
    return id;
  }
}

const hardwareId = getHardwareId();

// --- Task 1: Timeout + Retry with exponential backoff ---
// Vercel serverless cold starts can take 5-15s, so production needs a longer timeout
const TIMEOUT_MS = require("electron").app.isPackaged ? 15000 : 5000;
const MAX_RETRIES = 3;
const BASE_DELAY = 500;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isRetryable(err, status) {
  if (err && err.name === "AbortError") return true;
  if (err && err instanceof TypeError) return true; // network error
  if (status === 429 || (status >= 500 && status < 600)) return true;
  return false;
}

async function fetchWithTimeout(url, opts) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url, opts) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, opts);
      if (!isRetryable(null, res.status) || attempt === MAX_RETRIES) return res;
      lastError = new Error(`Status ${res.status}`);
    } catch (err) {
      lastError = err;
      if (!isRetryable(err, null) || attempt === MAX_RETRIES) throw err;
    }
    await sleep(BASE_DELAY * Math.pow(2, attempt));
  }
  throw lastError;
}

// --- Cache invalidation patterns ---
const INVALIDATION_MAP = {
  "/students": ["/students", "/analytics/"],
  "/attendance": ["/analytics/", "/attendance/"],
  "/prayer-schedules": ["/prayer-schedules", "/prayer-times"],
  "/prayer-times": ["/prayer-times", "/prayer-schedules"],
  "/prayer-types": ["/prayer-types", "/prayer-times", "/prayer-schedules"],
  "/prayer-types": ["/prayer-types", "/prayer-times", "/prayer-schedules"],

  "/jurusan": ["/jurusan", "/dhuha-schedules"],
  "/pengajuan-izin": ["/pengajuan-izin"],
  "/admin/management/kelas": ["/admin/management/kelas", "/kelas", "/admin/management/guru", "/admin/management/wali-kelas"],
  "/admin/management/guru": ["/admin/management/guru", "/admin/management/wali-kelas", "/admin/management/kelas", "/lookup/staff-guru"],
  "/admin/management/wali-kelas": ["/admin/management/wali-kelas", "/admin/management/guru", "/admin/management/kelas"],
  "/admin/device-management": ["/admin/device-management"],
  "/profile/devices": ["/profile/devices"],
  "/device-auth": ["/device-auth"],
};

function invalidateRelated(endpoint) {
  for (const [pattern, targets] of Object.entries(INVALIDATION_MAP)) {
    if (endpoint.includes(pattern)) {
      targets.forEach(t => cache.invalidate(t));
      return;
    }
  }
}

async function apiRequest(method, endpoint, { body, query, raw } = {}) {
  let url = `${BASE_URL}${endpoint}`;
  if (query) {
    const params = Object.entries(query)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    if (params) url += `?${params}`;
  }

  // Task 3: Check cache for GET requests
  if (method === "GET" && !raw) {
    const cached = cache.get(url);
    if (cached) return cached;
  }

  const opts = { method, headers: {} };
  // Task 2: Enable compression
  opts.headers["Accept-Encoding"] = "gzip, deflate, br";
  // Task 7: Ensure keep-alive (default in undici, explicit header for clarity)
  opts.headers["Connection"] = "keep-alive";
  opts.headers["X-Hardware-ID"] = hardwareId;
  if (authToken) opts.headers["Authorization"] = `Bearer ${authToken}`;
  if (body && method !== "GET") {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  // Task 1: Use fetchWithRetry instead of bare fetch
  const res = await fetchWithRetry(url, opts);

  if (raw) return { status: res.status, buffer: Buffer.from(await res.arrayBuffer()) };

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!res.ok) {
    const errObj = data?.error;
    const msg = data?.message || (typeof errObj === "string" ? errObj : errObj?.message) || data?.details || `Operasi gagal (status ${res.status})`;
    throw new Error(msg);
  }

  // Task 3: Store in cache for GET requests
  if (method === "GET") cache.set(url, data);

  // Invalidate cache on mutations
  if (method !== "GET") invalidateRelated(endpoint);

  return data;
}

function parseApiError(err) {
  return err.message || "Terjadi kesalahan";
}

function handler(fn) {
  return async (_event, args) => {
    try { return await fn(args); }
    catch (err) { throw new Error(parseApiError(err)); }
  };
}

function register(ipcMain) {
  // === Auth ===
  ipcMain.handle("login", handler(async ({ body }) => {
    const data = await apiRequest("POST", "/api/v2/auth/sessions", { body });
    if (data?.data?.token) {
      authToken = data.data.token;
      // Auto-register device after login; swallow 409 (already registered)
      try {
        await apiRequest("POST", "/api/v2/device-auth/register", {
          body: { hardware_id: hardwareId },
        });
      } catch (err) {
        if (!err.message?.includes("409") && !err.message?.toLowerCase().includes("already")) {
          console.warn("Device auto-register failed:", err.message);
        }
      }
    }
    return data;
  }));

  ipcMain.handle("register", handler(async ({ body }) =>
    apiRequest("POST", "/api/v2/auth/registrations", { body })
  ));

  ipcMain.handle("set-auth-token", handler(async ({ token }) => { authToken = token; }));
  ipcMain.handle("clear-auth-token", handler(async () => { authToken = null; }));

  ipcMain.handle("get-current-profile", handler(async () =>
    apiRequest("GET", "/api/v2/auth/profile")
  ));

  ipcMain.handle("logout", handler(async () => {
    try { await apiRequest("DELETE", "/api/v2/auth/sessions/current"); } catch {}
    authToken = null;
    return { message: "Logout berhasil" };
  }));

  ipcMain.handle("forgot-password", handler(async ({ body }) =>
    apiRequest("POST", "/api/v2/auth/forgot-password", { body })
  ));

  ipcMain.handle("verify-otp", handler(async ({ body }) =>
    apiRequest("POST", "/api/v2/auth/verify-otp", { body })
  ));

  ipcMain.handle("reset-password", handler(async ({ body }) =>
    apiRequest("POST", "/api/v2/auth/reset-password", { body })
  ));

  ipcMain.handle("verify-account", handler(async ({ body }) =>
    apiRequest("POST", "/api/v2/auth/verify-account", { body })
  ));

  // === Dashboard & Statistics ===
  ipcMain.handle("get-chart-data", handler(async () =>
    apiRequest("GET", "/api/v2/analytics/charts")
  ));

  ipcMain.handle("get-attendance-statistics", handler(async () =>
    apiRequest("GET", "/api/v2/analytics/attendance")
  ));

  ipcMain.handle("get-closest-prayer-schedule", handler(async () =>
    apiRequest("GET", "/api/v2/prayer-schedules/closest")
  ));

  // Task 4: Parallelized dashboard data fetch
  ipcMain.handle("get-dashboard-data", handler(async () => {
    const [charts, attendance, closestPrayer] = await Promise.all([
      apiRequest("GET", "/api/v2/analytics/charts"),
      apiRequest("GET", "/api/v2/analytics/attendance"),
      apiRequest("GET", "/api/v2/prayer-schedules/closest"),
    ]);
    return { charts, attendance, closestPrayer };
  }));

  // === Prayer Schedules (Jadwal Sholat) ===
  ipcMain.handle("get-prayer-schedules", handler(async () =>
    apiRequest("GET", "/api/v2/prayer-schedules")
  ));

  ipcMain.handle("create-prayer-schedule", handler(async ({ body }) =>
    apiRequest("POST", "/api/v2/prayer-schedules", { body })
  ));

  ipcMain.handle("update-prayer-schedule", handler(async ({ id_jadwal, body }) =>
    apiRequest("PUT", `/api/v2/prayer-schedules/${id_jadwal}`, { body })
  ));

  ipcMain.handle("delete-prayer-schedule", handler(async ({ id_jadwal }) =>
    apiRequest("DELETE", `/api/v2/prayer-schedules/${id_jadwal}`)
  ));

  ipcMain.handle("get-prayer-times", handler(async () =>
    apiRequest("GET", "/api/v2/prayer-times")
  ));

  ipcMain.handle("get-prayer-types", handler(async () =>
    apiRequest("GET", "/api/v2/prayer-types")
  ));

  ipcMain.handle("create-prayer-type", handler(async ({ body }) =>
    apiRequest("POST", "/api/v2/prayer-types", { body })
  ));

  ipcMain.handle("create-prayer-time", handler(async ({ body }) =>
    apiRequest("POST", "/api/v2/prayer-times", { body })
  ));

  ipcMain.handle("delete-prayer-type", handler(async ({ id }) =>
    apiRequest("DELETE", `/api/v2/prayer-types/${id}`)
  ));

  ipcMain.handle("update-prayer-type", handler(async ({ id, body }) =>
    apiRequest("PUT", `/api/v2/prayer-types/${id}`, { body })
  ));

  ipcMain.handle("update-prayer-time", handler(async ({ id, body }) =>
    apiRequest("PUT", `/api/v2/prayer-times/${id}`, { body })
  ));

  // === Dhuha Groups ===
  ipcMain.handle("get-dhuha-groups", handler(async () =>
    apiRequest("GET", "/api/v2/jurusan/dhuha-schedules")
  ));

  ipcMain.handle("create-dhuha-group", handler(async () => {
    throw new Error("Fitur ini belum tersedia");
  }));

  ipcMain.handle("update-dhuha-group", handler(async () => {
    throw new Error("Fitur ini belum tersedia");
  }));

  ipcMain.handle("upsert-dhuha-groups-weekly", handler(async ({ body }) => {
    const rows = body.rows;
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("rows kosong");
    await Promise.all(
      rows.map(row =>
        apiRequest("PUT", `/api/v2/jurusan/${row.id_jurusan}/dhuha-day`, {
          body: { hari_dhuha: row.hari },
        })
      )
    );
    return { message: "Jadwal berhasil disimpan" };
  }));

  // === Students ===
  ipcMain.handle("get-students", handler(async (args) =>
    apiRequest("GET", "/api/v2/students", { query: args })
  ));

  ipcMain.handle("create-student", handler(async ({ body }) =>
    apiRequest("POST", "/api/v2/students", { body })
  ));

  ipcMain.handle("update-student", handler(async ({ nis, body }) =>
    apiRequest("PUT", `/api/v2/students/${encodeURIComponent(nis)}`, { body })
  ));

  ipcMain.handle("delete-student", handler(async ({ nis }) =>
    apiRequest("DELETE", `/api/v2/students/${encodeURIComponent(nis)}`)
  ));

  ipcMain.handle("get-student-filters", handler(async () =>
    apiRequest("GET", "/api/v2/students/filters")
  ));

  ipcMain.handle("get-unregistered-students", handler(async (args) =>
    apiRequest("GET", "/api/v2/students/unregistered", { query: args })
  ));

  ipcMain.handle("update-student-status", handler(async ({ nis, body }) =>
    apiRequest("PATCH", `/api/v2/students/${encodeURIComponent(nis)}/status`, { body })
  ));

  ipcMain.handle("import-students", handler(async ({ file_path }) => {
    // Read file and send as JSON import
    const content = await fs.readFile(file_path, "utf8");
    const students = JSON.parse(content);
    return apiRequest("POST", "/api/v2/students/import/json", { body: { students } });
  }));

  ipcMain.handle("import-students-json", handler(async ({ body }) =>
    apiRequest("POST", "/api/v2/students/import/json", { body })
  ));

  ipcMain.handle("bulk-student-control", handler(async ({ body }) =>
    apiRequest("POST", "/api/v2/admin/student-control/bulk-progression", { body })
  ));

  ipcMain.handle("bulk-update-student-fields", handler(async ({ body }) =>
    apiRequest("POST", "/api/v2/admin/student-control/bulk-fields", { body })
  ));

  ipcMain.handle("annual-rollover", handler(async ({ body }) =>
    apiRequest("POST", "/api/v2/admin/student-control/annual-rollover", { body })
  ));

  ipcMain.handle("notify-wali-kelas", handler(async ({ nis_list }) => {
    return apiRequest("POST", "/api/v2/students/notify-wali-kelas", { body: { nis_list } });
  }));

  // === Attendance ===
  ipcMain.handle("get-attendance-history", handler(async (args) =>
    apiRequest("GET", "/api/v2/attendance/history", { query: args })
  ));

  ipcMain.handle("get-student-attendance-history", handler(async (args) =>
    apiRequest("GET", "/api/v2/students/me/attendance-history", { query: args })
  ));

  ipcMain.handle("generate-qr-token", handler(async () =>
    apiRequest("GET", "/api/v2/attendance/qr-codes/current")
  ));

  ipcMain.handle("verify-qr", handler(async ({ body }) =>
    apiRequest("POST", "/api/v2/attendance/qr-codes/verify", { body })
  ));

  ipcMain.handle("generate-attendance-code", handler(async () =>
    apiRequest("GET", "/api/v2/attendance/code/generate")
  ));

  ipcMain.handle("verify-attendance-code", handler(async ({ body }) =>
    apiRequest("POST", "/api/v2/attendance/code/verify", { body })
  ));

  ipcMain.handle("export-report", handler(async ({ endpoint, startDate, endDate, kelas, jurusan }) => {
    const query = { start_date: startDate, end_date: endDate, kelas, jurusan };
    const result = await apiRequest("GET", endpoint, { query, raw: true });
    return { data: result.buffer.toString("base64") };
  }));

  // === Permits ===
  ipcMain.handle("get-pengajuan-izin", handler(async () =>
    apiRequest("GET", "/api/v2/pengajuan-izin")
  ));

  ipcMain.handle("create-pengajuan-izin", handler(async ({ jenisIzin, tanggalAwal, tanggalAkhir, keterangan, filePath: file_path }) => {
    const FormData = globalThis.FormData;
    const formData = new FormData();
    formData.append("jenis_izin", jenisIzin);
    formData.append("tanggal_awal", tanggalAwal);
    formData.append("tanggal_akhir", tanggalAkhir);
    formData.append("keterangan", keterangan);

    if (file_path) {
      const fileData = await fs.readFile(file_path);
      const fileName = path.basename(file_path);
      const ext = path.extname(file_path).toLowerCase();
      const mimeTypes = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".pdf": "application/pdf" };
      const contentType = mimeTypes[ext] || "application/octet-stream";
      const { Blob } = globalThis;
      formData.append("bukti_foto", new Blob([fileData], { type: contentType }), fileName);
    }

    const opts = { method: "POST", headers: {}, body: formData };
    if (authToken) opts.headers["Authorization"] = `Bearer ${authToken}`;
    const res = await fetch(`${BASE_URL}/api/v2/pengajuan-izin`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || data?.message || "Gagal mengajukan izin");
    return data;
  }));

  ipcMain.handle("delete-pengajuan-izin", handler(async ({ id }) =>
    apiRequest("DELETE", `/api/v2/pengajuan-izin/${id}`)
  ));

  ipcMain.handle("update-izin-status", handler(async ({ id, body }) =>
    apiRequest("PATCH", `/api/v2/pengajuan-izin/${id}/status`, { body })
  ));

  ipcMain.handle("get-pengajuan-izin-bukti", handler(async ({ id }) =>
    apiRequest("GET", `/api/v2/pengajuan-izin/${id}/bukti`)
  ));

  // === Class Management ===
  ipcMain.handle("get-management-classes", handler(async () =>
    apiRequest("GET", "/api/v2/admin/management/kelas")
  ));

  ipcMain.handle("get-management-class-details", handler(async ({ id }) =>
    apiRequest("GET", `/api/v2/admin/management/kelas/${id}`)
  ));

  ipcMain.handle("update-class-homeroom", handler(async ({ id, body }) =>
    apiRequest("PUT", `/api/v2/admin/management/kelas/${id}/wali`, { body })
  ));

  ipcMain.handle("get-staff-guru-lookup", handler(async () =>
    apiRequest("GET", "/api/v2/lookup/staff-guru")
  ));

  ipcMain.handle("get-academic-years", handler(async () =>
    apiRequest("GET", "/api/v2/academic-years")
  ));

  ipcMain.handle("get-classes", handler(async () =>
    apiRequest("GET", "/api/v2/kelas")
  ));

  ipcMain.handle("get-majors", handler(async () =>
    apiRequest("GET", "/api/v2/jurusan")
  ));

  // === Device Management ===
  ipcMain.handle("get-admin-devices", handler(async ({ role, search } = {}) =>
    apiRequest("GET", "/api/v2/admin/device-management", { query: { role, search } })
  ));

  ipcMain.handle("delete-admin-device", handler(async ({ id }) =>
    apiRequest("DELETE", `/api/v2/admin/device-management/${id}`)
  ));

  ipcMain.handle("create-device-change-request", handler(async ({ body }) =>
    apiRequest("POST", "/api/v2/device/change-request", { body })
  ));

  ipcMain.handle("get-device-change-requests", handler(async () =>
    apiRequest("GET", "/api/v2/admin/device-management/change-requests")
  ));

  ipcMain.handle("approve-device-change", handler(async ({ id }) =>
    apiRequest("PUT", `/api/v2/admin/device-management/change-requests/${id}/approve`)
  ));

  ipcMain.handle("reject-device-change", handler(async ({ id }) =>
    apiRequest("PUT", `/api/v2/admin/device-management/change-requests/${id}/reject`)
  ));

  ipcMain.handle("get-profile-devices", handler(async () =>
    apiRequest("GET", "/api/v2/profile/devices")
  ));

  ipcMain.handle("delete-profile-device", handler(async () =>
    apiRequest("DELETE", "/api/v2/profile/devices")
  ));

  // === Hardware Auth ===
  ipcMain.handle("get-hardware-id", handler(async () => ({ hardware_id: hardwareId })));

  ipcMain.handle("register-device-auth", handler(async ({ body } = {}) =>
    apiRequest("POST", "/api/v2/device-auth/register", {
      body: { hardware_id: hardwareId, ...(body || {}) },
    })
  ));

  ipcMain.handle("get-device-auth-info", handler(async () =>
    apiRequest("GET", "/api/v2/device-auth/info")
  ));

  // === Guru Management ===
  ipcMain.handle("get-guru-list", handler(async (args) =>
    apiRequest("GET", "/api/v2/admin/management/guru", { query: args })
  ));

  ipcMain.handle("create-guru", handler(async ({ body }) =>
    apiRequest("POST", "/api/v2/admin/management/guru", { body })
  ));

  ipcMain.handle("update-guru", handler(async ({ id, body }) =>
    apiRequest("PUT", `/api/v2/admin/management/guru/${id}`, { body })
  ));

  ipcMain.handle("delete-guru", handler(async ({ id }) =>
    apiRequest("DELETE", `/api/v2/admin/management/guru/${id}`)
  ));

  ipcMain.handle("assign-guru-wali-kelas", handler(async ({ id, body }) =>
    apiRequest("PUT", `/api/v2/admin/management/guru/${id}/wali-kelas`, { body })
  ));

  ipcMain.handle("remove-guru-wali-kelas", handler(async ({ id }) =>
    apiRequest("DELETE", `/api/v2/admin/management/guru/${id}/wali-kelas`)
  ));

  ipcMain.handle("get-wali-kelas-list", handler(async (args) =>
    apiRequest("GET", "/api/v2/admin/management/wali-kelas", { query: args })
  ));

  // === Notifications ===
  ipcMain.handle("get-notifications", handler(async () =>
    apiRequest("GET", "/api/v2/notifications")
  ));

  ipcMain.handle("show-system-notification", async (_event, { title, body }) => {
    new Notification({ title, body }).show();
  });

  // === Profile: Change Password & Email ===
  ipcMain.handle("change-password", handler(async ({ currentPassword, newPassword }) =>
    apiRequest("POST", "/api/v2/auth/change-password", { body: { current_password: currentPassword, new_password: newPassword } })
  ));

  ipcMain.handle("request-change-email", handler(async ({ newEmail }) =>
    apiRequest("POST", "/api/v2/auth/email-change-requests", { body: { new_email: newEmail } })
  ));

  ipcMain.handle("verify-change-email", handler(async ({ newEmail, otp }) =>
    apiRequest("POST", "/api/v2/auth/email-change-requests/verify", { body: { new_email: newEmail, otp } })
  ));

  // === File/Dialog (replacing Tauri plugins) ===
  ipcMain.handle("show-open-dialog", async (_event, args) => {
    const result = await dialog.showOpenDialog(args || { properties: ["openFile"] });
    if (result.canceled) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("show-save-dialog", async (_event, args) => {
    const result = await dialog.showSaveDialog(args || {});
    if (result.canceled) return null;
    return result.filePath;
  });

  ipcMain.handle("write-file", handler(async ({ filePath, data, encoding }) => {
    const buf = encoding === "base64" ? Buffer.from(data, "base64") : data;
    await fs.writeFile(filePath, buf);
  }));

  ipcMain.handle("read-file", handler(async ({ filePath, encoding }) =>
    fs.readFile(filePath, encoding || "utf8")
  ));

  // === Auto Updater ===
  ipcMain.handle("check-for-updates", handler(async () => {
    const { autoUpdater } = require("electron-updater");
    return autoUpdater.checkForUpdates();
  }));

  ipcMain.handle("quit-and-install", handler(async () => {
    const { autoUpdater } = require("electron-updater");
    autoUpdater.quitAndInstall();
  }));
}

module.exports = { register };
