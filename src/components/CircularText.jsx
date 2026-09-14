import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'motion/react';
import './CircularText.css';

const CircularText = ({
  text = '',
  spinDuration = 20,
  onHover = 'speedUp',
  className = ''
}) => {
  const letters = Array.from(text);
  const controls = useAnimation();
  const [currentRotation, setCurrentRotation] = useState(0);

  useEffect(() => {
    controls.start({
      rotate: currentRotation + 360,
      scale: 1,
      transition: { ease: 'linear', duration: spinDuration, repeat: Infinity }
    });
  }, [spinDuration, text, onHover, controls]);

  const handleHoverStart = () => {
    if (!onHover) return;
    switch (onHover) {
      case 'slowDown':
        controls.start({
          rotate: currentRotation + 360,
          scale: 1,
          transition: { ease: 'linear', duration: spinDuration * 2.5, repeat: Infinity }
        });
        break;
      case 'speedUp':
        controls.start({
          rotate: currentRotation + 360,
          scale: 1,
          transition: { ease: 'linear', duration: spinDuration / 4, repeat: Infinity }
        });
        break;
      case 'pause':
        controls.start({
          rotate: currentRotation,
          scale: 1,
          transition: { ease: 'linear', duration: 0 }
        });
        break;
      case 'goBonkers':
        controls.start({
          rotate: currentRotation + 360,
          scale: 0.8,
          transition: { ease: 'linear', duration: spinDuration / 20, repeat: Infinity }
        });
        break;
      default:
        break;
    }
  };

  const handleHoverEnd = () => {
    controls.start({
      rotate: currentRotation + 360,
      scale: 1,
      transition: { ease: 'linear', duration: spinDuration, repeat: Infinity }
    });
  };

  return (
    <motion.div
      initial={{ rotate: 0 }}
      className={`circular-text ${className}`}
      animate={controls}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
    >
      {letters.map((letter, i) => {
        const rotation = (360 / letters.length) * i;
        const transform = `rotate(${rotation}deg)`;

        return (
          <span
            key={i}
            style={{
              transform,
              WebkitTransform: transform
            }}
          >
            {letter === ' ' ? '\u00A0' : letter}
          </span>
        );
      })}
    </motion.div>
  );
};

export default CircularText;
