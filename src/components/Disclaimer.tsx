export const DISCLAIMER =
  'Данное приложение является исключительно демонстрационным пет-проектом (тестовое задание).'

export const DISCLAIMER_COPYRIGHT =
  'Не является официальным клиентом MAX, не аффилировано с правообладателем и не имеет цели ввести пользователей в заблуждение.'

export function Disclaimer() {
  return (
    <footer className="shrink-0 border-t border-divider bg-surface px-4 py-1.5 text-[9px] font-bold text-tertiary text-center">
      {DISCLAIMER} {DISCLAIMER_COPYRIGHT}
    </footer>
  )
}
