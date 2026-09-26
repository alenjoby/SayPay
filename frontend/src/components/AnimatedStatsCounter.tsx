import React, { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  end: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  reverse?: boolean;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  end,
  prefix = '',
  suffix = '',
  duration = 1800,
  reverse = false,
}) => {
  const [count, setCount] = useState(reverse ? 100 : 0);
  const [hasStarted, setHasStarted] = useState(false);
  const elementRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.3 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    let startTime: number | null = null;
    let animationFrameId: number;

    const startVal = reverse ? 100 : 0;
    const targetVal = end;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      const currentVal = Math.round(startVal + (targetVal - startVal) * easedProgress);
      setCount(currentVal);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [hasStarted, end, duration, reverse]);

  return (
    <span ref={elementRef} className="tabular-nums font-black">
      {prefix}
      {count}
      {suffix}
    </span>
  );
};
