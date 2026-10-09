/**
 * Параметры доступа к инстансу из личного кабинета GREEN-API.
 *
 * API: хост `apiUrl` у каждого инстанса свой.
 */
export interface Credentials {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

// API: работать с сообщениями можно только в авторизованке
export type InstanceState =
  | 'notAuthorized'
  | 'authorized'
  | 'blocked'
  | 'starting'
  | 'suspended'
  | 'pendingPassword'

export interface CheckAccountResult {
  exist: boolean
  // API: пустая строка, если аккаунта нет
  chatId: string
}

export interface SendMessageResult {
  idMessage: string
}

export interface SenderData {
  // API: числовой идентификатор строкой; у групп он отрицательный
  chatId: string
  // API: в личном чате совпадает с именем собеседника
  chatName: string
  sender: string
  senderName: string
}

export interface TextMessageData {
  typeMessage: 'textMessage'
  textMessageData: { textMessage: string }
}

/** Текст со ссылкой или цитатой; этим же типом API отдает и часть обычных текстов. */
export interface ExtendedTextMessageData {
  typeMessage: 'extendedTextMessage'
  extendedTextMessageData: { text: string }
}

export interface IncomingTextMessage {
  typeWebhook: 'incomingMessageReceived'
  // API: Unix-время в секундах
  timestamp: number
  idMessage: string
  senderData: SenderData
  messageData: TextMessageData | ExtendedTextMessageData
}

// API: статуса "отправлено" нет - первым приходит delivered.
// Порядок статусов одного сообщения не гарантирован. failed и noAccount приходят независимо от настроек инстанса.
export interface OutgoingMessageStatus {
  typeWebhook: 'outgoingMessageStatus'
  chatId: string
  idMessage: string
  status: 'delivered' | 'read' | 'failed' | 'noAccount' | 'notInGroup'
}

/**
 * Тело уведомления из очереди инстанса.
 *
 * @remarks
 * В очередь попадают уведомления всех включенных типов, поэтому общий
 * случай описан только дискриминатором `typeWebhook`.
 */
export type NotificationBody = IncomingTextMessage | OutgoingMessageStatus | { typeWebhook: string }

export interface Notification {
  receiptId: number
  body: NotificationBody
}
