# omega-mitab-card

## What's this ?

This component show link information to the user.

Presented informations are **homology support**, **interaction detection methods**, **interactors identifiers**, **interaction species** and the **percentage of similiarity**.

It need interaction data (MI Tab) to be downloaded.

In order to present taxonomy information and MI IDs real term, it fetch data from two micro-service using `OntologyTermsCache` and `TaxonomyTermsCache`.

The card contains a history of visited links (maximum 5), and hover a link will highlight it into the graph.

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
