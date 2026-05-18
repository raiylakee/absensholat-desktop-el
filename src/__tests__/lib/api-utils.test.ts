import { describe, it, expect } from "vitest";
import {
  extractData,
  extractPagination,
  normalizeStudent,
  normalizeAttendance,
  normalizePrayerSchedule,
  normalizeNotification,
  handleApiError,
  genderToApi,
  genderFromApi,
  buildQueryParams,
} from "@/lib/api-utils";

describe("extractData", () => {
  it("returns [] for null", () => {
    expect(extractData(null)).toEqual([]);
  });

  it("returns [] for undefined", () => {
    expect(extractData(undefined)).toEqual([]);
  });

  it("returns .data when present", () => {
    expect(extractData({ data: [1, 2] })).toEqual([1, 2]);
  });

  it("returns whole response when no .data", () => {
    const res = { items: [1] };
    expect(extractData(res)).toBe(res);
  });
});

describe("extractPagination", () => {
  it("reads from response.pagination", () => {
    const res = { pagination: { page: 2, page_size: 10, total: 50, total_pages: 5 } };
    expect(extractPagination(res)).toEqual({ page: 2, pageSize: 10, total: 50, totalPages: 5 });
  });

  it("reads from response.meta", () => {
    const res = { meta: { page: 3, limit: 15, total: 30, total_pages: 2 } };
    expect(extractPagination(res)).toEqual({ page: 3, pageSize: 15, total: 30, totalPages: 2 });
  });

  it("defaults page=1, pageSize=20, total=0, totalPages=1", () => {
    expect(extractPagination({})).toEqual({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  });

  it("reads page_size over limit", () => {
    const res = { meta: { page_size: 25 } };
    expect(extractPagination(res).pageSize).toBe(25);
  });

  it("reads total_items as total", () => {
    const res = { meta: { total_items: 42 } };
    expect(extractPagination(res).total).toBe(42);
  });
});

describe("normalizeStudent", () => {
  it("extracts nis and nama", () => {
    const s = normalizeStudent({ nis: "123", nama: "Ali" });
    expect(s.nis).toBe("123");
    expect(s.nama).toBe("Ali");
  });

  it("strips %!s(int=...) artifacts from nama", () => {
    const s = normalizeStudent({ nama_siswa: "Ali%!s(int=42) Budi" });
    expect(s.nama).toBe("Ali Budi");
  });

  it("handles jk === 'P' as Perempuan", () => {
    expect(normalizeStudent({ jk: "P" }).jenisKelamin).toBe("Perempuan");
  });

  it("handles jk === 'L' as Laki-laki", () => {
    expect(normalizeStudent({ jk: "L" }).jenisKelamin).toBe("Laki-laki");
  });

  it("uses nama_siswa over nama", () => {
    const s = normalizeStudent({ nama_siswa: "Siti", nama: "Other" });
    expect(s.nama).toBe("Siti");
  });
});

describe("normalizeAttendance", () => {
  it("maps fields correctly", () => {
    const a = normalizeAttendance({ nis: "1", nama_siswa: "A", status: "hadir", jenis_sholat: "Dhuha" });
    expect(a.nis).toBe("1");
    expect(a.nama).toBe("A");
    expect(a.status).toBe("Hadir");
    expect(a.jenisSholat).toBe("Dhuha");
  });

  it("capitalizes status", () => {
    expect(normalizeAttendance({ status: "izin" }).status).toBe("Izin");
  });
});

describe("normalizePrayerSchedule", () => {
  it("maps id_jadwal, hari, jenis_sholat, waktu_mulai, waktu_selesai", () => {
    const p = normalizePrayerSchedule({
      id_jadwal: 5, hari: "Senin", jenis_sholat: "Dhuha",
      waktu_mulai: "06:30", waktu_selesai: "07:00",
    });
    expect(p.id_jadwal).toBe(5);
    expect(p.hari).toBe("Senin");
    expect(p.jenis_sholat).toBe("Dhuha");
    expect(p.waktu_mulai).toBe("06:30");
    expect(p.waktu_selesai).toBe("07:00");
  });

  it("falls back to id for id_jadwal", () => {
    expect(normalizePrayerSchedule({ id: 10 }).id_jadwal).toBe(10);
  });
});

describe("normalizeNotification", () => {
  it("maps id, title, message, type, is_read", () => {
    const n = normalizeNotification({ id: 1, title: "T", message: "M", type: "warning", is_read: true });
    expect(n.id).toBe(1);
    expect(n.title).toBe("T");
    expect(n.message).toBe("M");
    expect(n.type).toBe("warning");
    expect(n.is_read).toBe(true);
  });

  it("defaults type to info and is_read to false", () => {
    const n = normalizeNotification({});
    expect(n.type).toBe("info");
    expect(n.is_read).toBe(false);
  });
});

describe("handleApiError", () => {
  it("returns string directly", () => {
    expect(handleApiError("oops")).toBe("oops");
  });

  it("returns error.message", () => {
    expect(handleApiError({ message: "bad" })).toBe("bad");
  });

  it("returns generic Indonesian fallback", () => {
    expect(handleApiError(42)).toBe("Terjadi kesalahan saat menghubungi server");
  });
});

describe("genderToApi / genderFromApi", () => {
  it("genderToApi Perempuan → P", () => {
    expect(genderToApi("Perempuan")).toBe("P");
  });

  it("genderToApi Laki-laki → L", () => {
    expect(genderToApi("Laki-laki")).toBe("L");
  });

  it("genderFromApi P → Perempuan", () => {
    expect(genderFromApi("P")).toBe("Perempuan");
  });

  it("genderFromApi L → Laki-laki", () => {
    expect(genderFromApi("L")).toBe("Laki-laki");
  });
});

describe("buildQueryParams", () => {
  it("omits null/undefined/empty string values", () => {
    expect(buildQueryParams({ a: null, b: undefined, c: "", d: "ok" })).toEqual({ d: "ok" });
  });

  it("keeps valid values including 0 and false", () => {
    expect(buildQueryParams({ a: 0, b: false, c: "x" })).toEqual({ a: 0, b: false, c: "x" });
  });
});
