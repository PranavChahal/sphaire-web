import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, DesignFile } from '../../lib/supabase'
import ProtectedRoute from '../../components/ProtectedRoute'
import HeaderPerfect from '../../components/HeaderPerfect'
import { ViewportProduction } from '../../components/ViewportProduction'
import Sidebar from '../../components/Sidebar'
import CodeViewer from '../../components/CodeViewer'
import VoiceModule from '../../components/VoiceModule'
import { useUIStore } from '../../store/uiStore'
import useStore from '../../store/store'
import { ModalProvider } from '../../contexts/ModalContext'

const DesignFilePage = () => {
  const [file, setFile] = useState<DesignFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const { user } = useAuth()
  const router = useRouter()
  const { fileId } = router.query
  
  // UI Store for sidebar and editor state
  const { activeTab, editorVisible, setActiveTab, showEditor, hideEditor } = useUIStore()
  
  // Code viewer ref for external control
  const codeViewerRef = React.useRef(null)
  
  // Get store functions for loading saved objects
  const { addShape, addModel, clearShapes } = useStore()

  useEffect(() => {
    if (fileId && user) {
      fetchFile()
    }
  }, [fileId, user])
  
  useEffect(() => {
    if (activeTab === 'code-editor') {
      showEditor()
    } else {
      hideEditor()
    }
  }, [activeTab, showEditor, hideEditor])

  const fetchFile = async () => {
    try {
      const { data, error } = await supabase
        .from('design_files')
        .select('*')
        .eq('id', fileId)
        .single()

      if (error) {
        console.error('Error fetching file:', error)
        setError('File not found or you do not have permission to access it')
      } else {
        setFile(data)
        // Load design content into the viewport
        console.log('Design file loaded:', data)
        loadDesignContent(data)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Reconstruct imported model from saved store data
   * Decodes Base64 data and recreates model using SceneLoader
   */
  const reconstructImportedModel = async (modelData: any) => {
    try {
      console.log('🔄 Starting model reconstruction for:', modelData.fileName)
      
      // Import necessary Babylon.js modules
      // Import modules for model loading
      await import('@babylonjs/core')
      await import('@babylonjs/core/Loading/sceneLoader')
      
      // Get scene from ViewportProduction (if available)
      // For now, we'll add the model to the store and let ViewportProduction handle the rendering
      
      // Decode Base64 data back to ArrayBuffer
      const base64Data = modelData.data
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const arrayBuffer = bytes.buffer
      
      console.log(`💾 Decoded Base64 data: ${arrayBuffer.byteLength} bytes`)
      
      // Create blob and blob URL for SceneLoader
      const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' })
      const blobUrl = URL.createObjectURL(blob)
      
      console.log('🔗 Created blob URL for model reconstruction')
      
      // Add model to store with all saved properties
      // The ViewportProduction component will handle the actual Babylon.js scene reconstruction
      const modelEntry = {
        id: modelData.id,
        type: 'model' as const,
        position: modelData.position || { x: 0, y: 0, z: 0 },
        rotation: modelData.rotation || { x: 0, y: 0, z: 0 },
        scaling: modelData.scaling || { x: 1, y: 1, z: 1 },
        format: modelData.format,
        fileName: modelData.fileName,
        data: modelData.data,
        originalSize: modelData.originalSize,
        name: modelData.name || modelData.fileName.replace(/\.[^/.]+$/, '')
      }
      
      // Add to store using addModel (which handles proper typing)
      addModel(modelEntry)
      
      // Clean up blob URL after a delay to allow ViewportProduction to load it
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl)
      }, 5000)
      
      console.log('✅ Model added to store for reconstruction:', modelData.fileName)
      
    } catch (error) {
      console.error('❌ Failed to reconstruct imported model:', error, modelData)
      // Fallback: add as regular shape data to prevent load failure
      try {
        addShape(modelData)
        console.log('⚠️ Added model as fallback shape')
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError)
      }
    }
  }

  const loadDesignContent = async (designFile: DesignFile) => {
    try {
      if (!designFile.content) {
        console.log('No content to load for this design file')
        return
      }
      
      // Parse the saved design content
      const sceneData = JSON.parse(designFile.content)
      console.log('Parsed scene data:', sceneData)
      
      // Clear existing shapes before loading new ones
      clearShapes()
      
      // Load each saved object
      if (sceneData.objects && Array.isArray(sceneData.objects)) {
        console.log(`Loading ${sceneData.objects.length} objects from saved design`)
        
        for (const savedObject of sceneData.objects) {
          try {
            // Check if this is an imported model that needs special reconstruction
            if (savedObject.type === 'model' && savedObject.data && savedObject.format) {
              console.log('🔄 Reconstructing imported model:', savedObject.fileName)
              await reconstructImportedModel(savedObject)
            } else {
              // Regular primitive shape - recreate with saved properties
              const shapeData = {
                id: savedObject.id,
                type: savedObject.type,
                position: savedObject.position || { x: 0, y: 0, z: 0 },
                rotation: savedObject.rotation || { x: 0, y: 0, z: 0 },
                scaling: savedObject.scaling || { x: 1, y: 1, z: 1 },
                color: savedObject.color || '#8B5CF6',
                // Include any other properties that were saved
                ...savedObject
              }
              
              console.log('Loading primitive shape:', shapeData)
              addShape(shapeData)
            }
          } catch (objectError) {
            console.error('Error loading individual object:', objectError, savedObject)
          }
        }
        
        console.log('✅ Design content loaded successfully')
      } else {
        console.log('No objects found in saved design content')
      }
    } catch (error) {
      console.error('Error loading design content:', error)
      // Don't show error to user as the file still loads, just without content
    }
  }

  const goBackToDashboard = () => {
    router.push('/dashboard')
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-gray-300">Loading design file...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="text-center">
            <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-400 px-6 py-4 rounded-lg max-w-md">
              <h2 className="text-lg font-semibold mb-2">Error</h2>
              <p>{error}</p>
              <button
                onClick={goBackToDashboard}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <ModalProvider>
        <div className="h-screen w-screen flex flex-col bg-gray-900 text-white overflow-hidden">
          <Head>
            <title>{file?.name || 'Design'} - Sphaire 3D</title>
            <meta name="description" content="A modern 3D modeling application" />
            <link rel="icon" href="/favicon.ico" />
          </Head>
          
          <HeaderPerfect />
          
          <div className="flex flex-1 overflow-hidden">
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className={`${editorVisible ? 'flex-1' : 'h-full'} overflow-hidden transition-all duration-300`}>
                <ViewportProduction id={`design-viewport-${fileId}`} />
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
    </ProtectedRoute>
  )
}

export default DesignFilePage
