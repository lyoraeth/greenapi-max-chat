import { useMemo, useState } from 'react'
import { createGreenApiClient } from '@/api/client'
import type { Credentials } from '@/api/types'
import patternUrl from '@/assets/pattern.svg'
import { ChatList } from '@/chat/ChatList'
import { ChatView } from '@/chat/ChatView'
import { NotificationsNotice } from '@/chat/NotificationsNotice'
import { Navbar } from '@/chat/Navbar'
import { NewChatDialog } from '@/chat/NewChatDialog'
import { useAvatars } from '@/chat/useAvatars'
import { useChat } from '@/chat/useChat'
import { useSidebarWidth } from '@/chat/useSidebarWidth'
import { cn } from '@/lib/utils'

interface ChatScreenProps {
  credentials: Credentials
  onLogout: () => void
}

export function ChatScreen({ credentials, onLogout }: ChatScreenProps) {
  const client = useMemo(() => createGreenApiClient(credentials), [credentials])
  const {
    chats,
    activeChatId,
    pollError,
    isQuotaExceeded,
    openChat,
    selectChat,
    closeChat,
    sendMessage,
  } = useChat(client, credentials.idInstance)
  const chatIds = useMemo(() => chats.map(({ chatId }) => chatId), [chats])
  const avatars = useAvatars(client, chatIds)
  const { width, separatorProps } = useSidebarWidth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const activeChat = chats.find(({ chatId }) => chatId === activeChatId)

  return (
    <div className="flex h-full flex-col">
      <NotificationsNotice client={client} />
      {pollError && (
        <p role="alert" className="bg-destructive px-4 py-2 text-[13px]/4">
          Не удается получить новые сообщения: {pollError}
        </p>
      )}
      {isQuotaExceeded && (
        <p role="alert" className="bg-destructive px-4 py-2 text-[13px]/4">
          Превышен лимит тарифа инстанса - часть сообщений может не доставляться
        </p>
      )}

      {/* на узком экране видна одна панель - список чатов или открытый чат */}
      <div className="flex min-h-0 flex-1 max-md:flex-col-reverse">
        <Navbar onLogout={onLogout} className={cn(activeChat && 'max-md:hidden')} />
        <ChatList
          chats={chats}
          activeChatId={activeChatId}
          avatars={avatars}
          width={width}
          className={cn(activeChat && 'max-md:hidden')}
          onSelect={selectChat}
          onNewChat={() => setIsDialogOpen(true)}
        />
        <div
          {...separatorProps}
          className="relative z-10 w-0 shrink-0 cursor-col-resize touch-none outline-none after:absolute after:inset-y-0 after:left-0 after:w-1.25 focus-visible:after:bg-primary max-md:hidden"
        />

        <main
          className={cn(
            'relative isolate flex min-w-0 flex-1 flex-col overflow-hidden bg-ground',
            !activeChat && 'max-md:hidden',
          )}
        >
          <div
            aria-hidden
            // слой выходит за края для фикса углов
            className="absolute -inset-50 -z-10 rotate-5 bg-pattern mask-repeat mask-center"
            style={{ maskImage: `url(${patternUrl})` }}
          />

          {activeChat ? (
            <ChatView
              chat={activeChat}
              avatar={avatars[activeChat.chatId]}
              onClose={closeChat}
              onSend={(text) => sendMessage(activeChat.chatId, text)}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-4">
              <p className="rounded-md bg-capsule px-1.5 py-px text-sm/4.5 backdrop-blur-[25px]">
                Выберите чат или начните новый
              </p>
            </div>
          )}
        </main>
      </div>

      <NewChatDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onSubmit={openChat} />
    </div>
  )
}
