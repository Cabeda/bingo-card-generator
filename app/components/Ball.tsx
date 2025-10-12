import React from 'react';
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
  return (
    <div className={`ball-container ${small ? 'small' : ''} ${animate ? 'animate-new-ball' : ''}`}>
      <div className={`ball ${drawn ? 'drawn' : ''}`}>
        <span className="ball-number">{number}</span>
      </div>
    </div>
  );
};

export default Ball;
