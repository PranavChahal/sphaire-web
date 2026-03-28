import React from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import HeaderPerfect from '../../components/HeaderPerfect'
import { ViewportProduction } from '../../components/ViewportProduction'
import Sidebar from '../../components/Sidebar'
import VoiceModule from '../../components/VoiceModule'
import { useUIStore } from '../../store/uiStore'
import { ModalProvider } from '../../contexts/ModalContext'

const DesignFilePage = () => {
  const router = useRouter()
  const { fileId } = router.query
  
  // UI Store for sidebar and editor state
  const { activeTab, setActiveTab } = useUIStore()

  return (
    <ModalProvider>
      <div className="h-screen w-screen flex flex-col bg-gray-900 text-white overflow-hidden">
        <Head>
          <title>Design - Sphaire 3D</title>
          <meta name="description" content="A modern 3D modeling application" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        
        <HeaderPerfect />
        
        <div className="flex flex-1 overflow-hidden">
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-full overflow-hidden">
              <ViewportProduction id={`design-viewport-${fileId}`} />
            </div>
          </div>
          
          {activeTab === 'voice' && (
            <div className="w-80 border-l border-gray-700 animate-slide-in-right">
              <VoiceModule />
            </div>
          )}
        </div>
      </div>
    </ModalProvider>
  )
}

export default DesignFilePage
