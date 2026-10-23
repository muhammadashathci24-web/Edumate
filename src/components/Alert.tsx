import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

interface AlertProps {
  type?: 'danger' | 'success' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type = 'danger', message, onClose }) => {
  if (!message) return null;

  const icons = {
    danger: <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />,
    success: <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />,
    warning: <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />,
    info: <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />,
  };

  return (
    <div className={`alert alert-${type}`} role="alert" aria-live="polite">
      {icons[type]}
      <div style={{ flex: 1 }}>{message}</div>
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          aria-label="Close notification"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0 4px' }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
