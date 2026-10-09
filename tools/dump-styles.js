/**
 * Снимает со страницы дерево элементов вместе со стилями каждого узла.
 *
 * Скрипт вставляется в консоль devtools один раз за загрузку страницы и
 * добавляет функцию `dump`. Результат печатается в консоль и копируется в
 * буфер обмена.
 *
 * @example
 * dump($0)                  // элемент, выделенный в инспекторе, со всем поддеревом
 * dump('.bubble')           // первый элемент по селектору
 * dump($0, { depth: 2 })    // не глубже двух уровней
 * dump($0, { parents: 2 })  // вместе с двумя предками
 *
 * @param {string | Element} target - селектор или элемент
 * @param {{ depth?: number, parents?: number }} [options] - глубина обхода
 * потомков и число предков над элементом
 * @returns {string | void} сводка о числе скопированных строк
 */
window.dump = (target, { depth = Infinity, parents = 0 } = {}) => {
  const root = typeof target === 'string' ? document.querySelector(target) : target
  if (!root) return console.error('Элемент не найден:', target)

  const STATES = /:(hover|active|focus-visible|focus-within|focus|disabled|checked)/g
  const PSEUDO = /::?(before|after|placeholder|selection)/g

  // все обычные правила страницы, включая вложенные в @media, @layer и @supports
  const rules = []
  const walk = (list) => {
    for (const rule of list) {
      if (rule instanceof CSSStyleRule) rules.push(rule)
      else if (rule instanceof CSSMediaRule) {
        if (matchMedia(rule.conditionText).matches) walk(rule.cssRules)
      } else if (rule.cssRules) walk(rule.cssRules)
    }
  }
  for (const sheet of document.styleSheets) {
    try {
      walk(sheet.cssRules)
    } catch {
      // таблица с чужого origin без CORS недоступна для чтения
    }
  }

  // делит строку по разделителю, пропуская содержимое скобок и кавычек
  const splitTop = (text, separator) => {
    const parts = []
    let level = 0
    let quote = null
    let current = ''
    for (const char of text) {
      if (quote) {
        if (char === quote) quote = null
      } else if (char === '"' || char === "'") quote = char
      else if (char === '(') level++
      else if (char === ')') level--

      if (char === separator && level === 0 && !quote) {
        if (current.trim()) parts.push(current.trim())
        current = ''
      } else current += char
    }
    if (current.trim()) parts.push(current.trim())
    return parts
  }

  // объявления узла по группам: ключ '' соответствует базовому состоянию,
  // остальные имеют вид ':hover' или '::before'
  const collect = (el) => {
    const groups = {}

    // объявления берутся из cssText: там шорткаты (padding, background) сохранены в
    // авторском виде, при переборе style они разворачиваются в десятки свойств
    const add = (group, style) => {
      groups[group] ??= {}
      for (const declaration of splitTop(style.cssText, ';')) {
        const colon = declaration.indexOf(':')
        if (colon < 0) continue
        const prop = declaration.slice(0, colon).trim()
        if (prop.startsWith('--')) continue
        groups[group][prop] = declaration.slice(colon + 1).trim()
      }
    }

    // порядок каскада приближенный: при конфликте побеждает правило, стоящее позже в
    // таблице стилей, специфичность селекторов не учитывается
    for (const rule of rules) {
      for (const selector of splitTop(rule.selectorText, ',')) {
        const states = [...selector.matchAll(STATES)].map((m) => m[0])
        const pseudo = [...selector.matchAll(PSEUDO)].map((m) => m[0])
        const bare = selector.replace(STATES, '').replace(PSEUDO, '') || '*'
        let matches = false
        try {
          matches = el.matches(bare)
        } catch {
          continue
        }
        if (matches) add([...states, ...pseudo].join(''), rule.style)
      }
    }
    if (el.style.length) add('', el.style)
    return groups
  }

  // предки сверху вниз, затем сам элемент и потомки в пределах глубины
  const chain = []
  for (let el = root.parentElement, i = 0; el && i < parents; el = el.parentElement, i++) {
    chain.unshift(el)
  }
  const styles = new Map()
  const gather = (el, level) => {
    styles.set(el, collect(el))
    if (level < depth) for (const child of el.children) gather(child, level + 1)
  }
  chain.forEach((el) => styles.set(el, collect(el)))
  gather(root, 0)

  // объявления, одинаковые у всех узлов выборки (обычно это общий сброс стилей),
  // выводятся один раз в начале и убираются из узлов
  const key = (group, prop, value) => `${group}\n${prop}\n${value}`
  const counts = new Map()
  for (const groups of styles.values()) {
    for (const [group, props] of Object.entries(groups)) {
      for (const [prop, value] of Object.entries(props)) {
        const id = key(group, prop, value)
        counts.set(id, (counts.get(id) ?? 0) + 1)
      }
    }
  }
  // у единственного узла общего быть не может
  const isCommon = (group, prop, value) =>
    styles.size > 1 && counts.get(key(group, prop, value)) === styles.size

  const printGroups = (el, groups, pad, keep) => {
    const lines = []
    const computed = getComputedStyle(el)
    const vars = {}
    for (const [group, props] of Object.entries(groups)) {
      const entries = Object.entries(props).filter(([prop, value]) => keep(group, prop, value))
      if (!entries.length) continue
      if (group) lines.push(`${pad}  ${group}`)
      for (const [prop, value] of entries) {
        lines.push(`${pad}  ${group ? '  ' : ''}${prop}: ${value}`)
        for (const [, name] of value.matchAll(/var\((--[\w-]+)/g)) {
          const resolved = computed.getPropertyValue(name).trim()
          if (resolved) vars[name] = resolved
        }
      }
    }
    const varEntries = Object.entries(vars)
    if (varEntries.length) {
      lines.push(`${pad}  vars`)
      for (const [name, value] of varEntries) lines.push(`${pad}    ${name}: ${value}`)
    }
    return lines
  }

  const print = (el, indent) => {
    const pad = '  '.repeat(indent)
    const { width, height } = el.getBoundingClientRect()
    const id = el.id ? `#${el.id}` : ''
    const classes = [...el.classList].map((c) => `.${c}`).join('')
    const attrs = [...el.attributes]
      .filter((a) => a.name.startsWith('data-') || a.name === 'role')
      .map((a) => `${a.name}="${a.value}"`)
      .join(' ')
    const text = [...el.childNodes]
      .filter((n) => n.nodeType === 3 && n.textContent.trim())
      .map((n) => n.textContent.trim().slice(0, 40))
      .join(' | ')

    return [
      `${pad}${el.tagName.toLowerCase()}${id}${classes}  [${Math.round(width)}×${Math.round(height)}]` +
        `${attrs ? `  ${attrs}` : ''}${text ? `  "${text}"` : ''}`,
      ...printGroups(el, styles.get(el), pad, (...args) => !isCommon(...args)),
    ]
  }

  const lines = []
  const common = printGroups(root, styles.get(root), '', isCommon)
  if (common.length) lines.push('общее для всех узлов', ...common, '')
  lines.push(...chain.flatMap((el, i) => print(el, i)))

  // текст и размер у повторяющихся узлов разные, в сравнении они не участвуют
  const signature = (block) =>
    block.map((line) => line.replace(/ {2}\[\d+×\d+\].*$/, '')).join('\n')

  // одинаковые соседние поддеревья (ячейки списка, сообщения) сворачиваются в одну строку
  const visit = (el, level) => {
    const block = print(el, chain.length + level)
    if (level >= depth) return block

    let previous = null
    let repeats = 0
    const flush = () => {
      if (repeats > 0) {
        block.push(`${'  '.repeat(chain.length + level + 1)}… × еще ${repeats} таких же`)
      }
      repeats = 0
    }
    for (const child of el.children) {
      const childBlock = visit(child, level + 1)
      const blockKey = signature(childBlock)
      if (blockKey === previous) {
        repeats++
        continue
      }
      flush()
      previous = blockKey
      block.push(...childBlock)
    }
    flush()
    return block
  }
  lines.push(...visit(root, 0))

  const output = lines.join('\n')
  // copy доступна только в консоли devtools
  copy(output)
  console.log(output)
  return `${lines.length} строк скопировано в буфер`
}
