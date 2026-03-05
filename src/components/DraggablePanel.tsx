import React, { useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, PanInfo } from 'framer-motion';

interface DraggablePanelProps {
  children: React.ReactNode;
  initialHeight?: number;
  maxHeight?: number;
  minHeight?: number;
  snapPoints?: number[];
  className?: string;
  onHeightChange?: (height: number) => void;
  onSnapPointChange?: (snapIndex: number) => void;
}

export const DraggablePanel: React.FC<DraggablePanelProps> = ({
  children,
  initialHeight = 400,
  maxHeight = 600,
  minHeight = 120,
  className = '',
  onHeightChange,
  onSnapPointChange
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Raw motion value tracks the drag in real-time
  const rawHeight = useMotionValue(initialHeight);

  // Spring-driven height for smooth, physics-based animation
  const springHeight = useSpring(rawHeight, {
    stiffness: 300,
    damping: 35,
    mass: 0.8,
  });

  // Background overlay opacity based on height
  const backgroundOpacity = useTransform(
    springHeight,
    [minHeight, maxHeight],
    [0.05, 0.25]
  );

  // Snap index derived from height for content visibility toggling
  const midPoint = (minHeight + maxHeight) / 2;

  // Report height changes back to parent
  useEffect(() => {
    const unsubscribe = springHeight.on('change', (latest) => {
      onHeightChange?.(latest);
      const snapIdx = latest > midPoint ? 1 : 0;
      onSnapPointChange?.(snapIdx);
    });
    return unsubscribe;
  }, [springHeight, midPoint, onHeightChange, onSnapPointChange]);

  const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Subtract delta.y because dragging up (negative y) should increase height
    const newHeight = rawHeight.get() - info.delta.y;
    const clamped = Math.max(minHeight, Math.min(maxHeight, newHeight));
    rawHeight.set(clamped);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const velocity = info.velocity.y;
    const currentHeight = rawHeight.get();

    // Only snap if the user flings with significant velocity
    if (Math.abs(velocity) > 600) {
      if (velocity < 0) {
        // Flick up -> expand fully
        rawHeight.set(maxHeight);
      } else {
        // Flick down -> collapse fully
        rawHeight.set(minHeight);
      }
    } else {
      // Otherwise, the panel stays exactly where the user released it
      // The spring physics will settle it smoothly at the current position
      rawHeight.set(Math.max(minHeight, Math.min(maxHeight, currentHeight)));
    }
  };

  return (
    <>
      {/* Overlay */}
      <motion.div
        className="fixed inset-0 bg-black pointer-events-none z-10"
        style={{ opacity: backgroundOpacity }}
      />

      {/* Panel */}
      <motion.div
        ref={panelRef}
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-20 will-change-transform ${className}`}
        style={{ height: springHeight }}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 30, stiffness: 260, mass: 0.6 }}
      >
        {/* Drag handle */}
        <motion.div
          className="w-full h-8 flex justify-center items-center cursor-grab active:cursor-grabbing touch-none"
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0}
          dragMomentum={false}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          whileTap={{ scale: 1.02 }}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </motion.div>

        {/* Content */}
        <motion.div
          className="px-4 pb-4 overflow-hidden"
          style={{ height: useTransform(springHeight, (h) => h - 32) }}
        >
          {children}
        </motion.div>
      </motion.div>
    </>
  );
};
