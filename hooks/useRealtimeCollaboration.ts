import { useEffect, useState, useRef } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// Define a type for the raw presence data from Supabase
type RawPresenceData = Record<string, any>;

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

export const useRealtimeCollaboration = ({
  fileId,
  onPresenceUpdate,
  onRealtimeEvent
}: UseRealtimeCollaborationProps) => {
  const { user } = useAuth()
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [editingObject, setEditingObjectState] = useState<string | null>(null)

  // Use ref to track the latest editing object for cleanup
  const editingObjectRef = useRef<string | null>(null)

  useEffect(() => {
    if (!fileId || !user) return

    // Create channel for this file
    const fileChannel = supabase.channel(`file-edit-${fileId}`, {
      config: {
        presence: { key: user.id },
        broadcast: { self: true }
      }
    })

    // Track presence (who's online and what they're editing)
    fileChannel
      .on('presence', { event: 'sync' }, () => {
        const state = fileChannel.presenceState()
        const presenceList: CollaboratorPresence[] = []
        
        for (const userId in state) {
          // Get the raw presence data and cast it to our flexible type
          const rawPresence = state[userId][0] as RawPresenceData
          
          // Skip if no presence data
          if (!rawPresence) continue
          
          try {
            // Create a properly structured CollaboratorPresence object
            const presence: CollaboratorPresence = {
              user_id: userId, // Use the key as the user_id
              email: typeof rawPresence.email === 'string' ? rawPresence.email : 'unknown@example.com',
              last_seen: new Date().toISOString()
            }
            
            // Add optional fields if they exist
            if (rawPresence.editing_object) {
              presence.editing_object = String(rawPresence.editing_object)
            }
            
            if (rawPresence.cursor_position && 
                typeof rawPresence.cursor_position === 'object' &&
                'x' in rawPresence.cursor_position &&
                'y' in rawPresence.cursor_position &&
                'z' in rawPresence.cursor_position) {
              presence.cursor_position = rawPresence.cursor_position
            }
            
            presenceList.push(presence)
          } catch (error) {
            console.error('Error processing presence data:', error)
          }
        }
        
        setCollaborators(presenceList)
        onPresenceUpdate?.(presenceList)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
      })

    // Listen for broadcast events (real-time updates)
    fileChannel
      .on('broadcast', { event: 'realtime_update' }, (payload) => {
        const event = payload.payload as RealtimeEvent
        if (event.user_id !== user.id) { // Don't process our own events
          onRealtimeEvent?.(event)
        }
      })

    // Subscribe to channel
    fileChannel.subscribe(async (status) => {
      console.log('Realtime subscription status:', status)
      if (status === 'SUBSCRIBED') {
        setIsConnected(true)
        
        // Track initial presence
        await fileChannel.track({
          user_id: user.id,
          email: user.email,
          last_seen: new Date().toISOString()
        })
      }
    })

    setChannel(fileChannel)

    // Cleanup function
    return () => {
      // Release any object we're editing
      if (editingObjectRef.current) {
        fileChannel.track({
          user_id: user.id,
          email: user.email,
          editing_object: null,
          last_seen: new Date().toISOString()
        })
      }
      
      fileChannel.unsubscribe()
      setIsConnected(false)
    }
  }, [fileId, user?.id])

  // Function to start editing an object (locks it for this user)
  const startEditingObject = async (objectId: string) => {
    if (!channel || !user) return false

    try {
      await channel.track({
        user_id: user.id,
        email: user.email,
        editing_object: objectId,
        last_seen: new Date().toISOString()
      })
      
      setEditingObjectState(objectId)
      editingObjectRef.current = objectId
      return true
    } catch (error) {
      console.error('Error starting object edit:', error)
      return false
    }
  }

  // Function to stop editing an object (releases the lock)
  const stopEditingObject = async () => {
    if (!channel || !user) return

    try {
      await channel.track({
        user_id: user.id,
        email: user.email,
        editing_object: null,
        last_seen: new Date().toISOString()
      })
      
      setEditingObjectState(null)
      editingObjectRef.current = null
    } catch (error) {
      console.error('Error stopping object edit:', error)
    }
  }

  // Function to broadcast real-time events
  const broadcastEvent = async (event: Omit<RealtimeEvent, 'user_id' | 'timestamp'>) => {
    if (!channel || !user) return

    const fullEvent: RealtimeEvent = {
      ...event,
      user_id: user.id,
      timestamp: new Date().toISOString()
    }

    try {
      await channel.send({
        type: 'broadcast',
        event: 'realtime_update',
        payload: fullEvent
      })
    } catch (error) {
      console.error('Error broadcasting event:', error)
    }
  }

  // Function to update cursor position
  const updateCursorPosition = async (position: { x: number; y: number; z: number }) => {
    if (!channel || !user) return

    try {
      await channel.track({
        user_id: user.id,
        email: user.email,
        editing_object: editingObjectRef.current,
        cursor_position: position,
        last_seen: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error updating cursor position:', error)
    }
  }

  // Helper function to check if an object is being edited by someone else
  const isObjectLocked = (objectId: string): CollaboratorPresence | null => {
    const editor = collaborators.find(
      collab => collab.editing_object === objectId && collab.user_id !== user?.id
    )
    return editor || null
  }

  return {
    // State
    collaborators,
    isConnected,
    editingObject,
    
    // Actions
    startEditingObject,
    stopEditingObject,
    broadcastEvent,
    updateCursorPosition,
    
    // Helpers
    isObjectLocked
  }
}
