# @analytics-debugger/data-layer-helper-ts

TypeScript port of [google/data-layer-helper](https://github.com/google/data-layer-helper) by [David Vallejo](https://github.com/thyngster) — provides the ability to process messages passed onto a dataLayer queue.

- [Build and Test](#build-and-test)
- [Build Formats](#build-formats)
- [Quick Start](#quick-start)
- [What is a Data Layer Queue?](#what-is-a-data-layer-queue)
- [The Abstract Data Model](#the-abstract-data-model)
  - [Overwriting Existing Values](#overwriting-existing-values)
  - [Recursively Merging Values](#recursively-merging-values)
  - [Preventing Default Recursive Merge](#preventing-default-recursive-merge)
  - [Custom Functions](#custom-functions)
    - [The Abstract Data Model Interface](#the-abstract-data-model-interface)
- [Listening for Messages](#listening-for-messages)
  - [Listening to the Past](#listening-to-the-past)
  - [Registering Processors](#registering-processors)
  - [Delaying Processing](#delaying-processing)
- [API Summary](#api-summary)
- [License](#license)

## Build and Test

This project uses [vite-plus](https://viteplus.dev) for building, testing, and type-checking.

```bash
npm install        # Install dependencies
vp build && npx dts-bundle-generator -o dist/index.d.ts src/index.ts  # Build all formats + types
vp build --watch   # Watch mode
vp test            # Run tests
vp check           # Type-check
```

## Build Formats

| Format | File                             | Usage                       |
| ------ | -------------------------------- | --------------------------- |
| ESM    | `dist/index.js`                  | `import` in modern bundlers |
| CJS    | `dist/index.cjs`                 | `require()` in Node.js      |
| IIFE   | `dist/data-layer-helper.iife.js` | `<script>` tag in browsers  |

## Quick Start

```bash
npm install @analytics-debugger/data-layer-helper-ts
```

### ES Module / CommonJS

```ts
import DataLayerHelper from "@analytics-debugger/data-layer-helper-ts";

const dataLayer = [];
const helper = new DataLayerHelper(dataLayer, {
  listener: function (model, message) {
    // Message has been pushed.
    console.log(model, message);
  },
});
```

### CDN (jsDelivr)

```html
<!-- Latest version -->
<script src="https://cdn.jsdelivr.net/npm/@analytics-debugger/data-layer-helper-ts/dist/data-layer-helper.iife.js"></script>

<!-- Pinned version -->
<script src="https://cdn.jsdelivr.net/npm/@analytics-debugger/data-layer-helper-ts@0.0.1/dist/data-layer-helper.iife.js"></script>

<!-- ESM import -->
<script type="module">
  import DataLayerHelper from "https://cdn.jsdelivr.net/npm/@analytics-debugger/data-layer-helper-ts/dist/index.js";
</script>
```

### IIFE (Browser)

```html
<script src="https://cdn.jsdelivr.net/npm/@analytics-debugger/data-layer-helper-ts/dist/data-layer-helper.iife.js"></script>
<script>
  var dataLayer = [];
  var helper = new DataLayerHelper(dataLayer, {
    listener: function (model, message) {
      console.log(message);
    },
  });
</script>
```

## What is a Data Layer Queue?

A data layer queue is simply a JavaScript array that lives on a webpage.

```html
<script>
  dataLayer = [];
</script>
```

Page authors can append messages onto the queue in order to emit information about the page and its state.

```html
<script>
  dataLayer.push({
    title: "Migratory patterns of ducks",
    category: "Science",
    author: "Bradley Wogulis",
  });
</script>
```

These messages are JavaScript objects containing a hierarchy of key/value pairs. They can be metadata about the page content, information about the visitor, or data about events happening on the page. This system allows tools like analytics libraries and tag management systems to access this data in a standard way.

## The Abstract Data Model

When a `DataLayerHelper` is created, it maintains an internal "abstract data model". Each message pushed onto the dataLayer is merged into this model. You can retrieve values from the model using dot-notation:

```js
dataLayer.push({ one: { two: { three: 4 } } });

helper.get("one.two.three"); // Returns 4
helper.get("one.two"); // Returns {three: 4}
```

As each message is processed, its key/value pairs are added to the abstract data model. If the key doesn't currently exist in the model, the pair is simply added. In the case of key conflicts, the action taken depends on the types of the existing and new values:

- **Arrays** and **Plain Objects** — recursively merge when both values are the same type
- **Everything else** — the new value overwrites the existing value

| Existing Value        | New Value    | Action            |
| --------------------- | ------------ | ----------------- |
| Array                 | Array        | Recursively merge |
| Plain Object          | Plain Object | Recursively merge |
| Any other combination | Overwrite    |

### Overwriting Existing Values

When overwriting, the existing value is completely discarded:

```js
// model: { a: [1, 2, 3] }
dataLayer.push({ a: "hello" });
// model: { a: 'hello' }
```

### Recursively Merging Values

When recursively merging, each property in the new value is individually merged into the existing value:

```js
// model: { one: 1, three: 3 }
dataLayer.push({ two: 2 });
// model: { one: 1, three: 3, two: 2 }

// model: { one: { two: 3 } }
dataLayer.push({ one: { four: 5 } });
// model: { one: { two: 3, four: 5 } }
```

### Preventing Default Recursive Merge

To prevent the default recursive merge and overwrite instead, add a truthy `_clear` attribute to the pushed message. The `_clear` key itself is removed from the model after processing.

```js
// model: { user: { name: 'Alice', role: 'admin' } }
dataLayer.push({ user: { name: "Bob" }, _clear: true });
// model: { user: { name: 'Bob' } }  — role is gone
```

This is especially useful for single page applications where you may not want outdated information in the data model when routing between pages.

### Custom Functions

Pushing a function onto the dataLayer allows you to update the abstract data model with custom code. When a function is processed, the value of `this` will be the abstract data model interface.

> **Note:** Arrow functions do not have their own `this`, so you must use a regular `function`.

```js
dataLayer.push(function () {
  var name = this.get("user.name");
  this.set("greeting", "Hello, " + name);
});
```

#### The Abstract Data Model Interface

To safely access the abstract data model from within a custom function, an API with a getter and setter is provided:

- `this.get(key)` — returns a value from the model using dot-notation
- `this.set(key, value)` — creates or overwrites the given key with the new value

## Listening for Messages

When creating a `DataLayerHelper`, you can specify a listener callback to be called whenever a message is pushed onto the dataLayer. This allows your code to be notified immediately whenever the dataLayer has been updated.

```js
function listener(model, message) {
  // Message has been pushed.
  // The helper has merged it onto the model.
  // Now use the message and the updated model to do something.
}
var helper = new DataLayerHelper(dataLayer, { listener: listener });
```

### Listening to the Past

By default (`processNow: true`), the helper processes all existing messages in the dataLayer on construction. The listener will be called once for each existing message, with the model representing the state at the time of that message.

To defer this processing:

```js
var helper = new DataLayerHelper(dataLayer, {
  listener: listener,
  processNow: false,
});
// ... later
helper.process();
```

### Registering Processors

You can register custom command processors that respond to command arrays:

```js
helper.registerProcessor("event", function (name, params) {
  console.log("Event:", name, params);
});

dataLayer.push(["event", "click", { category: "nav" }]);
// Logs: Event: click {category: 'nav'}
```

Multiple processors can be registered for the same command name.

### Delaying Processing

Use `processNow: false` to create the helper without processing existing messages. Call `helper.process()` later when you're ready.

## API Summary

### `new DataLayerHelper(dataLayer, options?)`

| Option          | Type       | Default       | Description                                                      |
| --------------- | ---------- | ------------- | ---------------------------------------------------------------- |
| `listener`      | `function` | —             | Called on every push: `(model, message, dataLayerName) => void`  |
| `processNow`    | `boolean`  | `true`        | Process existing entries on construction                         |
| `dataLayerName` | `string`   | `'dataLayer'` | Optional identifier passed to the listener as the third argument |

### `helper.get(key)`

Returns a value from the internal model using dot-notation.

### `helper.flatten()`

Returns the entire dataLayer history merged into a single object (re-merges from scratch, does not use the internal model).

### `helper.process()`

Manually processes all existing entries in the dataLayer.

### `helper.registerProcessor(commandName, processor)`

Registers a command processor for the given command name.

## Author

[David Vallejo](https://github.com/thyngster) / [Analytics Debugger S.L.U.](https://www.analytics-debugger.com)

## License

Apache-2.0
