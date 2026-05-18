import { notify } from "@/lib/notify";

export interface UsePrintActionReturn {
  print: () => void;
}

export function usePrintAction(): UsePrintActionReturn {
  const print = () => {
    document.body.classList.add("printing");
    try {
      window.print();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      notify(`Gagal membuka dialog cetak: ${message}`, "error");
    } finally {
      document.body.classList.remove("printing");
    }
  };

  return { print };
}
