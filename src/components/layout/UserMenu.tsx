import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../hooks/useAuth';
import './UserMenu.css';

export const UserMenu: React.FC = () => {
  const { signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 12,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  const handleSignOut = () => {
    signOut();
    setIsOpen(false);
  };

  const dropdownContent = isOpen ? (
    <>
      <div className="user-menu-overlay" onClick={() => setIsOpen(false)} />
      <div 
        className="user-menu-dropdown"
        style={{
          top: `${dropdownPosition.top}px`,
          right: `${dropdownPosition.right}px`,
        }}
      >
            <button
              className="user-menu-item"
              onClick={handleSignOut}
            >
              <span className="user-menu-icon">🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
    </>
  ) : null;

  return (
    <div className="user-menu">
      <button
        ref={buttonRef}
        className="user-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
      >
        <span className="user-menu-dots">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>

      {isOpen && createPortal(dropdownContent, document.body)}
    </div>
  );
};

