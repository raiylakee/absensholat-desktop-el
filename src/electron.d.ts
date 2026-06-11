/* eslint-disable @typescript-eslint/no-explicit-any */
interface ElectronAPI {
  // Auth
  login: (args: any) => Promise<any>;
  register: (args: any) => Promise<any>;
  setAuthToken: (args: any) => Promise<void>;
  clearAuthToken: () => Promise<void>;
  getCurrentProfile: () => Promise<any>;
  logout: () => Promise<any>;
  forgotPassword: (args: any) => Promise<any>;
  verifyOtp: (args: any) => Promise<any>;
  resetPassword: (args: any) => Promise<any>;
  verifyAccount: (args: any) => Promise<any>;

  // Dashboard
  getChartData: () => Promise<any>;
  getAttendanceStatistics: () => Promise<any>;
  getClosestPrayerSchedule: () => Promise<any>;
  getDashboardData: () => Promise<{ charts: any; attendance: any; closestPrayer: any }>;

  // Prayer
  getPrayerSchedules: () => Promise<any>;
  getPrayerSchedulesToday: () => Promise<any>;
  createPrayerSchedule: (args: any) => Promise<any>;
  updatePrayerSchedule: (args: any) => Promise<any>;
  deletePrayerSchedule: (args: any) => Promise<any>;
  getPrayerTimes: () => Promise<any>;
  getPrayerTypes: () => Promise<any>;
  createPrayerType: (args: any) => Promise<any>;
  createPrayerTime: (args: any) => Promise<any>;
  deletePrayerType: (args: any) => Promise<any>;
  updatePrayerType: (args: any) => Promise<any>;
  updatePrayerTime: (args: any) => Promise<any>;

  // Dhuha
  getDhuhaGroups: () => Promise<any>;
  createDhuhaGroup: (args: any) => Promise<any>;
  updateDhuhaGroup: (args: any) => Promise<any>;
  upsertDhuhaGroupsWeekly: (args: any) => Promise<any>;
  getDhuhaTurnsToday: () => Promise<any>;
  getDhuhaToday: () => Promise<any>;
  getDhuhaKeahlian: () => Promise<any>;
  createDhuhaKeahlian: (args: any) => Promise<any>;
  updateDhuhaKeahlian: (args: any) => Promise<any>;
  getDhuhaDetail: () => Promise<any>;
  updateDhuhaDetail: (args: any) => Promise<any>;
  updateDhuhaTime: (args: any) => Promise<any>;

  // Students
  getStudents: (args: any) => Promise<any>;
  getStudentByNis: (args: any) => Promise<any>;
  createStudent: (args: any) => Promise<any>;
  updateStudent: (args: any) => Promise<any>;
  deleteStudent: (args: any) => Promise<any>;
  getStudentFilters: () => Promise<any>;
  getUnregisteredStudents: (args: any) => Promise<any>;
  updateStudentStatus: (args: any) => Promise<any>;
  importStudents: (args: any) => Promise<any>;
  importStudentsJson: (args: any) => Promise<any>;
  bulkStudentControl: (args: any) => Promise<any>;
  bulkUpdateStudentFields: (args: any) => Promise<any>;
  annualRollover: (args: any) => Promise<any>;
  sequentialProgression: (args: any) => Promise<any>;
  getStudentControlOverview: () => Promise<any>;
  getStudentTransitions: (args: any) => Promise<any>;
  notifyWaliKelas: (args: any) => Promise<any>;

  // Promotion
  getPromotionConfig: () => Promise<any>;
  createPromotionConfig: (args: any) => Promise<any>;
  updatePromotionConfig: (args: any) => Promise<any>;
  simulatePromotion: (args: any) => Promise<any>;
  executePromotion: (args: any) => Promise<any>;
  getPromotionPhaseStatus: () => Promise<any>;
  graduateGrade12: () => Promise<any>;
  promoteGrade11: () => Promise<any>;
  promoteGrade10: () => Promise<any>;

