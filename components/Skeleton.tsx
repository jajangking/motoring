'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  width, 
  height, 
  circle 
}) => {
  const style = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : '100%',
    height: height ? (typeof height === 'number' ? `${height}px` : height) : '1rem',
    borderRadius: circle ? '50%' : '0.5rem',
  };

  return (
    <div
      className={`animate-pulse bg-redbull-darker/50 ${className}`}
      style={style}
    />
  );
};

export default Skeleton;