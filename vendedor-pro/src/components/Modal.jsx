import React from 'react';

export default function Modal({ title, onClose, children }) {
  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <h2 style={{ fontSize: 17, marginBottom: 16 }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
