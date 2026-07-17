/**
 * Real-time collaboration on the CAD *code document* (Tier-2 ⑦).
 *
 * Because a Sphaire model's source of truth is text (the generated construction code),
 * multiplayer doesn't need geometry CRDTs the way Onshape did — we sync the code with
 * Yjs and each peer re-executes it locally. Transport is y-webrtc (peer-to-peer, no
 * server to run), with awareness for live cursors/presence. This is "Figma for CAD"
 * at almost no infra cost.
 */

import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

export interface Peer {
  clientId: number;
  name: string;
  color: string;
  cursor?: { x: number; y: number; z: number };
  selection?: string; // selected shape id
}

export interface CollabCallbacks {
  onCodeChange?: (code: string, origin: 'local' | 'remote') => void;
  onPeersChange?: (peers: Peer[]) => void;
}

const COLORS = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#bfef45'];

export class CollabSession {
  private doc: Y.Doc;
  private provider: WebrtcProvider | null = null;
  private codeText: Y.Text;
  private applyingRemote = false;

  constructor(private room: string, private me: { name: string }, private cb: CollabCallbacks = {}) {
    this.doc = new Y.Doc();
    this.codeText = this.doc.getText('code');
  }

  connect(signalingServers?: string[]) {
    this.provider = new WebrtcProvider(this.room, this.doc, {
      signaling: signalingServers || ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com'],
    });

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.provider.awareness.setLocalStateField('user', { name: this.me.name, color });

    // Code document changes -> notify (skip echoes of our own remote application).
    this.codeText.observe(() => {
      const origin = this.applyingRemote ? 'remote' : 'local';
      this.cb.onCodeChange?.(this.codeText.toString(), origin);
    });

    this.provider.awareness.on('change', () => this.emitPeers());
    this.emitPeers();
  }

  /** Replace the shared code (e.g. after an AI generation) so all peers re-execute it. */
  setCode(code: string) {
    this.doc.transact(() => {
      this.codeText.delete(0, this.codeText.length);
      this.codeText.insert(0, code);
    });
  }

  getCode(): string {
    return this.codeText.toString();
  }

  /** Apply an incremental edit from a local editor without clobbering peers' edits. */
  applyDelta(delta: any[]) {
    this.applyingRemote = false;
    this.doc.transact(() => this.codeText.applyDelta(delta));
  }

  updatePresence(p: Partial<Pick<Peer, 'cursor' | 'selection'>>) {
    const cur = this.provider?.awareness.getLocalState()?.user || {};
    this.provider?.awareness.setLocalStateField('user', { ...cur, ...p });
  }

  private emitPeers() {
    if (!this.provider) return;
    const states = this.provider.awareness.getStates();
    const peers: Peer[] = [];
    states.forEach((state: any, clientId: number) => {
      if (clientId === this.doc.clientID) return; // skip self
      const u = state.user;
      if (u) peers.push({ clientId, name: u.name, color: u.color, cursor: u.cursor, selection: u.selection });
    });
    this.cb.onPeersChange?.(peers);
  }

  disconnect() {
    this.provider?.destroy();
    this.doc.destroy();
    this.provider = null;
  }
}
