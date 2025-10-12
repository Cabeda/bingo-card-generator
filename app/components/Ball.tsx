'use client';
import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'motion/react';
import './Ball.css';

interface BallProps {
  number: number;
  small?: boolean;
  drawn?: boolean;
  animate?: boolean;
}

const Ball: React.FC<BallProps> = ({ 
  number, 
  small = false, 
  drawn = false, 
  animate = false
}) => {
  const controls = useAnimation();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (animate && !isAnimating) {
      setIsAnimating(true);
      
      const runAnimation = async () => {
        // Zoom in quickly
        await controls.start({
          scale: 6,
          zIndex: 9999,
          transition: {
            type: "spring",
            stiffness: 200,
            damping: 20,
            duration: 0.5
          }
        });
        
        // Hold at max size
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Bounce back with spring physics
        await controls.start({
          scale: 1,
          zIndex: 1,
          transition: {
            type: "spring",
            stiffness: 300,
            damping: 25,
            bounce: 0.4
          }
        });
        
        setIsAnimating(false);
      };
      
      runAnimation();
    }
  }, [animate, controls, isAnimating]);

  return (
    <motion.div 
      className={`ball-container ${small ? 'small' : ''}`}
      animate={controls}
      initial={{ scale: 1, zIndex: 1 }}
      style={{ position: 'relative' }}
    >
      <motion.div 
        className={`ball ${drawn ? 'drawn' : ''}`}
        animate={
          animate && isAnimating ? {
            boxShadow: '0 0 60px rgba(255, 193, 7, 0.9)',
          } : {
            boxShadow: drawn ? '0 0 10px rgba(255, 193, 7, 0.3)' : '0 0 10px rgba(0, 0, 0, 0.5)',
          }
        }
        transition={{
          duration: 0.3,
        }}
      >
        <span className="ball-number">{number}</span>
      </motion.div>
    </motion.div>
  );
};

export default Ball;
