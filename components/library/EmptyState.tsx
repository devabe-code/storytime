/**
 * Empty state component for when there are no books
 */

import { BookOpen, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyStateProps } from '@/types/library';

export default function EmptyState({ 
  title, 
  description, 
  action, 
  icon = 'BookOpen' 
}: EmptyStateProps) {
  const IconComponent = icon === 'Upload' ? Upload : BookOpen;
  
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
        <IconComponent className="w-12 h-12 text-muted-foreground" />
      </div>
      
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      <p className="text-muted-foreground mb-6 max-w-md">
        {description}
      </p>
      
      {action && (
        <Button onClick={action.onClick} size="lg">
          {action.label}
        </Button>
      )}
    </div>
  );
}
