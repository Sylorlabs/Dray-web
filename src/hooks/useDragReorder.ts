import { useState, useCallback } from 'react';

export function useDragReorder<T extends { id: number }>(
  items: T[],
  onReorder: (items: T[]) => void
) {
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, id: number) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedId !== null && draggedId !== id) {
      setDropTargetId(id);
    }
  }, [draggedId]);

  const handleDragLeave = useCallback(() => {
    setDropTargetId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    setDropTargetId(null);

    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const dragIdx = items.findIndex((item) => item.id === draggedId);
    const targetIdx = items.findIndex((item) => item.id === targetId);
    if (dragIdx === -1 || targetIdx === -1) {
      setDraggedId(null);
      return;
    }

    const newItems = [...items];
    const [dragged] = newItems.splice(dragIdx, 1);
    newItems.splice(targetIdx, 0, dragged);
    onReorder(newItems);
    setDraggedId(null);
  }, [draggedId, items, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDropTargetId(null);
  }, []);

  return {
    draggedId,
    dropTargetId,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    isDragging: draggedId !== null,
  };
}
