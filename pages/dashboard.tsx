import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'

const DashboardPage = () => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <>
      <Head>
        <title>Sphaire - Dashboard</title>
        <meta name="description" content="Sphaire 3D Modeling Dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="flex h-16 items-center justify-between border-b border-gray-700 px-8">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2 text-white hover:text-blue-400">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Sphaire
              </span>
            </Link>
            <span className="text-gray-400">•</span>
            <span className="text-gray-300">Dashboard</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Go to 3D Editor
            </Link>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Welcome to Sphaire Dashboard</h1>
            <p className="text-gray-400">Your 3D modeling workspace and project hub.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-2">Quick Start</h3>
              <p className="text-gray-400 mb-4">Jump right into 3D modeling</p>
              <Link href="/" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                Start Modeling
              </Link>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-2">Features</h3>
              <p className="text-gray-400 mb-2">• 3D Scene Editor</p>
              <p className="text-gray-400 mb-2">• AI-Powered Tools</p>
              <p className="text-gray-400 mb-2">• Real-time Rendering</p>
              <p className="text-gray-400">• Export Options</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-2">Tools</h3>
              <p className="text-gray-400 mb-2">• Object Manager</p>
              <p className="text-gray-400 mb-2">• Texture Generator</p>
              <p className="text-gray-400 mb-2">• Lighting Controls</p>
              <p className="text-gray-400">• Voice Commands</p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      activeTab === 'overview'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      activeTab === 'activity'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Activity
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {activeTab === 'overview' ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-4l-7 7-7-7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Welcome to Sphaire</h3>
                  <p className="text-gray-400 mb-6">Start creating amazing 3D models and scenes.</p>
                  <Link href="/" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                    Launch 3D Editor
                  </Link>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400">No recent activity to display.</p>
                  <p className="text-gray-500 text-sm mt-2">Start using the 3D editor to see your activity here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default DashboardPage
