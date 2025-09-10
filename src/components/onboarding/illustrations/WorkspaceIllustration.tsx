import React from 'react';

interface WorkspaceIllustrationProps {
  className?: string;
  width?: number;
  height?: number;
}

export const WorkspaceIllustration: React.FC<WorkspaceIllustrationProps> = ({
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
        <linearGradient id="workspaceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F3EBFC" />
          <stop offset="100%" stopColor="#E7D7F9" />
        </linearGradient>
        <linearGradient id="dashboardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F8F9FA" />
        </linearGradient>
        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5D259F" />
          <stop offset="100%" stopColor="#B787ED" />
        </linearGradient>
      </defs>
      
      {/* Background */}
      <ellipse cx="150" cy="200" rx="140" ry="35" fill="#E7D7F9" opacity="0.4" />
      
      {/* Main person figure */}
      <g>
        <circle cx="80" cy="60" r="16" fill="#CFAFF3" />
        <ellipse cx="80" cy="90" rx="20" ry="25" fill="#5D259F" />
        <ellipse cx="65" cy="80" rx="6" ry="15" fill="#5D259F" transform="rotate(-15 65 80)" />
        <ellipse cx="95" cy="80" rx="6" ry="15" fill="#5D259F" transform="rotate(15 95 80)" />
        <ellipse cx="70" cy="125" rx="6" ry="20" fill="#4B1E80" />
        <ellipse cx="90" cy="125" rx="6" ry="20" fill="#4B1E80" />
      </g>
      
      {/* Dashboard/Analytics screen */}
      <g>
        <rect x="120" y="40" width="160" height="120" rx="8" fill="url(#dashboardGradient)" stroke="#5D259F" strokeWidth="2" />
        
        {/* Dashboard header */}
        <rect x="130" y="50" width="140" height="20" rx="4" fill="#5D259F" opacity="0.1" />
        <text x="200" y="63" textAnchor="middle" fill="#5D259F" fontSize="12" fontWeight="bold">My Workspace</text>
        
        {/* Progress bars */}
        <rect x="135" y="80" width="80" height="8" rx="4" fill="#E7D7F9" />
        <rect x="135" y="80" width="60" height="8" rx="4" fill="url(#progressGradient)" />
        <text x="230" y="87" fill="#5D259F" fontSize="10">75%</text>
        
        <rect x="135" y="100" width="80" height="8" rx="4" fill="#E7D7F9" />
        <rect x="135" y="100" width="40" height="8" rx="4" fill="url(#progressGradient)" />
        <text x="230" y="107" fill="#5D259F" fontSize="10">50%</text>
        
        <rect x="135" y="120" width="80" height="8" rx="4" fill="#E7D7F9" />
        <rect x="135" y="120" width="70" height="8" rx="4" fill="url(#progressGradient)" />
        <text x="230" y="127" fill="#5D259F" fontSize="10">90%</text>
        
        {/* Chart/Analytics */}
        <g stroke="#5D259F" strokeWidth="2" fill="none">
          <path d="M135 140 L155 135 L175 130 L195 125 L215 120" />
          <circle cx="135" cy="140" r="2" fill="#5D259F" />
          <circle cx="155" cy="135" r="2" fill="#5D259F" />
          <circle cx="175" cy="130" r="2" fill="#5D259F" />
          <circle cx="195" cy="125" r="2" fill="#5D259F" />
          <circle cx="215" cy="120" r="2" fill="#5D259F" />
        </g>
      </g>
      
      {/* Goal/Task checklist */}
      <g>
        <rect x="40" y="160" width="100" height="60" rx="6" fill="#FFFFFF" stroke="#CFAFF3" strokeWidth="2" />
        
        {/* Checklist items */}
        <circle cx="50" cy="175" r="4" fill="#5D259F" />
        <path d="M47 175 L49 177 L53 173" stroke="#FFFFFF" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <line x1="60" y1="175" x2="125" y2="175" stroke="#5D259F" strokeWidth="1" />
        
        <circle cx="50" cy="190" r="4" fill="#5D259F" />
        <path d="M47 190 L49 192 L53 188" stroke="#FFFFFF" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <line x1="60" y1="190" x2="120" y2="190" stroke="#5D259F" strokeWidth="1" />
        
        <circle cx="50" cy="205" r="4" fill="#E7D7F9" stroke="#5D259F" strokeWidth="1" />
        <line x1="60" y1="205" x2="115" y2="205" stroke="#CFAFF3" strokeWidth="1" />
      </g>
      
      {/* Team collaboration indicators */}
      <g>
        {/* Small team member avatars */}
        <circle cx="250" cy="180" r="12" fill="#CFAFF3" />
        <circle cx="250" cy="170" r="6" fill="#391660" />
        <ellipse cx="250" cy="185" rx="8" ry="10" fill="#391660" />
        
        <circle cx="270" cy="195" r="12" fill="#B787ED" />
        <circle cx="270" cy="185" r="6" fill="#391660" />
        <ellipse cx="270" cy="200" rx="8" ry="10" fill="#391660" />
        
        <circle cx="230" cy="200" r="12" fill="#9F5FE7" />
        <circle cx="230" cy="190" r="6" fill="#391660" />
        <ellipse cx="230" cy="205" rx="8" ry="10" fill="#391660" />
        
        {/* Connection lines */}
        <line x1="240" y1="190" x2="260" y2="185" stroke="#5D259F" strokeWidth="1" opacity="0.5" />
        <line x1="250" y1="195" x2="260" y2="205" stroke="#5D259F" strokeWidth="1" opacity="0.5" />
      </g>
      
      {/* Success indicators */}
      <g>
        {/* Trophy/Achievement */}
        <rect x="160" y="170" width="20" height="25" rx="3" fill="#B787ED" />
        <circle cx="170" cy="175" r="8" fill="#5D259F" />
        <path d="M165 175 L168 178 L175 171" stroke="#FFFFFF" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <rect x="162" y="195" width="16" height="6" rx="2" fill="#391660" />
        
        {/* Celebration sparkles */}
        <circle cx="200" cy="30" r="2" fill="#B787ED" opacity="0.8" />
        <circle cx="50" cy="40" r="1.5" fill="#9F5FE7" opacity="0.6" />
        <circle cx="280" cy="50" r="1" fill="#CFAFF3" opacity="0.7" />
        <circle cx="30" cy="100" r="2" fill="#5D259F" opacity="0.5" />
        
        {/* Stars */}
        <path d="M190 20 L192 24 L196 24 L193 27 L194 31 L190 29 L186 31 L187 27 L184 24 L188 24 Z" fill="#B787ED" opacity="0.7" />
        <path d="M40 180 L42 184 L46 184 L43 187 L44 191 L40 189 L36 191 L37 187 L34 184 L38 184 Z" fill="#9F5FE7" opacity="0.5" />
      </g>
      
      {/* Workspace indicators */}
      <g opacity="0.6">
        <rect x="20" y="20" width="15" height="12" rx="2" fill="#5D259F" />
        <text x="27.5" y="29" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">W</text>
        
        <circle cx="280" cy="25" r="8" fill="#CFAFF3" />
        <text x="280" y="29" textAnchor="middle" fill="#391660" fontSize="8" fontWeight="bold">+</text>
      </g>
      
      {/* Milestone indicators */}
      <g>
        <circle cx="140" cy="25" r="6" fill="#5D259F" />
        <circle cx="140" cy="25" r="3" fill="#B787ED" />
        
        <circle cx="160" cy="25" r="6" fill="#5D259F" />
        <circle cx="160" cy="25" r="3" fill="#B787ED" />
        
        <circle cx="180" cy="25" r="6" fill="#E7D7F9" stroke="#5D259F" strokeWidth="1" />
        
        <line x1="146" y1="25" x2="154" y2="25" stroke="#5D259F" strokeWidth="2" />
        <line x1="166" y1="25" x2="174" y2="25" stroke="#CFAFF3" strokeWidth="2" />
      </g>
    </svg>
  );
};