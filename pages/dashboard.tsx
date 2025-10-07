import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '../contexts/AuthContext'
import { supabase, DesignFile } from '../lib/supabase'
import ProtectedRoute from '../components/ProtectedRoute'

const DashboardPage = () => {
  const [files, setFiles] = useState<DesignFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { user, signOut } = useAuth()
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      fetchUserFiles()
    }
  }, [user])
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchUserFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('design_files')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching files:', error)
        setError('Failed to load your files')
      } else {
        setFiles(data || [])
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this design? This action cannot be undone.')) {
      return
    }
    
    setIsDeleting(true)
    setActiveMenu(null)
    
    try {
      const { error } = await supabase
        .from('design_files')
        .delete()
        .eq('id', fileId)
      
      if (error) {
        console.error('Error deleting file:', error)
        setError(`Failed to delete design: ${error.message}`)
      } else {
        // Update the files list by removing the deleted file
        setFiles(files.filter(file => file.id !== fileId))
      }
    } catch (err) {
      console.error('Unexpected error during deletion:', err)
      setError('An unexpected error occurred while deleting the design')
    } finally {
      setIsDeleting(false)
    }
  }


  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
        {/* Abstract design elements */}
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-purple-500 opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-pink-500 opacity-10 rounded-full blur-3xl translate-y-1/4 -translate-x-1/4"></div>
        <div className="absolute top-1/2 left-1/2 w-1/3 h-1/3 bg-purple-700 opacity-10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        {/* Header */}
        <header className="bg-black/80 backdrop-blur-sm shadow-lg border-b border-pink-500/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-3">
                <a href="https://sphaire3d.com" target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                  <div className="relative w-10 h-10">
                    <Image 
                      src="/sphaire-img/sphaire.png" 
                      alt="Sphaire Logo" 
                      fill 
                      className="object-contain"
                      priority
                    />
                  </div>
                </a>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-300 to-purple-500 bg-clip-text text-transparent">Sphaire</h1>
                  <p className="text-gray-400 text-sm">3D Design Workspace</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-700/50">
                  <span className="text-pink-300 font-medium">{user?.email?.split('@')[0]}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="bg-black hover:bg-gray-900 text-pink-400 hover:text-pink-300 px-4 py-2 rounded-lg transition-colors border border-pink-500/20 hover:border-pink-500/40 hover:shadow-lg hover:shadow-pink-500/10"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          {error && (
            <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-400 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mb-12 flex justify-center">
            <Link href="/">
              <button
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold flex items-center space-x-3 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Start New Blank 3D Design</span>
              </button>
            </Link>
          </div>

          {/* Files List */}
          <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl shadow-xl border border-gray-800">
            <div className="px-6 py-4 border-b border-gray-700/50">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <svg className="w-5 h-5 mr-2 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Your Design Files
              </h2>
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                  <span className="ml-3 text-gray-300">Loading your files...</span>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-300">No design files yet</h3>
                  <p className="mt-1 text-gray-400">Get started by creating your first 3D design file</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-5 hover:bg-gray-700/80 transition-all duration-300 cursor-pointer border border-gray-700/50 hover:border-pink-500/30 hover:shadow-lg hover:shadow-pink-500/5 transform hover:scale-[1.02]"
                      onClick={() => router.push(`/design/${file.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-medium truncate">
                            <span className="bg-gradient-to-r from-pink-300 to-purple-400 bg-clip-text text-transparent">
                              {file.name}
                            </span>
                          </h3>
                          <p className="text-gray-400 text-sm mt-1">
                            Last edited: {formatDate(file.updated_at || file.created_at)}
                          </p>
                          <div className="flex items-center mt-2">
                            {file.is_shared && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-pink-500 bg-opacity-20 text-pink-300">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                </svg>
                                Shared
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="relative" ref={activeMenu === file.id ? menuRef : null}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveMenu(activeMenu === file.id ? null : file.id)
                            }}
                            className="text-gray-400 hover:text-pink-400 p-1.5 rounded-full hover:bg-gray-700/50 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          
                          {activeMenu === file.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-10 py-1 animate-fadeIn">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteFile(file.id)
                                }}
                                disabled={isDeleting}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center space-x-2 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}

export default DashboardPage
