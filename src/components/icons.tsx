import {
  Home,
  Settings as SettingsIcon,
  Undo2,
  RotateCcw,
  HelpCircle,
  X,
  Trophy,
  Sparkles,
  Eye,
  Check,
  Maximize2,
  Minimize2,
  type LucideProps,
} from 'lucide-react';

export function IconHome(props: LucideProps) {
  return <Home size={20} strokeWidth={2.2} aria-hidden="true" {...props} />;
}

export function IconSettings(props: LucideProps) {
  return <SettingsIcon size={20} strokeWidth={2.2} aria-hidden="true" {...props} />;
}

export function IconUndo(props: LucideProps) {
  return <Undo2 size={20} strokeWidth={2.2} aria-hidden="true" {...props} />;
}

export function IconNewGame(props: LucideProps) {
  return <RotateCcw size={20} strokeWidth={2.2} aria-hidden="true" {...props} />;
}

export function IconHelp(props: LucideProps) {
  return <HelpCircle size={20} strokeWidth={2.2} aria-hidden="true" {...props} />;
}

export function IconClose(props: LucideProps) {
  return <X size={18} strokeWidth={2.5} aria-hidden="true" {...props} />;
}

export function IconTrophy(props: LucideProps) {
  return <Trophy size={18} strokeWidth={2.2} aria-hidden="true" {...props} />;
}

export function IconSparkles(props: LucideProps) {
  return <Sparkles size={16} strokeWidth={2} aria-hidden="true" {...props} />;
}

export function IconEye(props: LucideProps) {
  return <Eye size={18} strokeWidth={2} aria-hidden="true" {...props} />;
}

export function IconCheck(props: LucideProps) {
  return <Check size={16} strokeWidth={2.5} aria-hidden="true" {...props} />;
}

export function IconMaximize(props: LucideProps) {
  return <Maximize2 size={18} strokeWidth={2} aria-hidden="true" {...props} />;
}

export function IconMinimize(props: LucideProps) {
  return <Minimize2 size={18} strokeWidth={2} aria-hidden="true" {...props} />;
}
