import { useEffect, useRef } from "react";
import { IdleAnimation, SkinViewer } from "skinview3d";

type SkinAvatarProps = {
  username?: string;
};

export default function SkinAvatar({ username }: SkinAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const w = Math.min(container.clientWidth, 220);
    const h = Math.min(container.clientHeight, 300);

    const viewer = new SkinViewer({
      canvas: canvasRef.current,
      width: w,
      height: h,
    });

    viewer.controls.enableRotate = true;
    viewer.controls.enableZoom = false;
    viewer.autoRotate = false;
    viewer.animation = new IdleAnimation();
    viewerRef.current = viewer;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newW = Math.min(entry.contentRect.width, 220);
        const newH = Math.min(entry.contentRect.height, 300);
        if (newW > 0 && newH > 0) {
          viewer.width = newW;
          viewer.height = newH;
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      viewer.dispose();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const skinName = username || "steve";
    viewer
      .loadSkin(`https://mineskin.eu/skin/${encodeURIComponent(skinName)}`)
      .catch(() => {
        viewer.loadSkin("https://mineskin.eu/skin/steve");
        viewer.animation = new IdleAnimation();
      });
  }, [username]);

  return (
    <div className="skin-avatar" ref={containerRef} aria-label="Minecraft player preview">
      <canvas ref={canvasRef} />
    </div>
  );
}
