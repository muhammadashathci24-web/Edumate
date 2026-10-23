import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = <Inbox className="empty-state-icon" />,
}) => {
  return (
    <div className="empty-state" role="status">
      {icon}
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-text">{description}</p>
    </div>
  );
};
