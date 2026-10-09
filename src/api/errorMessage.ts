import { GreenApiError } from '@/api/client'

/** Переводит ошибку запроса к API в текст для пользователя. */
export function errorMessage(error: unknown): string {
  if (error instanceof GreenApiError) {
    switch (error.status) {
      case 401:
      case 403:
        return 'Неверные idInstance или apiTokenInstance'
      // API: превышена частота запросов к методу
      case 429:
        return 'Слишком много запросов, попробуйте чуть позже'
      // API: квота тарифа
      case 466:
        return 'Исчерпан лимит тарифа инстанса'
      default:
        return error.message
    }
  }
  // fetch отклоняется TypeError, когда запрос не дошел до сервера
  if (error instanceof TypeError) return 'Нет связи с сервером GREEN-API'
  return 'Неизвестная ошибка'
}