  // Attendance
  getAttendanceHistory: (args: any) => Promise<any>;
  getStudentAttendanceHistory: (args: any) => Promise<any>;
  generateQrToken: () => Promise<any>;
  verifyQr: (args: any) => Promise<any>;
  generateAttendanceCode: () => Promise<any>;
  verifyAttendanceCode: (args: any) => Promise<any>;
  exportReport: (args: any) => Promise<any>;

  // Halangan QR
  generateHalanganQr: () => Promise<any>;
  verifyHalanganQr: (args: any) => Promise<any>;
  getPendingHalangan: () => Promise<any>;
  approveHalangan: (args: any) => Promise<any>;
  rejectHalangan: (args: any) => Promise<any>;

  // Permits
  getPengajuanIzin: () => Promise<any>;
  createPengajuanIzin: (args: any) => Promise<any>;
  deletePengajuanIzin: (args: any) => Promise<any>;
  updateIzinStatus: (args: any) => Promise<any>;
  getPengajuanIzinBukti: (args: any) => Promise<any>;

  // Classes
  getManagementClasses: () => Promise<any>;
  getManagementClassDetails: (args: any) => Promise<any>;
  updateClassHomeroom: (args: any) => Promise<any>;
  updateClassStatus: (args: any) => Promise<any>;
  getStaffGuruLookup: () => Promise<any>;
  getAcademicYears: () => Promise<any>;
  getClasses: () => Promise<any>;
  getMajors: () => Promise<any>;

  // Devices
  getAdminDevices: (params?: { role?: string; search?: string }) => Promise<any>;
  deleteAdminDevice: (args: any) => Promise<any>;
  createDeviceChangeRequest: (args: any) => Promise<any>;
  getDeviceChangeRequests: () => Promise<any>;
  approveDeviceChange: (args: any) => Promise<any>;
  rejectDeviceChange: (args: any) => Promise<any>;
  getProfileDevices: () => Promise<any>;
  deleteProfileDevice: () => Promise<any>;

  // Hardware Auth
  getHardwareId: () => Promise<{ hardware_id: string }>;
  registerDeviceAuth: (args?: any) => Promise<any>;
  getDeviceAuthInfo: () => Promise<any>;

  // Guru Management
  getGuruList: (args?: any) => Promise<any>;
  createGuru: (args: any) => Promise<any>;
  updateGuru: (args: any) => Promise<any>;
  deleteGuru: (args: any) => Promise<any>;
  assignGuruWaliKelas: (args: any) => Promise<any>;
  removeGuruWaliKelas: (args: any) => Promise<any>;
  getWaliKelasList: (args?: any) => Promise<any>;

  // Notifications
  getNotifications: () => Promise<any>;
  showSystemNotification: (args: { title: string; body: string }) => Promise<void>;

  // Profile
  changePassword: (args: any) => Promise<any>;
  requestChangeEmail: (args: any) => Promise<any>;
  verifyChangeEmail: (args: any) => Promise<any>;

  // File/Dialog
  showOpenDialog: (args?: any) => Promise<string | null>;
  showSaveDialog: (args?: any) => Promise<string | null>;
  writeFile: (args: any) => Promise<void>;
  readFile: (args: any) => Promise<string>;

  // App Logo
  getLogoData: () => Promise<{ data: string | null; type: "default" | "custom" }>;
  saveCustomLogo: (args: { filePath?: string }) => Promise<{ success: boolean; data?: string; message?: string }>;
  resetLogo: () => Promise<{ data: string | null }>;

  // Auto Updater
  checkForUpdates: () => Promise<any>;
  quitAndInstall: () => Promise<void>;
  onUpdateStatus: (callback: (status: string, info: any) => void) => () => void;
  onUpdateProgress: (callback: (percent: number) => void) => () => void;

  // Window
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowStartDrag: () => Promise<void>;
}

interface Window {
  electronAPI: ElectronAPI;
}
