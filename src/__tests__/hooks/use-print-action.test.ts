import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePrintAction } from "@/hooks/use-print-action";
import { notify } from "@/lib/notify";

vi.mock("@/lib/notify", () => ({
  notify: vi.fn(),
}));

const mockNotify = vi.mocked(notify);

describe("usePrintAction", () => {
  let originalPrint: typeof window.print;

  beforeEach(() => {
    originalPrint = window.print;
    vi.clearAllMocks();
    // Reset body classes
    document.body.className = "";
  });

  afterEach(() => {
    window.print = originalPrint;
    document.body.className = "";
  });

  it("should return a print function", () => {
    const { result } = renderHook(() => usePrintAction());
    expect(typeof result.current.print).toBe("function");
  });

  it("should add 'printing' class to document.body before calling window.print()", () => {
    let classNameDuringPrint = "";
    window.print = vi.fn(() => {
      classNameDuringPrint = document.body.className;
    });

    const { result } = renderHook(() => usePrintAction());
    act(() => {
      result.current.print();
    });

    expect(classNameDuringPrint).toContain("printing");
  });

  it("should call window.print()", () => {
    window.print = vi.fn();
    const { result } = renderHook(() => usePrintAction());

    act(() => {
      result.current.print();
    });

    expect(window.print).toHaveBeenCalledOnce();
  });

  it("should remove 'printing' class from document.body after window.print()", () => {
    window.print = vi.fn();
    const { result } = renderHook(() => usePrintAction());

    act(() => {
      result.current.print();
    });

    expect(document.body.classList.contains("printing")).toBe(false);
  });

  it("should remove 'printing' class even when window.print() throws", () => {
    window.print = vi.fn(() => {
      throw new Error("Print failed");
    });

    const { result } = renderHook(() => usePrintAction());

    act(() => {
      result.current.print();
    });

    expect(document.body.classList.contains("printing")).toBe(false);
  });

  it("should call notify with error message when window.print() throws an Error", () => {
    const errorMessage = "Print dialog unavailable";
    window.print = vi.fn(() => {
      throw new Error(errorMessage);
    });

    const { result } = renderHook(() => usePrintAction());

    act(() => {
      result.current.print();
    });

    expect(mockNotify).toHaveBeenCalledWith(
      `Gagal membuka dialog cetak: ${errorMessage}`,
      "error"
    );
  });

  it("should call notify with stringified error when window.print() throws a non-Error", () => {
    window.print = vi.fn(() => {
      throw "unexpected string error";
    });

    const { result } = renderHook(() => usePrintAction());

    act(() => {
      result.current.print();
    });

    expect(mockNotify).toHaveBeenCalledWith(
      "Gagal membuka dialog cetak: unexpected string error",
      "error"
    );
  });

  it("should not call notify when window.print() succeeds", () => {
    window.print = vi.fn();
    const { result } = renderHook(() => usePrintAction());

    act(() => {
      result.current.print();
    });

    expect(mockNotify).not.toHaveBeenCalled();
  });
});
