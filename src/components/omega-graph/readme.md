# my-component



<!-- Auto Generated Below -->


## Properties

| Property | Attribute | Description                    | Type     | Default |
| -------- | --------- | ------------------------------ | -------- | ------- |
| `specie` | `specie`  | Espèce modélisée par le graphe | `string` | `"r6"`  |


## Events

| Event                        | Description | Type                                                       |
| ---------------------------- | ----------- | ---------------------------------------------------------- |
| `omega-graph.complete-reset` |             | `CustomEvent<void>`                                        |
| `omega-graph.data-update`    |             | `CustomEvent<{ nodeNumber: number; linkNumber: number; }>` |
| `omega-graph.load-link`      |             | `CustomEvent<D3Link>`                                      |
| `omega-graph.load-protein`   |             | `CustomEvent<Promise<UniprotProtein>>`                     |
| `omega-graph.prune-add`      |             | `CustomEvent<string \| string[]>`                          |
| `omega-graph.prune-remove`   |             | `CustomEvent<string>`                                      |
| `omega-graph.prune-reset`    |             | `CustomEvent<void>`                                        |
| `omega-graph.rebuild`        |             | `CustomEvent<void>`                                        |
| `omega-graph.rebuild_onto`   |             | `CustomEvent<string[]>`                                    |
| `omega-graph.rebuild_taxo`   |             | `CustomEvent<string[]>`                                    |


## Methods

### `downloadGraphAs(file_name: string, type?: string) => Promise<void>`



#### Returns

Type: `Promise<void>`



### `downloadGraphAsImage(image_name?: string | CustomEvent<any>) => Promise<void>`



#### Returns

Type: `Promise<void>`



### `downloadGraphAsJSON(name?: string | CustomEvent<any>) => Promise<void>`



#### Returns

Type: `Promise<void>`



### `downloadGraphAsTab(name?: string | CustomEvent<any>) => Promise<void>`



#### Returns

Type: `Promise<void>`



### `getLinksOf(id: string) => Promise<any>`



#### Returns

Type: `Promise<any>`



### `getNode(id: string) => Promise<any>`



#### Returns

Type: `Promise<any>`



### `highlightNode(...node_ids: string[]) => Promise<void>`



#### Returns

Type: `Promise<void>`



### `make3dGraph(data: CustomEvent<{ graph_base: D3GraphBase; }> | D3GraphBase) => Promise<void>`

Construction d'un graphe, en utilisant ForceGraph3D.

Capable de recevoir un *CustomEvent* doté une propriété *detail* contenant un objet, possédant une propriété *graph_base* de type `D3GraphBase` (type `MakeGraphEvent`).

Il est possible de directement passer un object implémentant `D3GraphBase` à cette fonction, qui construira le graphe en conséquence.

#### Returns

Type: `Promise<void>`



### `removeHighlighting(...node_ids: string[]) => Promise<void>`



#### Returns

Type: `Promise<void>`



### `removeHighlightingRegex(matcher: RegExp) => Promise<void>`



#### Returns

Type: `Promise<void>`



### `removeNode(...removed_nodes: (string | RegExp | D3Node)[]) => Promise<void>`



#### Returns

Type: `Promise<void>`



### `resetHighlighting() => Promise<void>`



#### Returns

Type: `Promise<void>`



### `serialize<T, R = string>(encoder: (link: D3Link, node1: D3Node, node2: D3Node, accumulator?: T) => T, finalize_function?: (composed: T) => R) => Promise<string | R>`

Serialize graph into a string using a custom function.

#### Returns

Type: `Promise<string | R>`



### `toJSON() => Promise<string>`



#### Returns

Type: `Promise<string>`



### `toTabular() => Promise<string>`



#### Returns

Type: `Promise<string>`




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
