import { vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
  Toaster: () => null,
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock("@/assets/applogo/Logo Sholat-02.png", () => ({ default: "logo.png" }));

const mockElectronAPI = {
  login: vi.fn(),
  register: vi.fn(),
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
  getCurrentProfile: vi.fn(),
  logout: vi.fn(),
  forgotPassword: vi.fn(),
  verifyOtp: vi.fn(),
  resetPassword: vi.fn(),
  verifyAccount: vi.fn(),
  getChartData: vi.fn(),
  getAttendanceStatistics: vi.fn(),
  getClosestPrayerSchedule: vi.fn(),
  getDashboardData: vi.fn(),
  getPrayerSchedules: vi.fn(),
  createPrayerSchedule: vi.fn(),
  updatePrayerSchedule: vi.fn(),
  deletePrayerSchedule: vi.fn(),
  getPrayerTimes: vi.fn(),
  getPrayerTypes: vi.fn(),
  updatePrayerTime: vi.fn(),
  getDhuhaGroups: vi.fn(),
  createDhuhaGroup: vi.fn(),
  updateDhuhaGroup: vi.fn(),
  upsertDhuhaGroupsWeekly: vi.fn(),
  getStudents: vi.fn(),
  createStudent: vi.fn(),
  updateStudent: vi.fn(),
  deleteStudent: vi.fn(),
  getStudentFilters: vi.fn(),
  getUnregisteredStudents: vi.fn(),
  updateStudentStatus: vi.fn(),
  importStudents: vi.fn(),
  importStudentsJson: vi.fn(),
  bulkStudentControl: vi.fn(),
  bulkUpdateStudentFields: vi.fn(),
  annualRollover: vi.fn(),
  notifyWaliKelas: vi.fn(),
  getAttendanceHistory: vi.fn(),
  getStudentAttendanceHistory: vi.fn(),
  generateQrToken: vi.fn(),
  verifyQr: vi.fn(),
  generateAttendanceCode: vi.fn(),
  verifyAttendanceCode: vi.fn(),
  exportReport: vi.fn(),
  getPengajuanIzin: vi.fn(),
  createPengajuanIzin: vi.fn(),
  deletePengajuanIzin: vi.fn(),
  updateIzinStatus: vi.fn(),
  getPengajuanIzinBukti: vi.fn(),
  getManagementClasses: vi.fn(),
  getManagementClassDetails: vi.fn(),
  updateClassHomeroom: vi.fn(),
  getStaffGuruLookup: vi.fn(),
  getAcademicYears: vi.fn(),
  getClasses: vi.fn(),
  getMajors: vi.fn(),
  getAdminDevices: vi.fn(),
  deleteAdminDevice: vi.fn(),
  createDeviceChangeRequest: vi.fn(),
  getDeviceChangeRequests: vi.fn(),
  approveDeviceChange: vi.fn(),
  rejectDeviceChange: vi.fn(),
  getProfileDevices: vi.fn(),
  deleteProfileDevice: vi.fn(),
  getHardwareId: vi.fn(),
  registerDeviceAuth: vi.fn(),
  getDeviceAuthInfo: vi.fn(),
  getGuruList: vi.fn(),
  createGuru: vi.fn(),
  updateGuru: vi.fn(),
  deleteGuru: vi.fn(),
  assignGuruWaliKelas: vi.fn(),
  removeGuruWaliKelas: vi.fn(),
  getWaliKelasList: vi.fn(),
  getNotifications: vi.fn(),
  changePassword: vi.fn(),
  requestChangeEmail: vi.fn(),
  verifyChangeEmail: vi.fn(),
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
  windowMinimize: vi.fn(),
  windowMaximize: vi.fn(),
  windowClose: vi.fn(),
  windowStartDrag: vi.fn(),
  showSystemNotification: vi.fn(),
  checkForUpdates: vi.fn(),
  quitAndInstall: vi.fn(),
  onUpdateStatus: vi.fn(() => () => {}),
  onUpdateProgress: vi.fn(() => () => {}),
};

if (typeof window !== "undefined") {
  Object.defineProperty(window, "electronAPI", {
    value: mockElectronAPI,
    writable: true,
    configurable: true,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockElectronAPI.getManagementClasses.mockResolvedValue({
      data: [{ id_kelas: 1, label: "X RPL 1" }, { id_kelas: 2, label: "XI TKJ 1" }],
    });
    mockElectronAPI.getHardwareId.mockResolvedValue({ hardware_id: "test-hwid-abcd-1234" });
    mockElectronAPI.getDeviceAuthInfo.mockRejectedValue(new Error("Not found"));
    mockElectronAPI.getGuruList.mockResolvedValue({ data: [], meta: { total_pages: 1, total: 0, limit: 15 } });
    mockElectronAPI.getWaliKelasList.mockResolvedValue({ data: [] });
    mockElectronAPI.getAdminDevices.mockResolvedValue({ data: [] });
    mockElectronAPI.getDeviceChangeRequests.mockResolvedValue({ data: [] });
  });
}
