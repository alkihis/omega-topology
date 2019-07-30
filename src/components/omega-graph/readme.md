# my-component



<!-- Auto Generated Below -->


## Properties

| Property | Attribute | Description                       | Type     | Default |
| -------- | --------- | --------------------------------- | -------- | ------- |
| `specie` | `specie`  | Specie representated by the graph | `string` | `"r6"`  |


## Events

| Event                        | Description                                                             | Type                                                       |
| ---------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| `omega-graph.complete-reset` | Fires when the graph is reset                                           | `CustomEvent<void>`                                        |
| `omega-graph.data-update`    | Fires when the graph has a node number or a link number update          | `CustomEvent<{ nodeNumber: number; linkNumber: number; }>` |
| `omega-graph.load-link`      | Fires when a link is clicked, and a information card needs to be loaded | `CustomEvent<D3Link>`                                      |
| `omega-graph.load-protein`   | Fires when a node is clicked, and a information card needs to be loaded | `CustomEvent<Promise<UniprotProtein>>`                     |
| `omega-graph.prune-add`      | Fires when a node is selected                                           | `CustomEvent<string \| string[]>`                          |
| `omega-graph.prune-make`     | Fires when a prune is asked                                             | `CustomEvent<string[]>`                                    |
| `omega-graph.prune-remove`   | Fires when a node is unselected                                         | `CustomEvent<string>`                                      |
| `omega-graph.prune-reset`    | Fires when button "unselect all" is clicked                             | `CustomEvent<void>`                                        |
| `omega-graph.rebuild`        | Fires when the graph is refreshed                                       | `CustomEvent<void>`                                        |
| `omega-graph.rebuild_onto`   | Fires when ontology tree needs to be refreshed. Data: MI IDs            | `CustomEvent<string[]>`                                    |
| `omega-graph.rebuild_taxo`   | Fires when taxonomy tree needs to be refreshed. Data: taxonomic IDs     | `CustomEvent<string[]>`                                    |


## Methods

### `downloadGraphAs(file_name: string, type?: string) => Promise<void>`

Universal method to download the graph in the file format you want.

#### Returns

Type: `Promise<void>`



### `downloadGraphAsImage(image_name?: string | CustomEvent<any>) => Promise<void>`

Start the download of the graph as a JPG image

#### Returns

Type: `Promise<void>`



### `downloadGraphAsJSON(name?: string | CustomEvent<any>) => Promise<void>`

Start the download of the graph as a JSON file

#### Returns

Type: `Promise<void>`



### `downloadGraphAsTab(name?: string | CustomEvent<any>) => Promise<void>`

Start the download of the graph as a tabulated file

#### Returns

Type: `Promise<void>`



### `getLinksOf(id: string) => Promise<D3Link[]>`

Get `D3Link[]` objects linked to a node ID.

#### Returns

Type: `Promise<D3Link[]>`



### `getNode(id: string) => Promise<D3Node>`

Get a `D3Node` object according to its ID.

#### Returns

Type: `Promise<D3Node>`



### `highlightNode(...node_ids: string[]) => Promise<void>`

Highlight one or multiple nodes, according to their IDs.

#### Returns

Type: `Promise<void>`



### `make3dGraph(data: CustomEvent<{ graph_base: D3GraphBase; }> | D3GraphBase) => Promise<void>`

Make the graph, using ForceGraph3D.

Able to receive a *CustomEvent* holding a *detail* property, containing a *graph_base* property of type `D3GraphBase` (type `MakeGraphEvent`).

You can also just give a `D3GraphBase` complient object to this method.

#### Returns

Type: `Promise<void>`



### `removeHighlighting(...node_ids: string[]) => Promise<void>`

Remove highlighting from one or multiple nodes, according to their IDs.

#### Returns

Type: `Promise<void>`



### `removeNode(...removed_nodes: (string | RegExp | D3Node)[]) => Promise<void>`

Remove a node from the graph.

Warning, with the new graph actualisation system, the graph must be reheated after the removal !

#### Returns

Type: `Promise<void>`



### `resetHighlighting() => Promise<void>`

Remove the highlighting for all the nodes.

#### Returns

Type: `Promise<void>`



### `serialize<T, R = string>(encoder: (link: D3Link, node1: D3Node, node2: D3Node, accumulator?: T) => T, finalize_function?: (composed: T) => R) => Promise<string | R>`

Serialize graph into a string using a custom function.

#### Returns

Type: `Promise<string | R>`



### `toJSON() => Promise<string>`

Serialize the graph to JSON (using the `.serialize()` method).

#### Returns

Type: `Promise<string>`



### `toTabular() => Promise<string>`

Serialize the graph to tabular data (using the `.serialize()` method).

#### Returns

Type: `Promise<string>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
