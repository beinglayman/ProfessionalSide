import { useCallback } from 'react';
import confetti from 'canvas-confetti';

interface UseContainedConfettiOptions {
  particleCount?: number;
  spread?: number;
  colors?: string[];
  duration?: number;
}

export const useContainedConfetti = () => {
  const triggerContainedConfetti = useCallback(
    (containerRef: React.RefObject<HTMLElement>, options: UseContainedConfettiOptions = {}) => {
      if (!containerRef.current) return;

      const {
        particleCount = 30,
        spread = 60,
        colors = ['#5D259F', '#8B5CF6', '#A78BFA', '#C4B5FD'],
        duration = 2000
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
        myConfetti({
          particleCount,
          spread,
          colors,
          origin: {
            x: Math.random() * 0.6 + 0.2, // Random x between 20% and 80%
            y: Math.random() * 0.3 + 0.1  // Random y between 10% and 40%
          },
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