# Hotwire Virtualized

Virtualized lists for Hotwire using Stimulus and Turbo Streams.

![hotwire-virtualized](https://github.com/wrapbook/hotwire-virtualized/assets/603921/5d48c4a0-1714-4880-af69-76adbb7bf40b)

## Usage

A minimal example within a Rails app [can be found here](https://github.com/leighhalliday/rails-hotwire-virtualized).

```html
<div
  data-controller="virtualized"
  data-virtualized-row-height-value="50"
  data-virtualized-url-value="/load-items"
  data-virtualized-ids-value="[1,2,3,4,5]"
  style="height: 100vh"
>
  <template data-virtualized-target="placeholder">
    <li>Loading...</li>
  </template>

  <ul data-virtualized-target="content"></ul>
</div>
```

## Turbo Actions

This library uses [custom actions](https://turbo.hotwired.dev/handbook/streams#custom-actions) to interact with the virtualized list.

### Replace / Load

```html
<turbo-stream action="v-replace" target="1">
  <template>
    <li>ID {id}</li>
  </template>
</turbo-stream>
```

### Remove

```html
<turbo-stream action="v-remove" target="1"></turbo-stream>
```

### Append

```html
<turbo-stream action="v-append" target="6">
  <template>
    <li>ID 6</li>
  </template>
</turbo-stream>
```

## Stimulus Actions

### Prepend

```html
<button
  data-action="virtualized#actionRender"
  data-virtualized-id-param="123"
  data-virtualized-action-param="prepend"
>
  Prepend ID
</button>
```

### Append

```html
<button
  data-action="virtualized#actionRender"
  data-virtualized-id-param="123"
  data-virtualized-action-param="append"
>
  Append ID
</button>
```

## Emitting Events

Within a controller in your app, dispatch an event which includes:

- id: The unique ID of this row, possibly to fetch from backend.
- action: The action to perform, one of `prepend`, `append`, `remove`, `before`, `after`, `replace`.
- element: The HTML element to be inserted, if left blank, virtualized will fetch from backend using `id`.
- targetId: When action is "before" or "after" or "replace" used to place relative to another row.
- virtualizedId: When multiple virtualized controllers are on the page, this is used to target a specific instance.

```js
const { id, element } = this.buildElement();
this.dispatch("emit", {
  detail: { id, element, action: "append", scrollTo: true },
});
```

Catch the event and forward it to the virtualized controller's `eventRender` action:

```html
<div
  data-controller="event"
  data-action="event:emit->virtualized#eventRender"
></div>
```

## Actions

### Modifying Rows

The `actionRender` action can be called to prepend, append, insert, remove, etc... rows.

Require params:

- id: The unique ID of this row, possibly to fetch from backend.
- action: What action to perform
  - prepend
  - append
  - after
  - before
  - replace
  - remove
- targetId: when the action is relative
- selector: used to find element to add to cache via `document.querySelector(selector)`

## Preload Data

By default, the virtualized controller will fetch data from the backend for any IDs that aren't in its row cache. You can preload data into the row cache using the `preloaded` target. This is useful when you want to render the first set of rows immediately.

You must pass a data attribute of `data-preloaded-id="1"` where 1 is the ID that corresponds to the row, as it is how we correspond this row to the data in the row cache.

```html
<template data-virtualized-target="preloaded" data-preloaded-id="1">
  <li>Preloaded 1</li>
</template>

<template data-virtualized-target="preloaded" data-preloaded-id="2">
  <li>Preloaded 2</li>
</template>
```

## Multiple Virtualized

When you require multiple instances on a single page, you must set the `virtualized-id` value to a unique value for each instance. The default value when not set is `virtualized`.

```html
<div
  data-controller="virtualized"
  data-virtualized-virtualized-id-value="virtual-a"
>
  <!-- First Instance -->
</div>

<div
  data-controller="virtualized"
  data-virtualized-virtualized-id-value="virtual-b"
>
  <!-- Second Instance -->
</div>
```

### Stream Responses

When stream responses need to target a specific instance must include the `virtualized-id` attribute:

```html
<turbo-stream action="v-replace" target="1" virtualized-id="virtual-a">
  <template>
    <li>Content</li>
  </template>
</turbo-stream>
```

### Events

Events can also be targeted towards a specific instance using the `virtualizedId` detail value:

```js
this.dispatch("emit", {
  detail: { id, element, action: "prepend", virtualizedId: "virtual-a" },
});
```

### Request Headers

Requests to load data from the server will include the `X-Virtualized-Id` header value in order to differentiate requests being made by different instances.

## Scrolling

You can call the `scrollTop` or `scrollBottom` actions to scroll to the top or bottom of the list.

```html
<button data-action="virtualized#scrollTop">Scroll Top</button>
<button data-action="virtualized#scrollBottom">Scroll Bottom</button>
```
