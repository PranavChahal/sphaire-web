import type { NextPage } from 'next';
import React from 'react';
import SEOHead from '../components/SEOHead';
import { ModalProvider } from '../contexts/ModalContext';
import StudioShell from '../components/studio/StudioShell';

const Home: NextPage = () => {
  return (
    <ModalProvider>
      <SEOHead
        title="Sphaire — Describe it. Make it real."
        description="A closed-loop AI CAD studio that creates, verifies, edits, renders, and exports manufacturable 3D models."
        keywords="AI CAD, parametric modeling, 3D design, DFM, OpenCascade, Replicad, Sphaire"
        canonicalUrl="https://sphaire3d.design"
      />
      <StudioShell />
    </ModalProvider>
  );
};

export default Home;
