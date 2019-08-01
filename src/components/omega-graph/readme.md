# omega-graph

## What's this ?

This component is the master of the website.

It role is to show a 3D Graph representing the interolog network.

It handle a large number of events like the graph reset, reheat, and node selection, and transmit requests to the `FrontTopology` singleton.

## Initialisation

By default, the graph load the specie `r6`.
The specie to load is automatically determined at the component load, with the parameter `specie` of the URL's query string.

**Warning**: This component is in charge to initialize `FrontTopology` with the right specie. If specie change, graph will disappear and load a brand new specie !

This component is also in charge to inform the user, at the start of the website, of the UniProt data download status, and remove the preloader of the page.

## Usage

Many methods are presents in this component in order to get nodes informations, highlight and more. Check it out in the [Methods](#methods) section !

Otherwise, many of its usage goes through event listening.
Take a look to the listeners in the code (section `LISTENERS`), each event name is inside the `@Event()` decorator and fully documented.

This component emit a huge bunch of multiple events when things occurs. Check it out what in the [Events](#events) section.


## Questions

### What's the difference between, refresh, reheat and reset ?

- A `refresh` is when a trim occurs. The internal data of the graph does not change, it change only the currenlty visible nodes.

- A `reheat` is to re-enable force engine only for visible nodes. This implies to destroy invisible nodes from the graph data. For this reason, after a reheat, the minimum value of the trimming parameters will be locked at their current value during the reheat.

- A `reset` is a complete destruction of graph, and a regeneration from the internal interolog network stored in `FrontTopology`. All filters will be lost and hidden nodes will be visible again. It can reverse a `reheat`.

### Why this component is not in charge of the real network ?

Too many components need network informations, and all of those infos are not useful for `omega-graph`. For this reason, a global singleton appear to be a good solution. So, all the network data logic is stored inside the `FrontTopology` object.

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
| `omega-graph.rebuild-onto`   | Fires when ontology tree needs to be refreshed. Data: MI IDs            | `CustomEvent<string[]>`                                    |
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
