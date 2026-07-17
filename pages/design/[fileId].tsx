import React from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { ModalProvider } from '../../contexts/ModalContext'
import StudioShell from '../../components/studio/StudioShell'

const DesignFilePage = () => {
  const router = useRouter()
  const { fileId } = router.query
  
  return (
    <ModalProvider>
      <Head>
        <title>{fileId ? `${fileId} — Sphaire` : 'Sphaire Studio'}</title>
        <meta name="description" content="Create and refine verified 3D models with Sphaire." />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <StudioShell fileId={typeof fileId === 'string' ? fileId : undefined} />
    </ModalProvider>
  )
}

export default DesignFilePage
