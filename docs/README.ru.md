<p align="center">
  <img src="https://raw.githubusercontent.com/DenjiTensAI/flowrap/main/docs/img_1.png" alt="flowrap — доска пайплайна: перетаскиваемые карточки, порты и связи" width="100%">
</p>

<h1 align="center">flowrap</h1>

<p align="center">
  Wrapper-first доска для Svelte 5.<br>
  Оборачиваешь компонент, который у тебя уже есть, — получаешь драг, зум, pan, порты и связи.
</p>

<p align="center">
  <a href="../README.md">English</a> · <b>Русский</b>
</p>

<p align="center">
  <a href="https://denjitensai.github.io/flowrap/"><b>Живой Storybook →</b></a>
</p>

---

flowrap **headless в части CSS**. Библиотека даёт поведение — математику
указателя, мировые координаты, реестр, SVG-слой, — а все визуальные решения
оставляет тебе. Нет темы, которую надо переопределять, нет `nodeTypes`, которые
надо регистрировать, нет дизайн-системы, с которой надо бороться. Нода — это та
разметка, которую ты положил внутрь, и выглядит она ровно так, как ты её
стилизуешь.

- **Wrapper-first.** `<FlowNode>` даёт твоему существующему компоненту позицию и
  драг. Описывать библиотеке свои данные заранее не нужно.
- **Граф принадлежит тебе.** flowrap не заводит «источник правды», который надо
  синхронизировать. Твой массив связей и есть граф; протяжка просто зовёт
  `onconnect` и сообщает о ней.
- **Headless CSS.** Шесть классов-зацепок и несколько CSS-переменных. Всё
  остальное — карточки, цвета, тени, сетка — твой стиль.
- **Маленькая осознанно.** Четыре компонента, два хелпера, **ноль runtime-
  зависимостей**. Единственный peer — Svelte 5.

## Содержание

