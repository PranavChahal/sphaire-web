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
  const [collaborators] = useState<CollaboratorPresence[]>([])
  const [isConnected] = useState(false)
  const [editingObject] = useState<string | null>(null)

  // All functions are no-ops since authentication is removed
  const setEditingObject = () => {}
  const broadcastTransform = () => {}
  const broadcastAddObject = () => {}
  const broadcastDeleteObject = () => {}
  const broadcastCADOperation = () => {}

  return {
    collaborators,
    isConnected,
    editingObject,
    setEditingObject,
    broadcastTransform,
    broadcastAddObject,
    broadcastDeleteObject,
    broadcastCADOperation
  }
}
