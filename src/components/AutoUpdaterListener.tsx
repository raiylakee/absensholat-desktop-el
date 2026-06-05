import { useEffect } from "react";
import { toast } from "sonner";

export function AutoUpdaterListener() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI) return;

    let downloadToastId: string | number | null = null;

    const unsubscribeStatus = window.electronAPI.onUpdateStatus((status, info) => {
      console.log(`[AutoUpdater] Status: ${status}`, info);

      switch (status) {
        case "available":
          downloadToastId = toast.loading(`Pembaruan tersedia (v${info.version}). Mengunduh...`, {
            duration: Infinity,
          });
          break;

        case "downloaded":
          if (downloadToastId) {
            toast.dismiss(downloadToastId);
            downloadToastId = null;
          }
          toast.success("Pembaruan selesai diunduh!", {
            description: "Restart aplikasi sekarang untuk memasang versi terbaru.",
            action: {
              label: "Restart",
              onClick: () => {
                window.electronAPI.quitAndInstall();
              },
            },
            duration: Infinity,
          });
          break;

        case "error":
          if (downloadToastId) {
            toast.dismiss(downloadToastId);
            downloadToastId = null;
          }
          console.error("AutoUpdater error:", info);
          break;

        default:
          break;
      }
    });

    const unsubscribeProgress = window.electronAPI.onUpdateProgress((percent) => {
      console.log(`[AutoUpdater] Progress: ${percent}%`);
      if (downloadToastId) {
        toast.loading(`Mengunduh pembaruan... ${Math.round(percent)}%`, {
          id: downloadToastId,
        });
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeProgress();
      if (downloadToastId) {
        toast.dismiss(downloadToastId);
      }
    };
  }, []);

  return null;
}
