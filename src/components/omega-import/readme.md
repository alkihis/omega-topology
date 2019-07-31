# omega-import

## What's this ?

This component allow user to load a old saved graph in their hard disk drive.

Once the JSON file is loaded, it will trigger a full graph reset with a download of the appropriate skeleton, the needed UniProt data will be fetched and the interaction data for all edges are downloaded from distant server.

<!-- Auto Generated Below -->


## Events

| Event                 | Description                                       | Type                |
| --------------------- | ------------------------------------------------- | ------------------- |
| `omega-import.import` | Fires when a file import started. (order a reset) | `CustomEvent<void>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
