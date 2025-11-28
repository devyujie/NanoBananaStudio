import React from 'react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  cancelText?: string;
  confirmText?: string;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  cancelText = "Cancel",
  confirmText = "Confirm"
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Content */}
      <div className="relative bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 space-y-6">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-zinc-100">{title}</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
        </div>
        
        <div className="flex justify-end gap-3">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            {cancelText}
          </Button>
          <Button 
            variant="default" 
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="bg-red-600 text-white hover:bg-red-700 hover:text-white border-0 ring-0"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};