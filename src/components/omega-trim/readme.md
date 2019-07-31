# omega-trim

## What's this ?

This component is used to apply filters to the homology evidences inside the interolog network.

It handle and store those settings:
- `identity` (in percentage)
- `similarity` (in percentage)
- `coverage` (in percentage)
- `e_value`

All the settings can be changed programmatically using the property accessor.

The base parameters for those settings are defined in `BASE_FIXES` object, inside the `utils.ts` file (don't forget to change it inside the `utils.sample.ts` too !).

When a property change, the component emit a trim request handled by `omega-graph` component.

The component automatically block minimum values to actual values when a graph `reheat` is made.


<!-- Auto Generated Below -->


## Properties

| Property     | Attribute    | Description | Type                                                                               | Default             |
| ------------ | ------------ | ----------- | ---------------------------------------------------------------------------------- | ------------------- |
| `coverage`   | `coverage`   |             | `string`                                                                           | `undefined`         |
| `e_value`    | `e_value`    |             | `string`                                                                           | `undefined`         |
| `fix_at`     | --           |             | `{ identity?: string; coverage?: string; similarity?: string; e_value?: string; }` | `original_fixed_at` |
| `identity`   | `identity`   |             | `string`                                                                           | `undefined`         |
| `similarity` | `similarity` |             | `string`                                                                           | `undefined`         |


## Events

| Event                        | Description | Type                                                                                        |
| ---------------------------- | ----------- | ------------------------------------------------------------------------------------------- |
| `omega-trim.property-change` |             | `CustomEvent<{ identity: number; e_value: number; similarity: number; coverage: number; }>` |


## Dependencies

### Used by

 - [omega-tabs](../omega-tabs)

### Graph
```mermaid
graph TD;
  omega-tabs --> omega-trim
  style omega-trim fill:#f9f,stroke:#333,stroke-width:4px
```

----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
