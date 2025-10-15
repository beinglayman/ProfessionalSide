import * as React from 'react';
import { cn } from '../../lib/utils';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e);
      }
      if (onCheckedChange) {
        onCheckedChange(e.target.checked);
      }
    };

    return (
      <input
        type="checkbox"
        className={cn(
          'h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer',
          className
        )}
        checked={checked}
        onChange={handleChange}
        ref={ref}
        {...props}
      />
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
