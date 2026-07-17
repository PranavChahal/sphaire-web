/**
 * Voice — hands-free modeling. Hosts the existing voice command engine.
 */

import React from 'react';
import VoiceModule from '../../VoiceModule';
import { Drawer } from '../ui';

const VoicePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Drawer title="Voice" onClose={onClose}>
    <div className="st-material-host">
      <VoiceModule />
    </div>
  </Drawer>
);

export default VoicePanel;
