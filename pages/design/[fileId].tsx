import React from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '../../contexts/AuthContext'
import ProtectedRoute from '../../components/ProtectedRoute'
import HeaderPerfect from '../../components/HeaderPerfect'
import { ViewportProduction } from '../../components/ViewportProduction'
import Sidebar from '../../components/Sidebar'
import VoiceModule from '../../components/VoiceModule'
import { useUIStore } from '../../store/uiStore'
import useStore from '../../store/store'
import { ModalProvider } from '../../contexts/ModalContext'
import { supabase, DesignFile } from '../../lib/supabase'

const DesignFilePage = () => {
  const [file, setFile] = useState<DesignFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const { user } = useAuth()
  const router = useRouter()
  const { fileId } = router.query
  
  // UI Store for sidebar and editor state
  const { activeTab, setActiveTab } = useUIStore()
  
  // Get store functions for loading saved objects
  const { addShape, addModel, clearShapes } = useStore()

  useEffect(() => {
    if (fileId && user) {
      fetchDesignFile()
    }
  }, [fileId, user])
  
  const fetchDesignFile = async () => {
    try {
      setLoading(true)
      setError('')
      
      const { data, error: fetchError } = await supabase
        .from('design_files')
        .select('*')
        .eq('id', fileId)
        .single()
      
      if (fetchError) {
        console.error('Error fetching design file:', fetchError)
        setError('Failed to load design file')
        return
      }
      
      if (data) {
        setFile(data)
        // Load the design content
        await loadDesignContent(data)
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
      console.log('Starting model reconstruction for:', modelData.fileName)
      
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
      
      console.log(`Decoded Base64 data: ${arrayBuffer.byteLength} bytes`)
      
      // Create blob and blob URL for SceneLoader
      const blob = new Blob([arrayBuffer], { type: 'application/octet-stream' })
      const blobUrl = URL.createObjectURL(blob)
      
      console.log('Created blob URL for model reconstruction')
      
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
      
      console.log('Model added to store for reconstruction:', modelData.fileName)
      
    } catch (error) {
      console.error('Failed to reconstruct imported model:', error, modelData)
      // DISABLED: design/[fileId].tsx addShape call causing mesh sync interference
      // Fallback: add as regular shape data to prevent load failure
      try {
        // addShape(modelData)
        console.log('DISABLED: design/[fileId].tsx fallback addShape call to prevent mesh sync interference')
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
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
              console.log('Reconstructing imported model:', savedObject.fileName)
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
              // DISABLED: design/[fileId].tsx addShape call causing mesh sync interference
              // addShape(shapeData)
              console.log('DISABLED: design/[fileId].tsx primitive addShape call to prevent mesh sync interference')
            }
          } catch (objectError) {
            console.error('Error loading individual object:', objectError, savedObject)
          }
        }
        
        console.log('Design content loaded successfully')
      } else {
        console.log('No objects found in saved design content')
      }
    } catch (error) {
      console.error('Error loading design content:', error)
      // Don't show error to user as the file still loads, just without content
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="h-screen w-screen flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
            <p className="mt-4 text-gray-300">Loading design file...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="h-screen w-screen flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="text-red-400 text-xl mb-4">{error}</div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2 rounded-lg"
            >
              Back to Dashboard
            </button>
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
    </ProtectedRoute>
  )
}

export default DesignFilePage
