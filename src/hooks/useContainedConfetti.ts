import { useCallback } from 'react';
import confetti from 'canvas-confetti';

interface UseContainedConfettiOptions {
  particleCount?: number;
  spread?: number;
  colors?: string[];
  duration?: number;
  origin?: {
    x?: number | { min: number; max: number };
    y?: number | { min: number; max: number };
  };
}

export const useContainedConfetti = () => {
  const triggerContainedConfetti = useCallback(
    (containerRef: React.RefObject<HTMLElement>, options: UseContainedConfettiOptions = {}) => {
      if (!containerRef.current) return;

      const {
        particleCount = 30,
        spread = 60,
        colors = ['#5D259F', '#8B5CF6', '#A78BFA', '#C4B5FD'],
        duration = 2000,
        origin
      } = options;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();

      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '1000';
      canvas.width = rect.width;
      canvas.height = rect.height;

      const containerStyle = window.getComputedStyle(container);
      if (containerStyle.position === 'static') {
        container.style.position = 'relative';
      }

      container.appendChild(canvas);

      const myConfetti = confetti.create(canvas, {
        resize: true,
        useWorker: true
      });

      const fireConfetti = () => {
        // Calculate origin x
        let originX: number;
        if (origin?.x !== undefined) {
          if (typeof origin.x === 'number') {
            originX = origin.x;
          } else {
            originX = Math.random() * (origin.x.max - origin.x.min) + origin.x.min;
          }
        } else {
          originX = Math.random() * 0.6 + 0.2; // Default: Random x between 20% and 80%
        }

        // Calculate origin y
        let originY: number;
        if (origin?.y !== undefined) {
          if (typeof origin.y === 'number') {
            originY = origin.y;
          } else {
            originY = Math.random() * (origin.y.max - origin.y.min) + origin.y.min;
          }
        } else {
          originY = Math.random() * 0.3 + 0.1; // Default: Random y between 10% and 40%
        }

        myConfetti({
          particleCount,
          spread,
          colors,
          origin: { x: originX, y: originY },
          gravity: 0.8,
          scalar: 0.8,
          drift: 0,
          ticks: 150
        });
      };

      fireConfetti();
      setTimeout(fireConfetti, 250);
      setTimeout(fireConfetti, 500);

      setTimeout(() => {
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
      }, duration);
    },
    []
  );

  return { triggerContainedConfetti };
};