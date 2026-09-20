# Токены: канонические значения

Единственная тема живёт в приложении (`mobile/src/lib/theme`). Этот файл —
источник правды по значениям и именам. Код обязан ему соответствовать;
расхождение чинится в теме приложения, а не по месту использования.

Если значение меняется, оно сначала меняется здесь, потом в коде.

## Цвета

```ts
dark = {
  bg:             '#0B0D11',
  surface:        'rgba(255,255,255,0.07)',
  surfaceStrong:  'rgba(255,255,255,0.13)',
  surfaceBorder:  'rgba(255,255,255,0.14)',
  divider:        'rgba(255,255,255,0.12)',
  text:           '#F5F6F7',
  textSecondary:  'rgba(245,246,247,0.62)',
  textTertiary:   'rgba(245,246,247,0.40)',
  tabInactive:    'rgba(245,246,247,0.42)',
  warnBg:         'rgba(242,169,59,0.10)',
  warnBorder:     'rgba(242,169,59,0.30)',
  danger:         '#D96B5A',
  scrim:          'rgba(0,0,0,0.50)',
  coverScrim:     'rgba(0,0,0,0.18)',
  invertedPill:     '#F5F6F7',
  invertedPillText: '#14171C',
}

light = {
  bg:             '#F3F1EC',
  surface:        'rgba(255,255,255,0.55)',
  surfaceStrong:  'rgba(255,255,255,0.80)',
  surfaceBorder:  'rgba(20,23,28,0.09)',
  divider:        'rgba(20,23,28,0.10)',
  text:           '#14171C',
  textSecondary:  'rgba(20,23,28,0.58)',
  textTertiary:   'rgba(20,23,28,0.40)',
  tabInactive:    'rgba(20,23,28,0.40)',
  warnBg:         'rgba(242,169,59,0.14)',
  warnBorder:     'rgba(242,169,59,0.40)',
  danger:         '#C0503C',
  scrim:          'rgba(0,0,0,0.35)',
  coverScrim:     'rgba(0,0,0,0.22)',
  invertedPill:     '#14171C',
  invertedPillText: '#F5F6F7',
}

accent   = '#F2A93B'   // одинаков в обеих темах
onAccent = '#14171C'   // текст и иконки на акценте, всегда тёмные
```

`coverScrim` — тонкое затемнение поверх цветной обложки под стеклянной
панелью. Без него в светлой теме тёмный текст на стекле поверх акцентной
подложки даёт около 4.8:1, на грани допустимого.

Цвета обложек-плейсхолдеров, выбираются детерминированно по названию города:

```ts
coverColors = ['#1F4F4A', '#8C4A34', '#33384F', '#7A4A6B', '#4A5A3A']
```

## Типографика

```ts
family = {
  display: 'Manrope_800ExtraBold',
  bold:    'Manrope_700Bold',
  medium:  'Manrope_500Medium',
  regular: 'Manrope_400Regular',
  mono:    'IBMPlexMono_500Medium',
}

size = {
  hero:      32,  // заголовок онбординга
  authTitle: 28,  // заголовки входа и регистрации
  h1:        26,  // заголовок экрана раздела
  cityHero:  24,  // название города в шапке деталей поездки
  cardTitle: 19,  // название города в карточке поездки
  h2:        17,  // заголовок секции
  body:      15,
  small:     13,
  caption:   12,
  micro:     11,  // подписи табов, чипы
}
```

Manrope 600 SemiBold в проекте не используется.

## Размеры и отступы

```ts
radius = { tile: 10, field: 14, card: 18, cover: 24, sheet: 26, pill: 999, tabBar: 32 }

spacing = { screenX: 20, gap: 12, block: 20, section: 24 }

layout = {
  minTouch:      44,
  borderWidth:    1,   // не hairlineWidth
  tabBarHeight:  64,
  tabBarInsetX:  24,
  tabBarBottom:  28,
  fabSize:       56,
  coverHeight:  172,
  heroHeight:   260,
  avatarHeader:  38,   // аватар в шапке раздела
  avatarProfile: 56,   // аватар в профиле
  iconTile:      36,   // квадратная плитка с иконкой в строке файла
  sectionAdd:    28,   // круглая кнопка «+» у заголовка секции
  heroButton:    38,   // круглые стеклянные кнопки в шапке-герое
  sheetTopInset: 104,  // отступ модальной шторки сверху
  sheetHandleW:  36,
  sheetHandleH:   4,
  dot:            6,   // точка индикатора
  dotActiveW:    20,   // активная точка вытянутая
  switchW:       44,
  switchH:       24,
  switchKnob:    20,
}

blurIntensity = { panel: 20, tabBar: 24 }

coverMuteSaturation = 0.55  // приглушение подложки в истории, НЕ прозрачность
```

## Состояния

Отключённая кнопка — это фон `divider` и текст `textTertiary`,
а не прозрачность на активном стиле. Прозрачность для disabled не использовать:
она тянет за собой текст и ломает контраст.

Нажатое состояние — прозрачность 0.7 на всём элементе, это допустимо.

## Известные расхождения с текущим кодом

На момент составления в приложении: `onAccent` был `#0B0D11`, светлый
`textSecondary` 0.62 вместо 0.58, `pill` 0.10/0.07 вместо `divider` 0.12/0.10,
радиус карточек 20 вместо 18, блюр 30 вместо 20, боковой отступ 16 вместо 20,
граница `hairlineWidth` вместо 1. Всё это чинится в теме.
