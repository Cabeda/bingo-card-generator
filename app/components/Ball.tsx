import React from 'react';
import './Ball.css';

interface BallProps {
  number: number;
  small?: boolean;
}

const Ball: React.FC<BallProps> = ({ number, small = false }) => {
  return (
    <div className={`ball-container ${small ? 'small' : ''}`}>
      <div className="ball">
        <span className="ball-number">{number}</span>
      </div>
    </div>
  );
};

export default Ball;
