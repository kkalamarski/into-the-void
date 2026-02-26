import { useEffect, useRef } from 'react';
import { useModalStackStore } from '../store/modalStackStore';

export function useModalStack(id: string, onClose: () => void): void {
  const push = useModalStackStore((s) => s.push);
  const popById = useModalStackStore((s) => s.popById);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    push(id, () => onCloseRef.current());
    return () => popById(id);
  }, [id, push, popById]);
}
