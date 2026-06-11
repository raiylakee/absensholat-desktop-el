import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ─── PB-01: Karakter Aman & Panjang Filename ─────────────────────────
describe("PB-01: Nama berkas hanya boleh karakter aman dan max 255", () => {
  const SAFE_CHAR_REGEX = /^[a-z0-9\-\.]+$/;

  const dataTypes = [
    "laporan-absensi",
    "data-siswa",
    "qr-presensi",
    "riwayat-kehadiran",
    "riwayat-absensi-saya",
    "bukti-izin",
    "daftar-guru",
    "qr-halangan",
  ];

  const formats = ["xlsx", "csv", "pdf", "png"];

  it("200 run: filename selalu valid", async () => {
    const { generateExportFilename } = await import("../../src/lib/export-filename");

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...dataTypes),
        fc.constantFrom(...formats),
        fc.date({ min: new Date(2020, 0, 1), max: new Date(2030, 11, 31) }),
        fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
        fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
        async (dataType, format, date, filter, studentName, nis) => {
          const filename = generateExportFilename({
            dataType,
            format,
            date,
            filter: filter ?? undefined,
            studentName: studentName ?? undefined,
            nis: nis ?? undefined,
          });

          // 1. Filename must not exceed 255 characters
          expect(filename.length).toBeLessThanOrEqual(255);

          // 2. Filename must end with the correct extension
          expect(filename).toMatch(new RegExp(`\\.${format}$`));

          // 3. Characters before the extension must be safe (alphanumeric, hyphen, dot)
          const baseName = filename.replace(new RegExp(`\\.${format}$`), "");
          expect(baseName).toMatch(SAFE_CHAR_REGEX);

          // 4. Filename must not be empty
          expect(filename.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("100 run: filename dengan filter spesial karakter", async () => {
    const { generateExportFilename } = await import("../../src/lib/export-filename");

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...dataTypes),
        fc.constantFrom(...formats),
        fc.date({ min: new Date(2020, 0, 1), max: new Date(2030, 11, 31) }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (dataType, format, date, filter) => {
          const filename = generateExportFilename({ dataType, format, date, filter });

          expect(filename.length).toBeLessThanOrEqual(255);
          expect(filename).toMatch(new RegExp(`\\.${format}$`));

          const baseName = filename.replace(new RegExp(`\\.${format}$`), "");
          expect(baseName).toMatch(SAFE_CHAR_REGEX);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── PB-02: Ketetapan Ekstensi ────────────────────────────────────────
describe("PB-02: Ekstensi file selalu cocok dengan format", () => {
  const formats = ["xlsx", "csv", "pdf", "png"];

  it("100 run: ekstensi filename selalu cocok dengan format tipe", async () => {
    const { generateExportFilename } = await import("../../src/lib/export-filename");

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...formats),
        fc.constantFrom(
          "laporan-absensi",
          "data-siswa",
          "qr-presensi",
          "riwayat-kehadiran",
          "riwayat-absensi-saya",
          "bukti-izin",
          "daftar-guru",
          "qr-halangan"
        ),
        fc.date({ min: new Date(2020, 0, 1), max: new Date(2030, 11, 31) }),
        async (format, dataType, date) => {
          const filename = generateExportFilename({ dataType, format, date });

          // Extract extension from generated filename
          const lastDot = filename.lastIndexOf(".");
          const actualExtension = lastDot >= 0 ? filename.slice(lastDot + 1) : "";

          // Extension must match format exactly
          expect(actualExtension).toBe(format);
        }
      ),
      { numRuns: 100 }
    );
  });
});
