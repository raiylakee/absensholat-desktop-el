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
  getDashboardData: () => ipcRenderer.invoke("get-dashboard-data"),

  // Prayer Schedules
  getPrayerSchedules: () => ipcRenderer.invoke("get-prayer-schedules"),
  getPrayerSchedulesToday: () => ipcRenderer.invoke("get-prayer-schedules-today"),
  createPrayerSchedule: (args) => ipcRenderer.invoke("create-prayer-schedule", args),
  updatePrayerSchedule: (args) => ipcRenderer.invoke("update-prayer-schedule", args),
  deletePrayerSchedule: (args) => ipcRenderer.invoke("delete-prayer-schedule", args),
  getPrayerTimes: () => ipcRenderer.invoke("get-prayer-times"),
  getPrayerTypes: () => ipcRenderer.invoke("get-prayer-types"),
  createPrayerType: (args) => ipcRenderer.invoke("create-prayer-type", args),
  createPrayerTime: (args) => ipcRenderer.invoke("create-prayer-time", args),
  deletePrayerType: (args) => ipcRenderer.invoke("delete-prayer-type", args),
  updatePrayerType: (args) => ipcRenderer.invoke("update-prayer-type", args),
  updatePrayerTime: (args) => ipcRenderer.invoke("update-prayer-time", args),

  // Dhuha Groups
  getDhuhaGroups: () => ipcRenderer.invoke("get-dhuha-groups"),
  createDhuhaGroup: (args) => ipcRenderer.invoke("create-dhuha-group", args),
  updateDhuhaGroup: (args) => ipcRenderer.invoke("update-dhuha-group", args),
  upsertDhuhaGroupsWeekly: (args) => ipcRenderer.invoke("upsert-dhuha-groups-weekly", args),
  getDhuhaTurnsToday: () => ipcRenderer.invoke("get-dhuha-turns-today"),
  getDhuhaToday: () => ipcRenderer.invoke("get-dhuha-today"),
  getDhuhaKeahlian: () => ipcRenderer.invoke("get-dhuha-keahlian"),
  createDhuhaKeahlian: (args) => ipcRenderer.invoke("create-dhuha-keahlian", args),
  updateDhuhaKeahlian: (args) => ipcRenderer.invoke("update-dhuha-keahlian", args),
  getDhuhaDetail: () => ipcRenderer.invoke("get-dhuha-detail"),
  updateDhuhaDetail: (args) => ipcRenderer.invoke("update-dhuha-detail", args),
  updateDhuhaTime: (args) => ipcRenderer.invoke("update-dhuha-time", args),

  // Students
  getStudents: (args) => ipcRenderer.invoke("get-students", args),
  getStudentByNis: (args) => ipcRenderer.invoke("get-student-by-nis", args),
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
  sequentialProgression: (args) => ipcRenderer.invoke("sequential-progression", args),
  getStudentControlOverview: () => ipcRenderer.invoke("get-student-control-overview"),
  getStudentTransitions: (args) => ipcRenderer.invoke("get-student-transitions", args),
  notifyWaliKelas: (args) => ipcRenderer.invoke("notify-wali-kelas", args),

  // Promotion
  getPromotionConfig: () => ipcRenderer.invoke("get-promotion-config"),
  createPromotionConfig: (args) => ipcRenderer.invoke("create-promotion-config", args),
  updatePromotionConfig: (args) => ipcRenderer.invoke("update-promotion-config", args),
  simulatePromotion: (args) => ipcRenderer.invoke("simulate-promotion", args),
  executePromotion: (args) => ipcRenderer.invoke("execute-promotion", args),

  // Attendance
  getAttendanceHistory: (args) => ipcRenderer.invoke("get-attendance-history", args),
  getStudentAttendanceHistory: (args) => ipcRenderer.invoke("get-student-attendance-history", args),
  generateQrToken: () => ipcRenderer.invoke("generate-qr-token"),
  verifyQr: (args) => ipcRenderer.invoke("verify-qr", args),
  generateAttendanceCode: () => ipcRenderer.invoke("generate-attendance-code"),
  verifyAttendanceCode: (args) => ipcRenderer.invoke("verify-attendance-code", args),

  // Halangan QR
  generateHalanganQr: () => ipcRenderer.invoke("generate-halangan-qr"),
  verifyHalanganQr: (args) => ipcRenderer.invoke("verify-halangan-qr", args),
  getPendingHalangan: () => ipcRenderer.invoke("get-pending-halangan"),
  approveHalangan: (args) => ipcRenderer.invoke("approve-halangan", args),
  rejectHalangan: (args) => ipcRenderer.invoke("reject-halangan", args),
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
  getAdminDevices: (args) => ipcRenderer.invoke("get-admin-devices", args),
  deleteAdminDevice: (args) => ipcRenderer.invoke("delete-admin-device", args),
  createDeviceChangeRequest: (args) => ipcRenderer.invoke("create-device-change-request", args),
  getDeviceChangeRequests: () => ipcRenderer.invoke("get-device-change-requests"),
  approveDeviceChange: (args) => ipcRenderer.invoke("approve-device-change", args),
  rejectDeviceChange: (args) => ipcRenderer.invoke("reject-device-change", args),
  getProfileDevices: () => ipcRenderer.invoke("get-profile-devices"),
  deleteProfileDevice: () => ipcRenderer.invoke("delete-profile-device"),

  // Hardware Auth
  getHardwareId: () => ipcRenderer.invoke("get-hardware-id"),
  registerDeviceAuth: (args) => ipcRenderer.invoke("register-device-auth", args),
  getDeviceAuthInfo: () => ipcRenderer.invoke("get-device-auth-info"),

  // Guru Management
  getGuruList: (args) => ipcRenderer.invoke("get-guru-list", args),
  createGuru: (args) => ipcRenderer.invoke("create-guru", args),
  updateGuru: (args) => ipcRenderer.invoke("update-guru", args),
  deleteGuru: (args) => ipcRenderer.invoke("delete-guru", args),
  assignGuruWaliKelas: (args) => ipcRenderer.invoke("assign-guru-wali-kelas", args),
  removeGuruWaliKelas: (args) => ipcRenderer.invoke("remove-guru-wali-kelas", args),
  getWaliKelasList: (args) => ipcRenderer.invoke("get-wali-kelas-list", args),

  // Notifications
  getNotifications: () => ipcRenderer.invoke("get-notifications"),
  showSystemNotification: (args) => ipcRenderer.invoke("show-system-notification", args),

  // Profile: Change Password & Email
  changePassword: (args) => ipcRenderer.invoke("change-password", args),
  requestChangeEmail: (args) => ipcRenderer.invoke("request-change-email", args),
  verifyChangeEmail: (args) => ipcRenderer.invoke("verify-change-email", args),

  // File/Dialog (replacing Tauri plugins)
  showOpenDialog: (args) => ipcRenderer.invoke("show-open-dialog", args),
  showSaveDialog: (args) => ipcRenderer.invoke("show-save-dialog", args),
  writeFile: (args) => ipcRenderer.invoke("write-file", args),
  readFile: (args) => ipcRenderer.invoke("read-file", args),

  // App Logo
  getLogoData: () => ipcRenderer.invoke("get-logo-data"),
  saveCustomLogo: (args) => ipcRenderer.invoke("save-custom-logo", args),
  resetLogo: () => ipcRenderer.invoke("reset-logo"),

  // Auto Updater
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  quitAndInstall: () => ipcRenderer.invoke("quit-and-install"),
  onUpdateStatus: (callback) => {
    const subscription = (event, status, info) => callback(status, info);
    ipcRenderer.on("update-status", subscription);
    return () => ipcRenderer.removeListener("update-status", subscription);
  },
  onUpdateProgress: (callback) => {
    const subscription = (event, percent) => callback(percent);
    ipcRenderer.on("update-progress", subscription);
    return () => ipcRenderer.removeListener("update-progress", subscription);
  },

  // Window controls (replacing @tauri-apps/api/window)
  windowMinimize: () => ipcRenderer.invoke("window-minimize"),
  windowMaximize: () => ipcRenderer.invoke("window-maximize"),
  windowClose: () => ipcRenderer.invoke("window-close"),
  windowStartDrag: () => ipcRenderer.invoke("window-start-drag"),
});
