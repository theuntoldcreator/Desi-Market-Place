import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface ProfanityViolationModalProps {
  isOpen: boolean;
  onClose: () => void;
  violation: {
    field?: 'title' | 'description';
    word?: string;
  };
}

export function ProfanityViolationModal({ isOpen, onClose, violation }: ProfanityViolationModalProps) {
  if (!violation) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex justify-center">
            <AlertTriangle className="w-12 h-12 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center text-2xl">Content Violation Detected</AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base">
            Our system has detected inappropriate language in your listing. Please review our community guidelines and revise your content.
            <div className="mt-4 p-3 bg-muted rounded-lg text-left text-foreground">
              <p><span className="font-semibold">Field:</span> <span className="capitalize">{violation.field}</span></p>
              <p><span className="font-semibold">Violating Term:</span> "{violation.word}"</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose} className="w-full">I Understand, I'll Fix It</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}