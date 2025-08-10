import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
  };
}

export default function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
      <div>
        <h1 className="text-2xl font-medium text-neutral-400 dark:text-white">{title}</h1>
        {description && <p className="text-neutral-300 dark:text-gray-400">{description}</p>}
      </div>
      
      {action && (
        <div className="mt-4 sm:mt-0">
          <Button
            className="bg-primary hover:bg-primary-dark text-white"
            onClick={action.onClick}
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
