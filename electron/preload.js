const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Auth
  login: (args) => ipcRenderer.invoke("login", args),
  register: (args) => ipcRenderer.invoke("register", args),
  setAuthToken: (args) => ipcRenderer.invoke("set-auth-token", args),
  clearAuthToken: () => ipcRenderer.invoke("clear-auth-token"),
  getCurrentProfile: () => ipcRenderer.invoke("get-current-profile"),
  logout: () => ipcRenderer.invoke("logout"),
  forgotPassword: (args) => ipcRenderer.invoke("forgot-password", args),
  verifyOtp: (args) => ipcRenderer.invoke("verify-otp", args),
  resetPassword: (args) => ipcRenderer.invoke("reset-password", args),
  verifyAccount: (args) => ipcRenderer.invoke("verify-account", args),

  // Dashboard & Statistics
  getChartData: () => ipcRenderer.invoke("get-chart-data"),
  getAttendanceStatistics: () => ipcRenderer.invoke("get-attendance-statistics"),
  getClosestPrayerSchedule: () => ipcRenderer.invoke("get-closest-prayer-schedule"),

  // Prayer Schedules
  getPrayerSchedules: () => ipcRenderer.invoke("get-prayer-schedules"),
  createPrayerSchedule: (args) => ipcRenderer.invoke("create-prayer-schedule", args),
  updatePrayerSchedule: (args) => ipcRenderer.invoke("update-prayer-schedule", args),
  deletePrayerSchedule: (args) => ipcRenderer.invoke("delete-prayer-schedule", args),
  getPrayerTimes: () => ipcRenderer.invoke("get-prayer-times"),
  getPrayerTypes: () => ipcRenderer.invoke("get-prayer-types"),
  updatePrayerTime: (args) => ipcRenderer.invoke("update-prayer-time", args),

  // Dhuha Groups
  getDhuhaGroups: () => ipcRenderer.invoke("get-dhuha-groups"),
  createDhuhaGroup: (args) => ipcRenderer.invoke("create-dhuha-group", args),
  updateDhuhaGroup: (args) => ipcRenderer.invoke("update-dhuha-group", args),
  upsertDhuhaGroupsWeekly: (args) => ipcRenderer.invoke("upsert-dhuha-groups-weekly", args),

  // Students
  getStudents: (args) => ipcRenderer.invoke("get-students", args),
  createStudent: (args) => ipcRenderer.invoke("create-student", args),
  updateStudent: (args) => ipcRenderer.invoke("update-student", args),
  deleteStudent: (args) => ipcRenderer.invoke("delete-student", args),
  getStudentFilters: () => ipcRenderer.invoke("get-student-filters"),
  getUnregisteredStudents: (args) => ipcRenderer.invoke("get-unregistered-students", args),
  updateStudentStatus: (args) => ipcRenderer.invoke("update-student-status", args),
  importStudents: (args) => ipcRenderer.invoke("import-students", args),
  importStudentsJson: (args) => ipcRenderer.invoke("import-students-json", args),
  bulkStudentControl: (args) => ipcRenderer.invoke("bulk-student-control", args),
  bulkUpdateStudentFields: (args) => ipcRenderer.invoke("bulk-update-student-fields", args),
  annualRollover: (args) => ipcRenderer.invoke("annual-rollover", args),
  notifyWaliKelas: (args) => ipcRenderer.invoke("notify-wali-kelas", args),

  // Attendance
  getAttendanceHistory: (args) => ipcRenderer.invoke("get-attendance-history", args),
  getStudentAttendanceHistory: (args) => ipcRenderer.invoke("get-student-attendance-history", args),
  generateQrToken: () => ipcRenderer.invoke("generate-qr-token"),
  verifyQr: (args) => ipcRenderer.invoke("verify-qr", args),
  generateAttendanceCode: () => ipcRenderer.invoke("generate-attendance-code"),
  verifyAttendanceCode: (args) => ipcRenderer.invoke("verify-attendance-code", args),
  exportReport: (args) => ipcRenderer.invoke("export-report", args),

  // Permits
  getPengajuanIzin: () => ipcRenderer.invoke("get-pengajuan-izin"),
  createPengajuanIzin: (args) => ipcRenderer.invoke("create-pengajuan-izin", args),
  deletePengajuanIzin: (args) => ipcRenderer.invoke("delete-pengajuan-izin", args),
  updateIzinStatus: (args) => ipcRenderer.invoke("update-izin-status", args),
  getPengajuanIzinBukti: (args) => ipcRenderer.invoke("get-pengajuan-izin-bukti", args),

  // Class Management
  getManagementClasses: () => ipcRenderer.invoke("get-management-classes"),
  getManagementClassDetails: (args) => ipcRenderer.invoke("get-management-class-details", args),
  updateClassHomeroom: (args) => ipcRenderer.invoke("update-class-homeroom", args),
  getStaffGuruLookup: () => ipcRenderer.invoke("get-staff-guru-lookup"),
  getAcademicYears: () => ipcRenderer.invoke("get-academic-years"),
  getClasses: () => ipcRenderer.invoke("get-classes"),
  getMajors: () => ipcRenderer.invoke("get-majors"),

  // Device Management
  getAdminDevices: () => ipcRenderer.invoke("get-admin-devices"),
  deleteAdminDevice: (args) => ipcRenderer.invoke("delete-admin-device", args),
  createDeviceChangeRequest: (args) => ipcRenderer.invoke("create-device-change-request", args),
  getDeviceChangeRequests: () => ipcRenderer.invoke("get-device-change-requests"),
  approveDeviceChange: (args) => ipcRenderer.invoke("approve-device-change", args),
  rejectDeviceChange: (args) => ipcRenderer.invoke("reject-device-change", args),
  getProfileDevices: () => ipcRenderer.invoke("get-profile-devices"),
  deleteProfileDevice: () => ipcRenderer.invoke("delete-profile-device"),

  // Notifications
  getNotifications: () => ipcRenderer.invoke("get-notifications"),

  // File/Dialog (replacing Tauri plugins)
  showOpenDialog: (args) => ipcRenderer.invoke("show-open-dialog", args),
  showSaveDialog: (args) => ipcRenderer.invoke("show-save-dialog", args),
  writeFile: (args) => ipcRenderer.invoke("write-file", args),
  readFile: (args) => ipcRenderer.invoke("read-file", args),

  // Window controls (replacing @tauri-apps/api/window)
  windowMinimize: () => ipcRenderer.invoke("window-minimize"),
  windowMaximize: () => ipcRenderer.invoke("window-maximize"),
  windowClose: () => ipcRenderer.invoke("window-close"),
  windowStartDrag: () => ipcRenderer.invoke("window-start-drag"),
});
