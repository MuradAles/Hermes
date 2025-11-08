import React, { useRef, useEffect } from 'react';
import './FlightActionsMenu.css';

interface FlightActionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
  onReschedule?: () => void;
  canReschedule: boolean;
}

export const FlightActionsMenu: React.FC<FlightActionsMenuProps> = ({
  isOpen,
  onClose,
  onCancel,
  onReschedule,
  canReschedule
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="flight-actions-menu" ref={menuRef}>
      {canReschedule && onReschedule && (
        <button 
          className="menu-item menu-item-reschedule"
          onClick={(e) => {
            e.stopPropagation();
            onReschedule();
            onClose();
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 8v4M10 10h4M8 2.667V1.333M3.757 3.757l-.943-.943M1.333 8H0M3.757 12.243l-.943.943M8 14.667v1.333M13.243 12.243l.943.943M14.667 8H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Reschedule</span>
        </button>
      )}
      <button 
        className="menu-item menu-item-cancel"
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
          onClose();
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Cancel Flight</span>
      </button>
    </div>
  );
};

