/**
 * OTP Input Component
 * 
 * 6-digit OTP input with auto-focus, paste support, and keyboard navigation.
 */

import { useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  length?: number;
}

export default function OTPInput({ 
  value, 
  onChange, 
  onComplete, 
  disabled = false,
  length = 6 
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [disabled]);

  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, length, onComplete]);

  const handleChange = (index: number, digit: string) => {
    if (digit && !/^\d$/.test(digit)) return;

    const newValue = value.split('');
    newValue[index] = digit;
    const updatedValue = newValue.join('').slice(0, length);
    
    onChange(updatedValue);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      
      if (value[index]) {
        const newValue = value.split('');
        newValue[index] = '';
        onChange(newValue.join(''));
      } else if (index > 0) {
        const newValue = value.split('');
        newValue[index - 1] = '';
        onChange(newValue.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }

    if (e.key === 'Delete') {
      e.preventDefault();
      const newValue = value.split('');
      newValue[index] = '';
      onChange(newValue.join(''));
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    const pastedData = e.clipboardData.getData('text/plain').trim();
    
    if (!/^\d+$/.test(pastedData)) {
      return;
    }

    const digits = pastedData.slice(0, length);
    onChange(digits);

    const focusIndex = Math.min(digits.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleFocus = (index: number) => {
    inputRefs.current[index]?.select();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 focus:outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  );
}