- [Быстрый старт](#быстрый-старт)
- [Твои данные](#твои-данные)
- [API](#api)
  - [`<FlowBoard>`](#flowboard)
  - [`<FlowNode>`](#flownode)
  - [`<FlowEdge>`](#flowedge)
  - [`<FlowHandle>`](#flowhandle)
  - [Хелперы координат](#хелперы-координат)
- [Стилизация](#стилизация)
- [Позиции: controlled, uncontrolled и снэпшот](#позиции-controlled-uncontrolled-и-снэпшот)
- [Валидация связей](#валидация-связей)
- [Примеры](#примеры)
- [Contributing](#contributing)
- [Лицензия](#лицензия)

## Быстрый старт

```bash
pnpm add flowrap
```

<details>
<summary>npm / yarn / bun</summary>

```bash
npm  i flowrap
yarn add flowrap
bun  add flowrap
```

</details>

`svelte@^5` — peer-зависимость. Отдельный CSS-файл импортировать не нужно:
стили ядра лежат в `<style>` самих компонентов.

```svelte
<script>
  import { FlowBoard, FlowNode } from 'flowrap';
  import MyCard from './MyCard.svelte';
</script>

<div style="height: 70vh">
  <FlowBoard>
    <FlowNode id="a" x={40} y={40}>
      <MyCard title="Всё, что у тебя уже есть" />
    </FlowNode>

    <FlowNode id="b" x={320} y={200}>
      <button>Даже обычная кнопка</button>
    </FlowNode>
  </FlowBoard>
</div>
```

Карточка двигается драгом, фон панорамирует доску, колесо зумит к курсору. Это
вся настройка.

> [!IMPORTANT]
> **Элемент вокруг `<FlowBoard>` обязан иметь высоту.** Доска объявлена как
> `height: 100%`, то есть размер задаёшь ты. Без него доска схлопывается в ноль
> и выглядит сломанной — нод не видно, драг не ловится. Это первое, что стоит
> проверить.
>
> ```svelte
> <div><FlowBoard>…</FlowBoard></div>                       <!-- схлопнется -->
> <div style="height: 70vh"><FlowBoard>…</FlowBoard></div>  <!-- правильно -->
> ```

## Твои данные

flowrap никогда не требует придать данным определённую форму. Оставляй тот
массив, который ты написал бы и так, и просто рендери его — библиотеке нужен
только `id` у ноды и `from`/`to` у связи.

```ts
import type { Connection } from 'flowrap';

// Твои ноды: из полей flowrap читает только id. Остальное — твоё.
const nodes = [
  { id: 'ingest',   x: 40,  y: 180, title: 'Webhook',   subtitle: 'POST /api/orders' },
  { id: 'queue',    x: 250, y: 180, title: 'Queue',     subtitle: 'Redis Streams' },
  { id: 'parse',    x: 465, y: 50,  title: 'Parse',     subtitle: 'JSON → Order' },
  { id: 'store',    x: 905, y: 150, title: 'Warehouse', subtitle: 'Postgres · orders' }
];

// Твои связи: from/to ссылаются на id нод, хэндлы опциональны.
// Связь — это ровно то, что даёт onconnect, плюс твой собственный id.
type Link = Connection & { id: string };

let links = $state<Link[]>([
  { id: 'l1', from: 'ingest', to: 'queue', fromHandle: 'out', toHandle: 'in' },
  { id: 'l2', from: 'queue',  to: 'parse', fromHandle: 'out', toHandle: 'in' }
]);
```

Два блока `{#each}` — и доска работает:

```svelte
<div style="height: 70vh">
  <FlowBoard onconnect={(c) => (links = [...links, { id: crypto.randomUUID(), ...c }])}>
    {#each nodes as node (node.id)}
      <FlowNode id={node.id} x={node.x} y={node.y}>
        <div class="card">
          <FlowHandle id="in" type="target" />
          <strong>{node.title}</strong>
          <p>{node.subtitle}</p>
          <FlowHandle id="out" type="source" />
        </div>
      </FlowNode>
    {/each}

    {#each links as link (link.id)}
      <FlowEdge from={link.from} to={link.to}
                fromHandle={link.fromHandle} toHandle={link.toHandle} />
    {/each}
  </FlowBoard>
</div>
```

Массив твой, поэтому изменение графа — обычный Svelte:

```ts
const addLink    = (c: Connection) => (links = [...links, { id: crypto.randomUUID(), ...c }]);
const removeLink = (id: string)    => (links = links.filter((l) => l.id !== id));
```

## API

Всё, что экспортирует пакет:

```ts
import {
  FlowBoard,    // доска: zoom, pan, SVG-слой связей
  FlowNode,     // враппер: даёт разметке позицию и драг
  FlowEdge,     // связь между двумя нодами
  FlowHandle,   // порт, от которого тянут связь
  screenToFlow, // экран → мир
  flowToScreen  // мир → экран
} from 'flowrap';

import type {
  Position,     // { x: number; y: number }
  Viewport,     // { pan: Position; zoom: number }
  Connection,   // { from, to, fromHandle?, toHandle? } — то, что даёт onconnect
  EdgePathType, // 'straight' | 'bezier' | 'step'
  HandleType    // 'source' | 'target' | 'both'
} from 'flowrap';
```

### `<FlowBoard>`

Вьюпорт. Держит мировой трансформ, рисует слой связей и сообщает о завершённых
протяжках.

```svelte
<div style="height: 70vh">
  <FlowBoard
    bind:zoom
    bind:pan
    minZoom={0.35}
    maxZoom={2.5}
    onconnect={(c) => (links = [...links, { id: crypto.randomUUID(), ...c }])}
  >
    <!-- сюда кладутся ноды и рёбра -->
  </FlowBoard>
</div>
```

| Проп | Тип | По умолчанию | |
|---|---|---|---|
| `zoom` | `number` | `1` | `$bindable` |
| `pan` | `Position` | `{ x: 0, y: 0 }` | `$bindable` |
| `positions` | `Record<string, Position>` | `{}` | `$bindable`, снэпшот всех нод |
| `minZoom` | `number` | `0.1` | |
| `maxZoom` | `number` | `4` | |
| `zoomSpeed` | `number` | `0.002` | `zoom * Math.exp(-deltaY * zoomSpeed)` |
| `onconnect` | `(c: Connection) => void` | — | протяжка завершилась валидным дропом |
| `isValidConnection` | `(c: Connection) => boolean` | — | твоя политика связей |
| `children` | `Snippet` | — | ноды, рёбра и всё, что нужно в мире |

Драг фона панорамирует доску, колесо зумит к курсору. Драг, начатый на ноде или
на порту, доску не панорамирует.

Всё, что положено внутрь доски, живёт в **мировых координатах** — панорамируется
и масштабируется вместе с нодами. Именно так сделана точечная сетка на скриншоте:
обычный `<div>` с `radial-gradient`, задвинутый под связи через `z-index`.

### `<FlowNode>`

Враппер. Даёт тому, что внутри, позицию и драг.

```svelte
<FlowNode id="queue" x={250} y={180}>
  <MyCard title="Queue" />
</FlowNode>
```

| Проп | Тип | По умолчанию | |
|---|---|---|---|
| `id` | `string` | — | обязателен, уникален в пределах доски |
| `x` | `number` | `0` | `$bindable` |
| `y` | `number` | `0` | `$bindable` |
| `disabled` | `boolean` | `false` | фиксирует ноду на месте |
| `children` | `Snippet` | — | твоя разметка |

Враппер получает атрибут `data-fr-node={id}` — удобная цель и для стилей, и для
тестов.

### `<FlowEdge>`

Связь между двумя нодами. Сам ничего не рендерит: регистрируется в доске, а все
линии рисует один общий SVG-слой под нодами.

```svelte
<FlowEdge from="queue" to="parse" fromHandle="out" toHandle="in" type="bezier" />
```

| Проп | Тип | По умолчанию | |
|---|---|---|---|
| `from` | `string` | — | id ноды-источника |
| `to` | `string` | — | id ноды-приёмника |
| `type` | `'bezier' \| 'straight' \| 'step'` | `'bezier'` | форма линии |
| `fromHandle` | `string` | — | id порта на конце `from` |
| `toHandle` | `string` | — | id порта на конце `to` |
| `id` | `string` | авто | ключ в реестре; нужен, только чтобы адресовать ребро снаружи |

С хэндлами линия приходит в центр порта, без них — на границу ноды. Толщина
штриха не меняется при зуме.

### `<FlowHandle>`

Порт. Тянешь от одного к другому — получается связь.

```svelte
<FlowNode id="queue" x={250} y={180}>
  <div class="card">
    <FlowHandle id="in"  type="target" class="port left" />
    <strong>Queue</strong>
    <FlowHandle id="out" type="source" class="port right" />
  </div>
</FlowNode>
```

| Проп | Тип | По умолчанию | |
|---|---|---|---|
| `id` | `string` | — | обязателен, уникален **в пределах своей ноды** |
| `type` | `'source' \| 'target' \| 'both'` | `'both'` | направление |
| `children` | `Snippet` | — | твоя разметка внутри точки |
| `...rest` | — | — | `class`, `aria-*`, `data-*` … попадают на элемент порта |

Объявляй его **внутри контента ноды** — свою ноду он находит через контекст,
повторять `node="queue"` не нужно. Где окажется порт, решает твой CSS, а не
схема: дай карточке `position: relative` и расставь точки там, где им место.

Протяжка заканчивается вызовом `onconnect` у доски с
`{ from, to, fromHandle, toHandle }`. Дроп на пустое место, <kbd>Esc</kbd> или
прерванный жест тихо гасят протяжку.

### Хелперы координат

```ts
import { screenToFlow, flowToScreen } from 'flowrap';

screenToFlow({ x, y }, { pan, zoom }); // экран → мир
flowToScreen({ x, y }, { pan, zoom }); // мир → экран
```

Оба работают в координатах, **локальных для доски** (её левый верхний угол —
`{0, 0}`), а не в координатах страницы. Перевод из события указателя делаешь сам:

```ts
const rect = boardEl.getBoundingClientRect();
const world = screenToFlow({ x: e.clientX - rect.left, y: e.clientY - rect.top }, { pan, zoom });
```

## Стилизация

Из видимого flowrap стилизует только точку порта и штрих связи — и то, и другое
через переменные. Всё остальное — твоя разметка и твой CSS.

**Шесть классов-зацепок плюс data-атрибут враппера ноды:**

| Селектор | Что это |
|---|---|
| `.fr-viewport` | обрезающий контейнер доски |
| `.fr-world` | слой, который панорамируется и масштабируется |
| `.fr-edges` | SVG-слой со всеми связями |
| `.fr-edge` | `<path>` одной связи |
| `.fr-connection` | превью-линия во время протяжки |
| `.fr-handle` | точка порта |
| `[data-fr-node]` | враппер ноды |

**Все переменные:**

```css
.my-board {
  /* связи */
  --fr-edge-stroke: #94a3b8;
  --fr-edge-width: 1.75;

  /* порты */
  --fr-handle-size: 11px;
  --fr-handle-bg: #fff;
  --fr-handle-border: #666;

  /* превью-линия во время протяжки */
  --fr-connection-stroke: #2563eb;
  --fr-connection-width: 2;
  --fr-connection-dash: 5 5;
}
```

Это обычные кастомные свойства, поэтому темизация — обычный CSS. Доска со
скриншота переключается в тёмную тему переопределением на враппере:

```css
.stage[data-theme='dark'] {
  --fr-edge-stroke: #475569;
  --fr-connection-stroke: #60a5fa;
  --fr-handle-bg: #0f172a;
}
```

**Расстановка портов.** Контекст позиционирования — карточка, порты
абсолютны относительно неё. Порты принадлежат другому компоненту, поэтому
достаём их через `:global`:

```svelte
<FlowNode id="queue">
  <div class="card">
    <FlowHandle id="in"  type="target" class="left" />
    <strong>Queue</strong>
    <FlowHandle id="out" type="source" class="right" />
  </div>
</FlowNode>

<style>
  .card {
    /* порты позиционируются относительно карточки */
    position: relative;
    width: 178px;
    padding: 10px 12px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-left: 3px solid var(--accent, #2563eb);
    border-radius: 10px;
    box-shadow: 0 8px 20px -12px rgb(15 23 42 / 0.35);
    cursor: grab;
  }

  .card:active { cursor: grabbing; }

  .card :global(.fr-handle) {
    position: absolute;
    top: 50%;
    margin-top: -6px;
    border: 2px solid var(--accent, #2563eb);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #2563eb) 18%, transparent);
    transition: transform 0.12s;
  }

  .card :global(.fr-handle.left)  { left: -7px; }
  .card :global(.fr-handle.right) { right: -7px; }
  .card :global(.fr-handle:hover) { transform: scale(1.35); }
</style>
```

Этот фрагмент взят с доски со скриншота — полная версия лежит в
[`storybook/src/stories/showcase/PipelineBoard.svelte`](../storybook/src/stories/showcase/PipelineBoard.svelte).

## Позиции: controlled, uncontrolled и снэпшот

Флага режима нет. Кто владеет позицией — нода или ты — решает наличие `bind:`.

```svelte
<!-- uncontrolled: позицию хранит нода, x/y — начальные значения -->
<FlowNode id="a" x={40} y={40}>…</FlowNode>

<!-- controlled: позиция живёт в твоём состоянии -->
<FlowNode id="a" bind:x bind:y>…</FlowNode>
```

Для всей доски сразу есть `bind:positions` — двусторонний
`Record<id, {x, y}>`, удобный для сохранения и восстановления раскладки:

```svelte
<script>
  let positions = $state({});

  const save = () => localStorage.setItem('layout', JSON.stringify(positions));
  const load = () => {
    const raw = localStorage.getItem('layout');
    if (raw) positions = JSON.parse(raw); // ноды реально переедут
  };
</script>

<FlowBoard bind:positions>…</FlowBoard>
```

Работает в обе стороны: драг ноды поднимает координаты в `positions`, а
присваивание `positions` двигает ноды. Пока нода в драге, она игнорирует
входящие присваивания — загрузка посреди жеста не дёрнет карточку из-под
курсора. `bind:x`/`bind:y` и `bind:positions` можно использовать вместе.

## Валидация связей

Прежде чем сработает `onconnect`, связь-кандидат проходит три проверки по
порядку:

1. **запрет self-connect** — `from === to` отклоняется;
2. **направления портов должны совпадать** — `source` → `target`, а `both`
   подходит к любому;
3. **твой `isValidConnection`** — прикладная часть, вызывается последней.

Правила, зависящие от твоих данных, — это шаг 3: библиотека твоих связей не
видела.

```svelte
<FlowBoard
  isValidConnection={(c) => !links.some((l) => l.from === c.from && l.to === c.to)}
  onconnect={(c) => (links = [...links, { id: crypto.randomUUID(), ...c }])}
/>
```

Если какая-то проверка не прошла, превью-линия гаснет и `onconnect` не зовётся.

## Примеры

**[Живой Storybook](https://denjitensai.github.io/flowrap/)** — все стори
прямо в браузере, ставить ничего не нужно.

Запустить те же сценарии локально:

```bash
pnpm storybook                    # витрина компонентов, включая доску выше
pnpm --filter playground dev      # SvelteKit-приложение для ручного QA и e2e
```

Стори **Showcase** в Storybook — это доска со скриншота: драг, зум, живое
создание связей, сохранение и восстановление раскладки, переключение темы —
всё в одном файле, который можно прочитать целиком.

Пишешь код с ИИ-ассистентом? В пакете лежит `llms.txt` — весь API и набор
рецептов одним самодостаточным файлом, после установки доступен как
`node_modules/flowrap/llms.txt`.

## Contributing

Пул-реквесты приветствуются. Всё нужное — окружение, команды, структура
проекта, тесты и архитектурные инварианты, на которых стоят тесты, — в
**[CONTRIBUTING.md](../CONTRIBUTING.md)**.

Если работаешь над кодом с ИИ-агентом, сначала покажи ему
**[AGENTS.md](../AGENTS.md)**: там замеры, опровергнутые гипотезы и ловушки,
которые уже стоили времени.

## Лицензия

[MIT](../LICENSE) © Denis Movsumov
