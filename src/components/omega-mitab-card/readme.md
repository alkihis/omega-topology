# omega-mitab-card



<!-- Auto Generated Below -->


## Properties

| Property | Attribute | Description       | Type     | Default     |
| -------- | --------- | ----------------- | -------- | ----------- |
| `data`   | --        | Actual link data. | `D3Link` | `undefined` |


## Events

| Event                        | Description                                        | Type                  |
| ---------------------------- | -------------------------------------------------- | --------------------- |
| `omega-mitab-card.hover-off` | Fires when link becomes not hovered in the history | `CustomEvent<void>`   |
| `omega-mitab-card.hover-on`  | Fires when link is hovered in the history          | `CustomEvent<D3Link>` |


## Methods

### `hide() => Promise<void>`

Close the modal.

#### Returns

Type: `Promise<void>`



### `preload() => Promise<void>`

Makes the card in preload mode.

#### Returns

Type: `Promise<void>`



### `show() => Promise<void>`

Show the modal.

#### Returns

Type: `Promise<void>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
