import { useEffect, useRef } from "react";
import { getMomentumLabel } from "@/services/mockData";

interface Props {
  curvePercent: number;
  animated?: boolean;
}

export default function TokenMomentumBar({ curvePercent, animated = true }: Props) {
  const { label, color, description } = getMomentumLabel(curvePercent);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const progressRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const target = curvePercent / 100;
    const start = Date.now();
    const duration = animated ? 1000 : 0;

    const draw = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      progressRef.current = eased * target;

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const pts = 80;
      const path = new Path2D();
      for (let i = 0; i <= pts; i++) {
        const x = (i / pts) * W;
        const normX = i / pts;
        const curve = normX < progressRef.current
          ? Math.pow(normX / Math.max(progressRef.current, 0.01), 0.5) * 0.85
          : 0;
        const y = H - (curve * H * 0.85) - 8;
        i === 0 ? path.moveTo(x, y) : path.lineTo(x, y);
      }

      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, "#10f090");
      grad.addColorStop(0.4, "#06d6f7");
      grad.addColorStop(0.75, "#f7a606");
      grad.addColorStop(1, "#f05050");

      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke(path);

      const dotX = (progressRef.current) * W;
      const dotNorm = progressRef.current;
      const dotCurve = Math.pow(dotNorm / Math.max(progressRef.current, 0.01), 0.5) * 0.85;
      const dotY = H - (dotCurve * H * 0.85) - 8;

      ctx.beginPath();
      ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (t < 1) frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [curvePercent, animated, color]);

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "#888", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Bonding Curve
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "2px 8px",
            borderRadius: 4,
            background: `${color}18`,
            border: `1px solid ${color}40`,
          }}
        >
          {label}
        </span>
      </div>

      <canvas
        ref={canvasRef}
        width={340}
        height={56}
        style={{ width: "100%", height: 56, display: "block" }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <span style={{ fontSize: 11, color: "#888" }}>{description}</span>
        <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color }}>
          {curvePercent}%
        </span>
      </div>
    </div>
  );
}
