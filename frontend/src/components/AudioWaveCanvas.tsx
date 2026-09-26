import React, { useEffect, useRef } from 'react';

interface AudioWaveCanvasProps {
  className?: string;
  isActive?: boolean;
}

export const AudioWaveCanvas: React.FC<AudioWaveCanvasProps> = ({
  className = '',
  isActive = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; isHovering: boolean }>({
    x: 0,
    y: 0,
    isHovering: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let step = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        isHovering: true,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current.isHovering = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const waves = [
      {
        color: 'rgba(255, 85, 0, 0.35)',
        amplitude: 28,
        wavelength: 0.008,
        speed: 0.024,
        phase: 0,
      },
      {
        color: 'rgba(59, 130, 246, 0.25)',
        amplitude: 20,
        wavelength: 0.012,
        speed: -0.018,
        phase: Math.PI / 3,
      },
      {
        color: 'rgba(16, 185, 129, 0.22)',
        amplitude: 16,
        wavelength: 0.015,
        speed: 0.015,
        phase: Math.PI / 1.5,
      },
      {
        color: 'rgba(255, 120, 50, 0.18)',
        amplitude: 34,
        wavelength: 0.006,
        speed: -0.012,
        phase: Math.PI,
      },
    ];

    const render = () => {
      step++;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      waves.forEach((wave) => {
        ctx.beginPath();
        const baseAmp = isActive ? wave.amplitude * 1.8 : wave.amplitude;
        const baselineY = height * 0.55;

        ctx.moveTo(0, baselineY);

        for (let x = 0; x <= width; x += 4) {
          // Calculate distance to mouse cursor for interactive ripple effect
          let mouseInfluence = 0;
          if (mouseRef.current.isHovering) {
            const dx = x - mouseRef.current.x;
            const dist = Math.abs(dx);
            if (dist < 180) {
              mouseInfluence = Math.cos((dist / 180) * (Math.PI / 2)) * 24;
            }
          }

          const y =
            baselineY +
            Math.sin(x * wave.wavelength + step * wave.speed + wave.phase) *
              (baseAmp + mouseInfluence) *
              Math.sin(step * 0.01);

          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, baselineY - 40, 0, height);
        gradient.addColorStop(0, wave.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full pointer-events-auto ${className}`}
      style={{ display: 'block' }}
    />
  );
};
