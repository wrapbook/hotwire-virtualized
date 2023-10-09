# Hotwire Virtualized

## Usage

```html
<div
  data-controller="virtualized"
  data-virtualized-height-value="100vh"
  data-virtualized-row-height-value="50"
  data-virtualized-url-value="/load-items"
  data-virtualized-ids-value="[1,2,3,4,5]"
>
  <template data-virtualized-target="placeholder">
    <li><div>Loading...</div></li>
  </template>

  <div data-virtualized-target="viewport">
    <ul data-virtualized-target="content"></ul>
  </div>
</div>
```

## Actions

This library uses [custom actions](https://turbo.hotwired.dev/handbook/streams#custom-actions) to interact with the virtualized list.

### Replace / Load

```html
<turbo-stream action="virtualized-replace" target="1">
  <template>
    <li>
      <div>ID {id}</div>
    </li>
  </template>
</turbo-stream>
```
