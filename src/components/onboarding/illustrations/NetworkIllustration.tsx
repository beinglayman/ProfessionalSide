import React from 'react';

interface NetworkIllustrationProps {
  className?: string;
  width?: number;
  height?: number;
}

export const NetworkIllustration: React.FC<NetworkIllustrationProps> = ({
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
        <linearGradient id="networkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F3EBFC" />
          <stop offset="100%" stopColor="#E7D7F9" />
        </linearGradient>
        <radialGradient id="connectionGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#B787ED" opacity="0.6" />
          <stop offset="100%" stopColor="#5D259F" opacity="0.2" />
        </radialGradient>
      </defs>
      
      {/* Background */}
      <rect width="300" height="240" fill="url(#networkGradient)" opacity="0.3" />
      
      {/* Connection lines */}
      <g stroke="#5D259F" strokeWidth="2" opacity="0.4">
        <line x1="150" y1="120" x2="80" y2="60" />
        <line x1="150" y1="120" x2="220" y2="60" />
        <line x1="150" y1="120" x2="60" y2="160" />
        <line x1="150" y1="120" x2="240" y2="160" />
        <line x1="80" y1="60" x2="220" y2="60" />
        <line x1="60" y1="160" x2="240" y2="160" />
        <line x1="80" y1="60" x2="60" y2="160" />
        <line x1="220" y1="60" x2="240" y2="160" />
      </g>
      
      {/* Central person (main user) */}
      <g>
        <circle cx="150" cy="120" r="25" fill="url(#connectionGradient)" />
        <circle cx="150" cy="105" r="12" fill="#5D259F" />
        <ellipse cx="150" cy="135" rx="15" ry="20" fill="#5D259F" />
        
        {/* Crown/special indicator */}
        <path d="M140 95 L145 90 L150 95 L155 90 L160 95 L155 100 L145 100 Z" fill="#B787ED" />
      </g>
      
      {/* Network connections - Top left */}
      <g>
        <circle cx="80" cy="60" r="18" fill="#CFAFF3" opacity="0.8" />
        <circle cx="80" cy="50" r="8" fill="#391660" />
        <ellipse cx="80" cy="70" rx="10" ry="12" fill="#391660" />
      </g>
      
      {/* Network connections - Top right */}
      <g>
        <circle cx="220" cy="60" r="18" fill="#CFAFF3" opacity="0.8" />
        <circle cx="220" cy="50" r="8" fill="#391660" />
        <ellipse cx="220" cy="70" rx="10" ry="12" fill="#391660" />
      </g>
      
      {/* Network connections - Bottom left */}
      <g>
        <circle cx="60" cy="160" r="18" fill="#CFAFF3" opacity="0.8" />
        <circle cx="60" cy="150" r="8" fill="#391660" />
        <ellipse cx="60" cy="170" rx="10" ry="12" fill="#391660" />
      </g>
      
      {/* Network connections - Bottom right */}
      <g>
        <circle cx="240" cy="160" r="18" fill="#CFAFF3" opacity="0.8" />
        <circle cx="240" cy="150" r="8" fill="#391660" />
        <ellipse cx="240" cy="170" rx="10" ry="12" fill="#391660" />
      </g>
      
      {/* Activity indicators */}
      <g>
        {/* Feed/Activity symbols */}
        <rect x="25" y="30" width="20" height="15" rx="2" fill="#B787ED" opacity="0.6" />
        <line x1="28" y1="35" x2="42" y2="35" stroke="#FFFFFF" strokeWidth="1" />
        <line x1="28" y1="38" x2="40" y2="38" stroke="#FFFFFF" strokeWidth="1" />
        <line x1="28" y1="41" x2="38" y2="41" stroke="#FFFFFF" strokeWidth="1" />
        
        <rect x="255" y="30" width="20" height="15" rx="2" fill="#B787ED" opacity="0.6" />
        <line x1="258" y1="35" x2="272" y2="35" stroke="#FFFFFF" strokeWidth="1" />
        <line x1="258" y1="38" x2="270" y2="38" stroke="#FFFFFF" strokeWidth="1" />
        <line x1="258" y1="41" x2="268" y2="41" stroke="#FFFFFF" strokeWidth="1" />
        
        <rect x="25" y="200" width="20" height="15" rx="2" fill="#B787ED" opacity="0.6" />
        <line x1="28" y1="205" x2="42" y2="205" stroke="#FFFFFF" strokeWidth="1" />
        <line x1="28" y1="208" x2="40" y2="208" stroke="#FFFFFF" strokeWidth="1" />
        <line x1="28" y1="211" x2="38" y2="211" stroke="#FFFFFF" strokeWidth="1" />
        
        <rect x="255" y="200" width="20" height="15" rx="2" fill="#B787ED" opacity="0.6" />
        <line x1="258" y1="205" x2="272" y2="205" stroke="#FFFFFF" strokeWidth="1" />
        <line x1="258" y1="208" x2="270" y2="208" stroke="#FFFFFF" strokeWidth="1" />
        <line x1="258" y1="211" x2="268" y2="211" stroke="#FFFFFF" strokeWidth="1" />
      </g>
      
      {/* Connection pulses */}
      <g>
        <circle cx="115" cy="90" r="3" fill="#5D259F" opacity="0.8">
          <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="185" cy="90" r="3" fill="#5D259F" opacity="0.6">
          <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="105" cy="140" r="3" fill="#5D259F" opacity="0.7">
          <animate attributeName="opacity" values="0.7;0.1;0.7" dur="1.8s" repeatCount="indefinite" />
        </circle>
        <circle cx="195" cy="140" r="3" fill="#5D259F" opacity="0.5">
          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.2s" repeatCount="indefinite" />
        </circle>
      </g>
      
      {/* Network strength indicators */}
      <g>
        {/* Core network badge */}
        <circle cx="100" cy="30" r="12" fill="#5D259F" />
        <text x="100" y="35" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">C</text>
        
        {/* Extended network badge */}
        <circle cx="200" cy="210" r="12" fill="#B787ED" />
        <text x="200" y="215" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold">E</text>
      </g>
      
      {/* Floating connection symbols */}
      <g opacity="0.6">
        <path d="M270 100 Q275 95 280 100 Q275 105 270 100" fill="#9F5FE7" />
        <path d="M20 140 Q25 135 30 140 Q25 145 20 140" fill="#9F5FE7" />
        <circle cx="50" cy="100" r="2" fill="#CFAFF3" />
        <circle cx="250" cy="130" r="2" fill="#CFAFF3" />
      </g>
    </svg>
  );
};