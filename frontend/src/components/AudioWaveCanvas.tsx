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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number | null = null;
    let step = 0;
    let isVisible = true;

    // Pause canvas animation when off-screen to prevent scroll stutter and CPU usage
    const observer = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting;
        if (isVisible && !animationFrameId) {
          render();
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(canvas);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Smooth waves with low computational footprint
    const waves = [
      {
        color: 'rgba(255, 85, 0, 0.28)',
        amplitude: 22,
        wavelength: 0.007,
        speed: 0.02,
        phase: 0,
      },
      {
        color: 'rgba(59, 130, 246, 0.18)',
        amplitude: 16,
        wavelength: 0.01,
        speed: -0.015,
        phase: Math.PI / 2,
      },
      {
        color: 'rgba(16, 185, 129, 0.16)',
        amplitude: 14,
        wavelength: 0.012,
        speed: 0.012,
        phase: Math.PI,
      },
    ];

    const render = () => {
      if (!isVisible) {
        animationFrameId = null;
        return;
      }

      step++;
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      waves.forEach((wave) => {
        ctx.beginPath();
        const baseAmp = isActive ? wave.amplitude * 1.5 : wave.amplitude;
        const baselineY = height * 0.6;

        ctx.moveTo(0, baselineY);

        // Optimized sampling step (step of 14px instead of 4px) for 60fps performance
        const stepSize = 14;
        for (let x = 0; x <= width + stepSize; x += stepSize) {
          const y =
            baselineY +
            Math.sin(x * wave.wavelength + step * wave.speed + wave.phase) *
              baseAmp *
              Math.sin(step * 0.008);

          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, baselineY - 30, 0, height);
        gradient.addColorStop(0, wave.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full pointer-events-none ${className}`}
      style={{ display: 'block', willChange: 'transform' }}
    />
  );
};
