const directions = [
  { cls: "top-0 left-0 right-0 h-[6px] cursor-n-resize", dir: "North" },
  { cls: "bottom-0 left-0 right-0 h-[6px] cursor-s-resize", dir: "South" },
  { cls: "left-0 top-0 bottom-0 w-[6px] cursor-w-resize", dir: "West" },
  { cls: "right-0 top-0 bottom-0 w-[6px] cursor-e-resize", dir: "East" },
  { cls: "top-0 left-0 w-[6px] h-[6px] cursor-nw-resize", dir: "NorthWest" },
  { cls: "top-0 right-0 w-[6px] h-[6px] cursor-ne-resize", dir: "NorthEast" },
  { cls: "bottom-0 left-0 w-[6px] h-[6px] cursor-sw-resize", dir: "SouthWest" },
  { cls: "bottom-0 right-0 w-[6px] h-[6px] cursor-se-resize", dir: "SouthEast" },
] as const;

export function ResizeHandle() {
  // With frame:false, Electron handles edge resizing natively.
  // These divs provide visual cursor feedback on the resize zones.
  return (
    <>
      {directions.map(({ cls, dir }) => (
        <div
          key={dir}
          className={`fixed z-[9999] ${cls}`}
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        />
      ))}
    </>
  );
}
