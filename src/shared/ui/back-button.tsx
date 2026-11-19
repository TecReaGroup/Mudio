import { ChevronLeft } from 'lucide-react';
import { Button } from './button';

export function BackButton({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <Button tone="ghost" onClick={onBack}>
      <ChevronLeft />
      {label}
    </Button>
  );
}
