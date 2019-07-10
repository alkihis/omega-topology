# my-component



<!-- Auto Generated Below -->


## Properties

| Property | Attribute | Description                    | Type     | Default |
| -------- | --------- | ------------------------------ | -------- | ------- |
| `specie` | `specie`  | Espèce modélisée par le graphe | `string` | `"r6"`  |


## Events

| Event                      | Description | Type                              |
| -------------------------- | ----------- | --------------------------------- |
| `omega-graph.rebuild_onto` |             | `CustomEvent<string[]>`           |
| `omega-graph.rebuild_taxo` |             | `CustomEvent<string[]>`           |
| `prune-add-node`           |             | `CustomEvent<string \| string[]>` |
| `prune-delete-node`        |             | `CustomEvent<string>`             |
| `prune-reset-nodes`        |             | `CustomEvent<void>`               |


## Methods

### `downloadGraphAsImage(image_name?: string) => Promise<void>`



#### Returns

Type: `Promise<void>`



### `getLinksOf(id: string) => Promise<any>`



#### Returns

Type: `Promise<any>`



### `getNode(id: string) => Promise<any>`



#### Returns

Type: `Promise<any>`



### `highlightLink(source: string, target: string) => Promise<void>`



#### Returns

Type: `Promise<void>`



### `highlightNode(...node_ids: string[]) => Promise<void>`



#### Returns

Type: `Promise<void>`



### `highlightNodeRegex(matcher: RegExp) => Promise<void>`



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




----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
