/**
 * Single-stroke icon set for Sphaire Studio.
 * 1.5px stroke, 24px grid, round caps — consistent optical weight everywhere.
 */

import React from 'react';

const I: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

export const IconCube = ({ size }: { size?: number }) => (
  <I size={size}>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
    <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
  </I>
);

export const IconSphere = ({ size }: { size?: number }) => (
  <I size={size}>
    <circle cx="12" cy="12" r="9" />
    <ellipse cx="12" cy="12" rx="9" ry="3.5" />
  </I>
);

export const IconCylinder = ({ size }: { size?: number }) => (
  <I size={size}>
    <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
    <path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13" />
  </I>
);

export const IconLayers = ({ size }: { size?: number }) => (
  <I size={size}>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
  </I>
);

export const IconEdit = ({ size }: { size?: number }) => (
  <I size={size}>
    <path d="M4 20l4.5-1L20 7.5a2.1 2.1 0 00-3-3L5.5 16 4 20z" />
    <path d="M14.5 6l3 3" />
  </I>
);

export const IconTexture = ({ size }: { size?: number }) => (
  <I size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="M7 8.5a5 5 0 015 5M14 5a9 9 0 014.5 5.5M5 14.5A5 5 0 019.5 19" />
  </I>
);

export const IconLight = ({ size }: { size?: number }) => (
  <I size={size}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 00-3.5 10.9c.8.6 1.5 1.3 1.5 2.1h4c0-.8.7-1.5 1.5-2.1A6 6 0 0012 3z" />
  </I>
);

export const IconCamera = ({ size }: { size?: number }) => (
  <I size={size}>
    <rect x="3" y="7" width="13" height="12" rx="2.5" />
    <path d="M16 11l5-3v8l-5-3" />
  </I>
);

export const IconCode = ({ size }: { size?: number }) => (
  <I size={size}>
    <path d="M8.5 8L4 12l4.5 4M15.5 8L20 12l-4.5 4" />
  </I>
);

export const IconSearch = ({ size }: { size?: number }) => (
  <I size={size}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </I>
);

export const IconMic = ({ size }: { size?: number }) => (
  <I size={size}>
    <rect x="9.5" y="3" width="5" height="10.5" rx="2.5" />
    <path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3" />
  </I>
);

export const IconImport = ({ size }: { size?: number }) => (
  <I size={size}>
    <path d="M12 3v11M8 10.5L12 14l4-3.5" />
    <path d="M4 15v3.5A2.5 2.5 0 006.5 21h11a2.5 2.5 0 002.5-2.5V15" />
  </I>
);

export const IconExport = ({ size }: { size?: number }) => (
  <I size={size}>
    <path d="M12 14V3M8 6.5L12 3l4 3.5" />
    <path d="M4 15v3.5A2.5 2.5 0 006.5 21h11a2.5 2.5 0 002.5-2.5V15" />
  </I>
);

export const IconShare = ({ size }: { size?: number }) => (
  <I size={size}>
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="17.5" cy="5.5" r="2.5" />
    <circle cx="17.5" cy="18.5" r="2.5" />
    <path d="M8.3 10.8l7-4M8.3 13.2l7 4" />
  </I>
);

export const IconGear = ({ size }: { size?: number }) => (
  <I size={size}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 14.3a1.9 1.9 0 00.4 2.1l.1.1a2.3 2.3 0 11-3.3 3.3l-.1-.1a1.9 1.9 0 00-2.1-.4 1.9 1.9 0 00-1.2 1.8v.2a2.3 2.3 0 11-4.6 0v-.1a1.9 1.9 0 00-1.2-1.8 1.9 1.9 0 00-2.1.4l-.1.1a2.3 2.3 0 11-3.3-3.3l.1-.1a1.9 1.9 0 00.4-2.1 1.9 1.9 0 00-1.8-1.2h-.2a2.3 2.3 0 110-4.6h.1a1.9 1.9 0 001.8-1.2 1.9 1.9 0 00-.4-2.1l-.1-.1a2.3 2.3 0 113.3-3.3l.1.1a1.9 1.9 0 002.1.4h.1a1.9 1.9 0 001.1-1.7V4a2.3 2.3 0 114.6 0v.1a1.9 1.9 0 001.2 1.8 1.9 1.9 0 002.1-.4l.1-.1a2.3 2.3 0 113.3 3.3l-.1.1a1.9 1.9 0 00-.4 2.1v.1a1.9 1.9 0 001.7 1.1h.2a2.3 2.3 0 110 4.6h-.1a1.9 1.9 0 00-1.7 1.2z" />
  </I>
);

export const IconUndo = ({ size }: { size?: number }) => (
  <I size={size}>
    <path d="M8 7L4 11l4 4" />
    <path d="M4 11h10a6 6 0 016 6v1" />
  </I>
);

export const IconRedo = ({ size }: { size?: number }) => (
  <I size={size}>
    <path d="M16 7l4 4-4 4" />
    <path d="M20 11H10a6 6 0 00-6 6v1" />
  </I>
);

export const IconTrash = ({ size }: { size?: number }) => (
  <I size={size}>
    <path d="M4 7h16M10 11v6M14 11v6" />
    <path d="M6 7l1 12.5A1.7 1.7 0 008.7 21h6.6a1.7 1.7 0 001.7-1.5L18 7M9 7V5a1.7 1.7 0 011.7-1.7h2.6A1.7 1.7 0 0115 5v2" />
  </I>
);

export const IconClose = ({ size }: { size?: number }) => (
  <I size={size}>
    <path d="M6 6l12 12M18 6L6 18" />
  </I>
);

export const IconPlus = ({ size }: { size?: number }) => (
  <I size={size}>
    <path d="M12 5v14M5 12h14" />
  </I>
);

export const IconTune = ({ size }: { size?: number }) => (
  <I size={size}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </I>
);

export const IconSpinner = ({ size }: { size?: number }) => (
  <svg
    width={size ?? 18}
    height={size ?? 18}
    viewBox="0 0 24 24"
    fill="none"
    className="st-spin"
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
    <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const IconCheck = ({ size }: { size?: number }) => (
  <I size={size}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </I>
);

export const IconSparkle = ({ size }: { size?: number }) => (
  <I size={size}>
    <path d="M12 4l1.8 4.6L18 10.5l-4.2 1.9L12 17l-1.8-4.6L6 10.5l4.2-1.9L12 4z" />
    <path d="M19 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" />
  </I>
);
