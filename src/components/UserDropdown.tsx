import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, User, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { TeamMember } from '../hooks/useGoals';

interface UserDropdownProps {
  value: string | null;
  users: TeamMember[];
  selectedUser?: TeamMember | null;
  onValueChange: (userId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const UserDropdown: React.FC<UserDropdownProps> = ({
  value,
  users,
  selectedUser,
  onValueChange,
  placeholder = "Select user...",
  disabled = false,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleSelect = (userId: string | null) => {
    onValueChange(userId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(null);
  };

  // Get user initials for avatar fallback
  const getUserInitials = (name: string | undefined) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div ref={dropdownRef} className={cn("relative group", className)}>
      <div className="relative">
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50 transition-colors",
            disabled && "opacity-50 cursor-not-allowed",
            isOpen && "ring-2 ring-primary-500 border-primary-500"
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedUser ? (
              <>
                {/* User Avatar */}
                <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-700 flex-shrink-0">
                  {selectedUser.avatar ? (
                    <img
                      src={selectedUser.avatar}
                      alt={selectedUser.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    getUserInitials(selectedUser.name)
                  )}
                </div>
                {/* User Name */}
                <span className="truncate">{selectedUser.name}</span>
              </>
            ) : (
              <>
                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="truncate text-gray-500">{placeholder}</span>
              </>
            )}
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 text-gray-400 transition-transform",
            isOpen && "rotate-180"
          )} />
        </button>
        
        {/* Clear button - positioned absolutely */}
        {selectedUser && (
          <button
            onClick={handleClear}
            className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded transition-colors opacity-0 group-hover:opacity-100 z-10"
            title="Remove assignment"
          >
            <X className="h-3 w-3 text-gray-400" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[9999]">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* User List */}
          <div className="max-h-60 overflow-y-auto">
            <div className="p-1">
              {/* Show unassigned option only if no search or if search doesn't match users */}
              {(!searchTerm || 'unassigned'.includes(searchTerm.toLowerCase())) && (
                <button
                  onClick={() => handleSelect(null)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors",
                    !value && "bg-primary-50 text-primary-700"
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="h-3 w-3 text-gray-500" />
                  </div>
                  <span className="flex-1 text-left text-gray-500">Unassigned</span>
                  {!value && (
                    <Check className="h-4 w-4 text-primary-600" />
                  )}
                </button>
              )}

              {/* User Options */}
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded transition-colors",
                    value === user.id && "bg-primary-50 text-primary-700"
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-700 flex-shrink-0">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      getUserInitials(user.name)
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="truncate font-medium">{user.name}</div>
                    <div className="truncate text-xs text-gray-500">{user.email}</div>
                  </div>
                  {value === user.id && (
                    <Check className="h-4 w-4 text-primary-600" />
                  )}
                </button>
              ))}

              {filteredUsers.length === 0 && searchTerm && (
                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                  No users found matching "{searchTerm}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserDropdown;