import type { NextPage } from 'next';
import React from 'react';
import SEOHead from '../components/SEOHead';
import HeaderPerfect from '../components/HeaderPerfect';
import { ViewportProduction } from '../components/ViewportProduction';
import Sidebar from '../components/Sidebar';
import VoiceModule from '../components/VoiceModule';
import AIContextPanel from '../components/AIContextPanel';
import { useUIStore } from '../store/uiStore';
import { ModalProvider } from '../contexts/ModalContext';

const Home: NextPage = () => {
  console.log('Rendering Home component');
  const { activeTab, setActiveTab } = useUIStore();
  
  console.log('Home component useEffect setup complete');
  return (
    <ModalProvider>
        <div className="h-screen w-screen flex flex-col bg-gray-900 text-white overflow-hidden">
          <SEOHead 
            title="Sphaire3D - AI-Powered 3D Modeling & Design Platform | Create 3D Models with AI"
            description="Transform ideas into 3D models instantly with AI. Sphaire3D is a free online 3D modeling platform combining artificial intelligence with professional CAD tools. Create, edit, and export 3D designs in seconds."
            keywords="3D AI, AI 3D modeling, 3D design AI, AI CAD, parametric 3D modeling, AI mesh generation, 3D editor online, free CAD software, AI 3D design, OpenCascade AI, Sphaire, Sphaire3D, sphere 3D, AI modeling tool, online 3D software, AI-powered modeling, instant 3D generation, AI parametric design, 3D AI generator, AI-assisted CAD"
            canonicalUrl="https://sphaire3d.design"
          />
          
          <HeaderPerfect />
          
          <div className="flex flex-1 overflow-hidden">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="h-full overflow-hidden">
                <ViewportProduction />
              </div>
            </div>
            
            {activeTab === 'voice' && (
              <div className="w-80 border-l border-gray-700 animate-slide-in-right">
                <VoiceModule />
              </div>
            )}
          </div>
          
          {/* AI Context Panel - Bottom Right */}
          <AIContextPanel />
        </div>
    </ModalProvider>
  );
};

export default Home;
