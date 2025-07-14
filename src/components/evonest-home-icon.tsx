import React from 'react';

const EvoNestHomeIcon = ({ size = 24, color = 'currentColor', strokeWidth = 2, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 100 100"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="50" cy="50" r="48" />
    <path d="M50,15 L50,85" />
    <path d="M32,32 L68,68" />
    <path d="M68,32 L32,68" />
    <circle cx="50" cy="50" r="8" fill={color} />
    <circle cx="50" cy="15" r="5" fill={color} />
    <circle cx="50" cy="85" r="5" fill={color} />
    <circle cx="32" cy="32" r="5" fill={color} />
    <circle cx="68" cy="68" r="5" fill={color} />
    <circle cx="68" cy="32" r="5" fill={color} />
    <circle cx="32" cy="68" r="5" fill={color} />
  </svg>
);

export default EvoNestHomeIcon;
