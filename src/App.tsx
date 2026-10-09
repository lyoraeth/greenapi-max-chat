import { useState } from 'react'
import type { Credentials } from '@/api/types'
import { ChatScreen } from '@/chat/ChatScreen'
import { clearChats } from '@/chat/storage'
import { Disclaimer } from '@/components/Disclaimer'
import {
  clearCredentials,
  envCredentials,
  loadCredentials,
  saveCredentials,
} from '@/session/credentials'
import { LoginScreen } from '@/session/LoginScreen'

function App() {
  const [credentials, setCredentials] = useState(() => loadCredentials() ?? envCredentials())

  function handleLogin(next: Credentials) {
    saveCredentials(next)
    setCredentials(next)
  }

  function handleLogout() {
    if (credentials) clearChats(credentials.idInstance)
    clearCredentials()
    setCredentials(null)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        {credentials ? (
          <ChatScreen credentials={credentials} onLogout={handleLogout} />
        ) : (
          <LoginScreen onLogin={handleLogin} />
        )}
      </div>
      <Disclaimer />
    </div>
  )
}

export default App
