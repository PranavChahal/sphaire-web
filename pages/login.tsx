import { useEffect } from 'react'
import { useRouter } from 'next/router'

const LoginPage = () => {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return null
}

export default LoginPage
