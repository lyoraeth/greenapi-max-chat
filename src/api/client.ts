import type {
  CheckAccountResult,
  Credentials,
  IncomingTextMessage,
  InstanceState,
  Notification,
  NotificationBody,
  OutgoingMessageStatus,
  SendMessageResult,
} from '@/api/types'

/** Ошибка ответа GREEN-API: HTTP-статус вне 2xx или отказ в теле ответа. */
export class GreenApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'GreenApiError'
    this.status = status
  }
}

/**
 * Достает текст ошибки из тела ответа.
 *
 * API: единого формата ошибки нет - есть поле `message`, поле `reason`,
 * простой текст и пустое тело.
 */
function readErrorMessage(text: string, fallback: string): string {
  if (!text) return fallback
  try {
    const body: unknown = JSON.parse(text)
    if (typeof body === 'object' && body !== null) {
      const { message, reason } = body as { message?: unknown; reason?: unknown }
      if (typeof message === 'string' && message) return message
      if (typeof reason === 'string' && reason) return reason
    }
  } catch {
    // тело не JSON, поэтому просто as-is
  }
  return text
}

async function request<T>(url: string, init?: RequestInit): Promise<T | null> {
  const response = await fetch(url, init)
  // API: тело читается текстом вместо респонсива: у части ответов оно пустое -
  // 401 при неверных параметрах, 200 у receiveNotification при пустой очереди,
  // изредка 200 у getSettings
  const text = await response.text()
  if (!response.ok) {
    throw new GreenApiError(response.status, readErrorMessage(text, response.statusText))
  }
  return text ? (JSON.parse(text) as T | null) : null
}

