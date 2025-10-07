import { useState } from 'react'

interface CollaboratorPresence {
  user_id: string
  email: string
  editing_object?: string
  cursor_position?: { x: number; y: number; z: number }
  last_seen: string
}

interface RealtimeEvent {
  event: 'transform' | 'add_object' | 'delete_object' | 'cad_operation'
  user_id: string
  object_id?: string
  data: any
  timestamp: string
}

interface UseRealtimeCollaborationProps {
  fileId: string
  onPresenceUpdate?: (presence: CollaboratorPresence[]) => void
  onRealtimeEvent?: (event: RealtimeEvent) => void
}

// Disabled stub implementation - authentication removed
export const useRealtimeCollaboration = ({
  fileId,
  onPresenceUpdate,
  onRealtimeEvent
}: UseRealtimeCollaborationProps) => {
  // Mark unused parameters as intentionally unused for linting
  void fileId;
  void onPresenceUpdate;
  const [collaborators] = useState<CollaboratorPresence[]>([])
  const [isConnected] = useState(false)
  const [editingObject] = useState<string | null>(null)

  // All functions are no-ops since authentication is removed
  const setEditingObject = () => {}
  const broadcastTransform = () => {}
  const broadcastAddObject = () => {}
  const broadcastDeleteObject = () => {}
  const broadcastCADOperation = () => {}

  // Additional compatibility no-ops to satisfy callers
  const broadcastEvent = (event: any) => {
    // Optionally echo to onRealtimeEvent for local handling
    try { onRealtimeEvent && onRealtimeEvent(event as any) } catch {}
  }
  const startEditingObject = async (_objectId: string): Promise<boolean> => {
    // Always allow editing in stubbed mode
    return true
  }
  const stopEditingObject = () => {}
  const isObjectLocked = (_objectId: string): { email: string } | null => null
  const updateCursorPosition = (_pos: { x: number; y: number; z: number }) => {}

  return {
    collaborators,
    isConnected,
    editingObject,
    setEditingObject,
    broadcastTransform,
    broadcastAddObject,
    broadcastDeleteObject,
    broadcastCADOperation,
    // Compatibility fields
    broadcastEvent,
    startEditingObject,
    stopEditingObject,
    isObjectLocked,
    updateCursorPosition
  }
}
