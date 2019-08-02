# omega-uniprot-card

## What's this ?

This component show node information to the user.

Presented informations are **protein accession number**, **gene names**, **protein names**, **protein functions** and the **protein sequence**.

Each protein visualized trigger a download of full protein information from `omega-topology-uniprot` micro-service.

The card contains a history of visited nodes (maximum 5), and hover a node will highlight it and make it flash into the graph.


<!-- Auto Generated Below -->


## Properties

| Property     | Attribute    | Description                                     | Type             | Default     |
| ------------ | ------------ | ----------------------------------------------- | ---------------- | ----------- |
| `data`       | --           | Save the current node (unwrapped, when loaded). | `UniprotProtein` | `undefined` |
| `error_mode` | `error_mode` | True if an error has been detected.             | `boolean`        | `false`     |


## Events

| Event                          | Description                                 | Type                  |
| ------------------------------ | ------------------------------------------- | --------------------- |
| `omega-uniprot-card.hover-off` | Fires when node is unhovered in the history | `CustomEvent<void>`   |
| `omega-uniprot-card.hover-on`  | Fires when node is hovered in the history   | `CustomEvent<string>` |


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
