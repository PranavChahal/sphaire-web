import type { NextPage } from 'next';
import React, { useEffect } from 'react';
import Head from 'next/head';
import HeaderPerfect from '../components/HeaderPerfect';
import { ViewportProduction } from '../components/ViewportProduction';
import Sidebar from '../components/Sidebar';
import CodeViewer from '../components/CodeViewer';
import VoiceModule from '../components/VoiceModule';
import { useUIStore } from '../store/uiStore';
import { ModalProvider } from '../contexts/ModalContext';


const Home: NextPage = () => {
  console.log('🔍 Rendering Home component');
  const { activeTab, editorVisible, setActiveTab, showEditor, hideEditor } = useUIStore();
  
  // Code viewer ref for external control
  const codeViewerRef = React.useRef(null);
  
  useEffect(() => {
    if (activeTab === 'code-editor') {
      showEditor();
    } else {
      hideEditor();
    }
  }, [activeTab, showEditor, hideEditor]);
  
  console.log('🔍 Home component useEffect setup complete');
  return (
    <ModalProvider>
        <div className="h-screen w-screen flex flex-col bg-gray-900 text-white overflow-hidden">
          <Head>
            <title>Sphaire - 3D Modeling App</title>
            <meta name="description" content="A modern 3D modeling application" />
            <link rel="icon" href="/favicon.ico" />
          </Head>
          
          <HeaderPerfect />
          
          <div className="flex flex-1 overflow-hidden">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className={`${editorVisible ? 'flex-1' : 'h-full'} overflow-hidden transition-all duration-300`}>
                <ViewportProduction />
              </div>
              
              {editorVisible && (
                <div className="h-1/3 border-t border-gray-700 transition-all duration-300">
                  <CodeViewer ref={codeViewerRef} />
                </div>
              )}
            </div>
            
            {activeTab === 'voice' && (
              <div className="w-80 border-l border-gray-700 animate-slide-in-right">
                <VoiceModule />
              </div>
            )}
          </div>
        </div>
      </ModalProvider>
  );
};

export default Home;
