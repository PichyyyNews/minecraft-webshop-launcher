import { useEffect, useRef } from "react";
import { IdleAnimation, SkinViewer } from "skinview3d";

type SkinAvatarProps = {
  username?: string;
};

export default function SkinAvatar({ username }: SkinAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const viewer = new SkinViewer({
      canvas: canvasRef.current,
      width: 190,
      height: 250,
    });

    viewer.controls.enableRotate = true;
    viewer.controls.enableZoom = false;
    viewer.autoRotate = false;
    viewer.animation = new IdleAnimation();
    viewerRef.current = viewer;

    return () => {
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
    <div className="skin-avatar" aria-label="Minecraft player preview">
      <canvas ref={canvasRef} />
    </div>
  );
}
