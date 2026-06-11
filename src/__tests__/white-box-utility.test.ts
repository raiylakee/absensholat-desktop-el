import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── api-utils tests ─────────────────────────────────────────────────
describe("api-utils: extractData", () => {
  it("mengembalikan [] saat response null", async () => {
    const { extractData } = await import("../../src/lib/api-utils");
    expect(extractData(null)).toEqual([]);
  });

  it("mengembalikan [] saat response undefined", async () => {
    const { extractData } = await import("../../src/lib/api-utils");
    expect(extractData(undefined)).toEqual([]);
  });

  it("mengembalikan response.data jika ada", async () => {
    const { extractData } = await import("../../src/lib/api-utils");
    expect(extractData({ data: [1, 2, 3] })).toEqual([1, 2, 3]);
  });

  it("mengembalikan response langsung jika tidak ada .data", async () => {
    const { extractData } = await import("../../src/lib/api-utils");
    expect(extractData([1, 2, 3])).toEqual([1, 2, 3]);
  });
});

describe("api-utils: extractPagination", () => {
  it("mengekstrak pagination dari response.pagination", async () => {
    const { extractPagination } = await import("../../src/lib/api-utils");
    const result = extractPagination({ pagination: { page: 2, page_size: 10, total: 50, total_pages: 5 } });
    expect(result).toEqual({ page: 2, pageSize: 10, total: 50, totalPages: 5 });
  });

  it("mengekstrak pagination dari response.meta", async () => {
    const { extractPagination } = await import("../../src/lib/api-utils");
    const result = extractPagination({ meta: { page: 1, limit: 20, total: 100, total_pages: 5 } });
    expect(result).toEqual({ page: 1, pageSize: 20, total: 100, totalPages: 5 });
  });

  it("mengembalikan default saat tidak ada pagination/meta", async () => {
    const { extractPagination } = await import("../../src/lib/api-utils");
    const result = extractPagination({});
    expect(result).toEqual({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  });
});

describe("api-utils: handleApiError", () => {
  it("menangani error string", async () => {
    const { handleApiError } = await import("../../src/lib/api-utils");
    expect(handleApiError("Terjadi kesalahan")).toBe("Terjadi kesalahan");
  });

  it("menangani error object dengan message", async () => {
    const { handleApiError } = await import("../../src/lib/api-utils");
    expect(handleApiError(new Error("Not found"))).toBe("Not found");
  });

  it("membersihkan prefix IPC boilerplate dari error message", async () => {
    const { handleApiError } = await import("../../src/lib/api-utils");
    const ipcError = "Error invoking remote method 'login': Error: Too many attempts.";
    expect(handleApiError(new Error(ipcError))).toBe("Too many attempts.");
  });

  it("mengembalikan fallback untuk error kosong", async () => {
    const { handleApiError } = await import("../../src/lib/api-utils");
    expect(handleApiError(null)).toBe("Terjadi kesalahan saat menghubungi server");
    expect(handleApiError({})).toBe("Terjadi kesalahan saat menghubungi server");
  });
});

describe("api-utils: buildQueryParams", () => {
  it("memfilter null, undefined, dan empty string", async () => {
    const { buildQueryParams } = await import("../../src/lib/api-utils");
    const result = buildQueryParams({ a: "hello", b: null, c: undefined, d: "", e: 0, f: false });
    expect(result).toEqual({ a: "hello", e: 0, f: false });
  });

  it("mengembalikan objek kosong jika semua null", async () => {
    const { buildQueryParams } = await import("../../src/lib/api-utils");
    expect(buildQueryParams({ a: null, b: undefined })).toEqual({});
  });
});

// ─── export-filename tests ────────────────────────────────────────────
describe("export-filename: generateExportFilename", () => {
  it("membuat filename laporan-absensi dengan filter", async () => {
    const { generateExportFilename } = await import("../../src/lib/export-filename");
    const result = generateExportFilename({
      dataType: "laporan-absensi",
      format: "xlsx",
      date: new Date(2025, 0, 15),
      filter: "RPL",
    });
    expect(result).toBe("laporan-absensi-rpl-2025-01-15.xlsx");
  });

  it("membuat filename laporan-absensi tanpa filter (defaults to 'semua')", async () => {
    const { generateExportFilename } = await import("../../src/lib/export-filename");
    const result = generateExportFilename({
      dataType: "laporan-absensi",
      format: "xlsx",
      date: new Date(2025, 0, 15),
    });
    expect(result).toBe("laporan-absensi-semua-2025-01-15.xlsx");
  });

  it("membuat filename data-siswa dengan filter", async () => {
    const { generateExportFilename } = await import("../../src/lib/export-filename");
    const result = generateExportFilename({
      dataType: "data-siswa",
      format: "csv",
      date: new Date(2025, 5, 1),
      filter: "TKJ",
    });
    expect(result).toBe("data-siswa-tkj-2025-06-01.csv");
  });

  it("membuat filename qr-presensi dengan waktu", async () => {
    const { generateExportFilename } = await import("../../src/lib/export-filename");
    const date = new Date(2025, 0, 15, 9, 30);
    const result = generateExportFilename({ dataType: "qr-presensi", format: "png", date });
    expect(result).toBe("qr-presensi-2025-01-15-0930.png");
  });

  it("membuat filename riwayat-kehadiran dengan nama dan NIS", async () => {
    const { generateExportFilename } = await import("../../src/lib/export-filename");
    const result = generateExportFilename({
      dataType: "riwayat-kehadiran",
      format: "csv",
      date: new Date(2025, 0, 15),
      studentName: "Ahmad Budi",
      nis: "2401001",
    });
    expect(result).toBe("riwayat-ahmad-budi-2401001-2025-01-15.csv");
  });

  it("membuat filename daftar-guru", async () => {
    const { generateExportFilename } = await import("../../src/lib/export-filename");
    const result = generateExportFilename({
      dataType: "daftar-guru",
      format: "xlsx",
      date: new Date(2025, 0, 15),
    });
    expect(result).toBe("daftar-guru-2025-01-15.xlsx");
  });

  it("membuat filename bukti-izin", async () => {
    const { generateExportFilename } = await import("../../src/lib/export-filename");
    const result = generateExportFilename({
      dataType: "bukti-izin",
      format: "pdf",
      date: new Date(2025, 0, 15),
    });
    expect(result).toBe("bukti-izin-2025-01-15.pdf");
  });

  it("membuat filename riwayat-absensi-saya", async () => {
    const { generateExportFilename } = await import("../../src/lib/export-filename");
    const result = generateExportFilename({
      dataType: "riwayat-absensi-saya",
      format: "xlsx",
      date: new Date(2025, 0, 15),
    });
    expect(result).toBe("riwayat-absensi-saya-2025-01-15.xlsx");
  });

  it("membuat filename qr-halangan", async () => {
    const { generateExportFilename } = await import("../../src/lib/export-filename");
    const result = generateExportFilename({
      dataType: "qr-halangan",
      format: "png",
      date: new Date(2025, 0, 15),
    });
    expect(result).toBe("qr-halangan-2025-01-15.png");
  });

  it("fallback untuk dataType yang tidak dikenal", async () => {
    const { generateExportFilename } = await import("../../src/lib/export-filename");
    const result = generateExportFilename({
      dataType: "custom-type" as any,
      format: "xlsx",
      date: new Date(2025, 0, 15),
    });
    expect(result).toBe("custom-type-2025-01-15.xlsx");
  });

  it("sanitize spesial karakter menjadi hyphen", async () => {
    const { generateExportFilename } = await import("../../src/lib/export-filename");
    const result = generateExportFilename({
      dataType: "data-siswa",
      format: "csv",
      date: new Date(2025, 0, 15),
      filter: "RPL 1 (A)",
    });
    expect(result).toBe("data-siswa-rpl-1-a-2025-01-15.csv");
  });

  it("menggunakan new Date() sebagai default saat date invalid", async () => {
    const { generateExportFilename } = await import("../../src/lib/export-filename");
    const result = generateExportFilename({
      dataType: "daftar-guru",
      format: "xlsx",
      date: new Date("invalid"),
    });
    // Should use current date, just verify format is correct
    expect(result).toMatch(/^daftar-guru-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});

describe("export-filename: arrayToCsv", () => {
  it("membuat CSV dengan header dan rows", async () => {
    const { arrayToCsv } = await import("../../src/lib/export-filename");
    const result = arrayToCsv(["Nama", "NIS"], [["Ahmad", "001"], ["Budi", "002"]]);
    expect(result).toBe('"Nama","NIS"\n"Ahmad","001"\n"Budi","002"');
  });

  it("escape double quotes dengan menggandakannya", async () => {
    const { arrayToCsv } = await import("../../src/lib/export-filename");
    const result = arrayToCsv(["Kolom"], [['Data "with" quotes']]);
    expect(result).toBe('"Kolom"\n"Data ""with"" quotes"');
  });
});

// ─── date-utils tests ─────────────────────────────────────────────────
describe("date-utils: formatDateID", () => {
  it("memformat Date object ke DD-MM-YYYY", async () => {
    const { formatDateID } = await import("../../src/lib/date-utils");
    const result = formatDateID(new Date(2025, 0, 15));
    expect(result).toBe("15-01-2025");
  }, 10000);

  it("memformat date string ke DD-MM-YYYY", async () => {
    const { formatDateID } = await import("../../src/lib/date-utils");
    const result = formatDateID("2025-06-01");
    expect(result).toBe("01-06-2025");
  }, 10000);

  it("mengembalikan string asli untuk date invalid", async () => {
    const { formatDateID } = await import("../../src/lib/date-utils");
    const result = formatDateID("not-a-date");
    expect(result).toBe("not-a-date");
  }, 10000);
});

describe("date-utils: formatDateTimeID", () => {
  it("memformat datetime ke DD-MM-YYYY HH:MM:SS", async () => {
    const { formatDateTimeID } = await import("../../src/lib/date-utils");
    const result = formatDateTimeID(new Date(2025, 0, 15, 14, 30, 45));
    expect(result).toMatch(/^15-01-2025 \d{2}\.\d{2}\.\d{2}$/);
  }, 10000);

  it("mengembalikan string asli untuk date invalid", async () => {
    const { formatDateTimeID } = await import("../../src/lib/date-utils");
    const result = formatDateTimeID("invalid");
    expect(result).toBe("invalid");
  }, 10000);
});
