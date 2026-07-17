/**
 * React hook wrapping a Yjs collaboration session (Tier-2 ⑦).
 *
 * Join a room by name; the shared code document syncs peer-to-peer and remote code
 * changes are surfaced via `onRemoteCode` so the viewport can re-execute them locally.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { CollabSession, Peer } from '../services/collab/collabSession';

interface UseCollabOptions {
  room: string | null; // null = not collaborating
  name: string;
  onRemoteCode?: (code: string) => void;
}

export function useCollabDocument({ room, name, onRemoteCode }: UseCollabOptions) {
  const sessionRef = useRef<CollabSession | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [connected, setConnected] = useState(false);
  const onRemoteRef = useRef(onRemoteCode);
  onRemoteRef.current = onRemoteCode;

  useEffect(() => {
    if (!room) {
      sessionRef.current?.disconnect();
      sessionRef.current = null;
      setConnected(false);
      setPeers([]);
      return;
    }

    const session = new CollabSession(
      room,
      { name },
      {
        onCodeChange: (code, origin) => {
          if (origin === 'remote') onRemoteRef.current?.(code);
        },
        onPeersChange: setPeers,
      }
    );
    session.connect();
    sessionRef.current = session;
    setConnected(true);

    return () => {
      session.disconnect();
      sessionRef.current = null;
      setConnected(false);
    };
  }, [room, name]);

  const broadcastCode = useCallback((code: string) => {
    sessionRef.current?.setCode(code);
  }, []);

  const updatePresence = useCallback((p: { cursor?: { x: number; y: number; z: number }; selection?: string }) => {
    sessionRef.current?.updatePresence(p);
  }, []);

  return { peers, connected, broadcastCode, updatePresence };
}
