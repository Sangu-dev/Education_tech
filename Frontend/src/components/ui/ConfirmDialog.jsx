import { AlertTriangle } from 'lucide-react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <AlertTriangle size={26} className="text-rose-400" />
        </div>
        <div>
          <h3 className="text-lg font-display font-bold text-white mb-1">{title}</h3>
          <p className="text-sm text-slate-400">{message}</p>
        </div>
        <div className="flex items-center gap-3 w-full">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={variant} className="flex-1" onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