function postJson(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

// API: обычный текст приходит и как textMessage, и как extendedTextMessage
// правило выбора в доке не описано, поэтому принимаются оба типа
export function isIncomingTextMessage(body: NotificationBody): body is IncomingTextMessage {
  return (
    body.typeWebhook === 'incomingMessageReceived' &&
    'messageData' in body &&
    (body.messageData.typeMessage === 'textMessage' ||
      body.messageData.typeMessage === 'extendedTextMessage')
  )
}

export function isOutgoingMessageStatus(body: NotificationBody): body is OutgoingMessageStatus {
  return body.typeWebhook === 'outgoingMessageStatus' && 'status' in body
}

export function messageText({ messageData }: IncomingTextMessage): string {
  return messageData.typeMessage === 'textMessage'
    ? messageData.textMessageData.textMessage
    : messageData.extendedTextMessageData.text
}

/**
 * Настройки инстанса, без которых приложение не получает данные: входящие
 * сообщения и статусы сообщений, отправленных через API.
 */
// API: после создания инстанса все уведомления выключены. Документация расходится в том, что нужно для статусов:
// страница setSettings называет один outgoingWebhook,
// страница уведомления - еще outgoingMessageWebhook и outgoingAPIMessageWebhook.
// С ними статусы уже приходят.
const REQUIRED_NOTIFICATIONS = ['incomingWebhook', 'outgoingWebhook', 'outgoingAPIMessageWebhook']

/** Создает клиент HTTP API GREEN-API для одного инстанса. */
export function createGreenApiClient({ apiUrl, idInstance, apiTokenInstance }: Credentials) {
  // API: авторизации заголовком нет, ключ инстанса передается в пути запроса
  const url = (method: string, suffix = '') =>
    `${apiUrl}/waInstance${idInstance}/${method}/${apiTokenInstance}${suffix}`

  async function requireBody<T>(endpoint: string, init?: RequestInit): Promise<T> {
    const body = await request<T>(endpoint, init)
    if (body === null) throw new GreenApiError(200, 'Empty response')
    return body
  }

  return {
    // API: на неверные idInstance или apiTokenInstance отвечает 401 с пустым телом
    async getStateInstance(): Promise<InstanceState> {
      const { stateInstance } = await requireBody<{
        stateInstance: InstanceState;
      }>(url("getStateInstance"));
      return stateInstance;
    },

    /** Проверяет, что включены все типы уведомлений из {@link REQUIRED_NOTIFICATIONS}. */
    async areNotificationsEnabled(): Promise<boolean> {
      const settings = await requireBody<Record<string, unknown>>(
        url("getSettings"),
      );
      return REQUIRED_NOTIFICATIONS.every((name) => settings[name] === "yes");
    },

    // API: вызов setSettings перезапускает инстанс, настройки применяются до 5 минут;
    // в это время запросы могут завершаться ошибкой
    async enableNotifications(): Promise<void> {
      const { saveSettings } = await requireBody<{ saveSettings: boolean }>(
        url("setSettings"),
        postJson(
          Object.fromEntries(
            REQUIRED_NOTIFICATIONS.map((name) => [name, "yes"]),
          ),
        ),
      );
      if (!saveSettings)
        throw new GreenApiError(200, "Settings were not saved");
    },

    /**
     * Проверяет наличие аккаунта по номеру телефона и возвращает его `chatId`.
     *
     * @param phoneNumber - номер в международном формате без `+`
     * @throws {@link GreenApiError} если инстанс не готов или исчерпан лимит
     * проверок: в этих случаях API отвечает 200 с `status: false`.
     *
     * API: принимает только номера РФ (7) и РБ (375), номер передается числом.
     * Мессенджер ограничивает частые проверки разных номеров (ошибка 469, после
     * нее по доке советуют паузу в 2 часа).
     * Вернувшийся `chatId` - числовой идентификатор: вообще отправка на
     * `7999…@c.us` тоже работает, но ответ придет с числовым `chatId`, и
     * сопоставить его с чатом будет нечем.
     */
    async checkAccount(phoneNumber: string): Promise<CheckAccountResult> {
      const body = await requireBody<
        CheckAccountResult | { status: false; reason: string }
      >(url("checkAccount"), postJson({ phoneNumber: Number(phoneNumber) }));
      if ("status" in body) throw new GreenApiError(200, body.reason);
      return { exist: body.exist, chatId: body.chatId };
    },

    /**
     * Возвращает ссылку на аватар чата либо `null`, если он не установлен или скрыт.
     *
     * API: при отсутствии аватара и при запрете настройками приватности в ответе будет пустая строка. Срок жизни ссылки в документации не указан.
     */
    async getAvatar(chatId: string): Promise<string | null> {
      const { urlAvatar } = await requireBody<{ urlAvatar: string }>(
        url("getAvatar"),
        postJson({ chatId }),
      );
      return urlAvatar || null;
    },

    // API: текст не длиннее 4000 символов. Ответ 200 с idMessage означает постановку в
    // очередь отправки (хранится до 24 часов):
    // об отказе сообщает уведомление outgoingMessageStatus. Время отправки в ответе не возвращается.
    async sendMessage(
      chatId: string,
      message: string,
    ): Promise<SendMessageResult> {
      return requireBody<SendMessageResult>(
        url("sendMessage"),
        postJson({ chatId, message }),
      );
    },

    /**
     * Ждет следующее уведомление из очереди инстанса (long polling).
     *
     * @param receiveTimeout - время ожидания в секундах (5-60)
     * @returns уведомление либо `null`, если за время ожидания очередь пуста
     *
     * API: при пустой очереди отвечает 200 с телом нулевой длины. Если в настройках
     * инстанса задан `webhookUrl`, метод отвечает 400. Очередь у инстанса одна,
     * порядок FIFO, уведомления хранятся 24 часа; полученное уведомление остается
     * в очереди, пока не вызван deleteNotification.
     */
    async receiveNotification(
      receiveTimeout: number,
      signal?: AbortSignal,
    ): Promise<Notification | null> {
      return request<Notification>(
        url("receiveNotification", `?receiveTimeout=${receiveTimeout}`),
        { signal },
      );
    },

    // API: для уже удаленного уведомления отвечает 200 с result: false.
    async deleteNotification(receiptId: number): Promise<void> {
      await request(url("deleteNotification", `/${receiptId}`), {
        method: "DELETE",
      });
    },
  };
}

export type GreenApiClient = ReturnType<typeof createGreenApiClient>
