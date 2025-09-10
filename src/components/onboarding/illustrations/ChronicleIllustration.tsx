import React from 'react';

interface ChronicleIllustrationProps {
  className?: string;
  width?: number;
  height?: number;
}

export const ChronicleIllustration: React.FC<ChronicleIllustrationProps> = ({
  className = '',
  width = 300,
  height = 240
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 300 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background gradient */}
      <defs>
        <linearGradient id="chronicleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F3EBFC" />
          <stop offset="100%" stopColor="#E7D7F9" />
        </linearGradient>
        <linearGradient id="documentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F8F9FA" />
        </linearGradient>
      </defs>
      
      {/* Background shape */}
      <ellipse cx="150" cy="200" rx="120" ry="30" fill="#E7D7F9" opacity="0.3" />
      
      {/* Person figure */}
      <g>
        {/* Head */}
        <circle cx="150" cy="60" r="20" fill="#CFAFF3" />
        
        {/* Body */}
        <ellipse cx="150" cy="110" rx="25" ry="35" fill="#5D259F" />
        
        {/* Arms */}
        <ellipse cx="125" cy="95" rx="8" ry="20" fill="#5D259F" transform="rotate(-20 125 95)" />
        <ellipse cx="175" cy="95" rx="8" ry="20" fill="#5D259F" transform="rotate(30 175 95)" />
        
        {/* Legs */}
        <ellipse cx="140" cy="160" rx="8" ry="25" fill="#4B1E80" />
        <ellipse cx="160" cy="160" rx="8" ry="25" fill="#4B1E80" />
      </g>
      
      {/* Document/Journal */}
      <g>
        <rect x="190" y="80" width="80" height="100" rx="4" fill="url(#documentGradient)" stroke="#5D259F" strokeWidth="2" />
        
        {/* Document lines */}
        <line x1="200" y1="95" x2="260" y2="95" stroke="#CFAFF3" strokeWidth="2" />
        <line x1="200" y1="105" x2="255" y2="105" stroke="#CFAFF3" strokeWidth="2" />
        <line x1="200" y1="115" x2="265" y2="115" stroke="#CFAFF3" strokeWidth="2" />
        <line x1="200" y1="125" x2="250" y2="125" stroke="#CFAFF3" strokeWidth="2" />
        
        {/* Achievement badge */}
        <circle cx="235" cy="145" r="15" fill="#5D259F" />
        <circle cx="235" cy="145" r="10" fill="#B787ED" />
        <path d="M230 145 L233 148 L240 141" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      
      {/* Pen */}
      <g>
        <line x1="170" y1="85" x2="185" y2="100" stroke="#391660" strokeWidth="3" strokeLinecap="round" />
        <circle cx="187" cy="102" r="2" fill="#391660" />
        
        {/* Pen tip */}
        <circle cx="168" cy="83" r="1.5" fill="#391660" />
      </g>
      
      {/* Sparkles/Success indicators */}
      <g>
        <circle cx="120" cy="50" r="2" fill="#B787ED" opacity="0.8" />
        <circle cx="280" cy="60" r="1.5" fill="#9F5FE7" opacity="0.6" />
        <circle cx="100" cy="120" r="1" fill="#CFAFF3" opacity="0.7" />
        <circle cx="270" cy="150" r="2" fill="#5D259F" opacity="0.5" />
        
        {/* Star shapes */}
        <path d="M130 40 L132 44 L136 44 L133 47 L134 51 L130 49 L126 51 L127 47 L124 44 L128 44 Z" fill="#B787ED" opacity="0.6" />
        <path d="M285 40 L287 44 L291 44 L288 47 L289 51 L285 49 L281 51 L282 47 L279 44 L283 44 Z" fill="#9F5FE7" opacity="0.4" />
      </g>
      
      {/* Secure vault indicator */}
      <g>
        <rect x="50" y="140" width="30" height="35" rx="3" fill="#391660" />
        <circle cx="65" cy="152" r="6" fill="none" stroke="#B787ED" strokeWidth="2" />
        <circle cx="65" cy="152" r="2" fill="#B787ED" />
        
        {/* Lock shackle */}
        <path d="M59 148 Q59 143 65 143 Q71 143 71 148" stroke="#B787ED" strokeWidth="2" fill="none" />
        
        {/* Shield pattern */}
        <path d="M40 160 Q40 155 45 155 Q50 155 50 160 L50 170 Q45 175 40 170 Z" fill="#5D259F" opacity="0.3" />
      </g>
    </svg>
  );
};