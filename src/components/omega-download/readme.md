# omega-download

## What's this ?

This component is a way to download currently visible graph.

By default, graph informations are shown to the user (node number, link number...).

User can choose the future filename of his save, then download it in 3 differents formats:

- image (`jpg` file, screenshot of the graph)
- tabular file (`tsv` file), in order to compute data in other programs
- JSON file (`json` file), in order to reload the graph later in this tool

<!-- Auto Generated Below -->


## Events

| Event                             | Description                                     | Type                  |
| --------------------------------- | ----------------------------------------------- | --------------------- |
| `omega-download.download`         | Fires when user ask a download as image.        | `CustomEvent<string>` |
| `omega-download.download-as-file` | Fires when user ask a download as tabular file. | `CustomEvent<string>` |
| `omega-download.download-as-json` | Fires when user ask a download as JSON.         | `CustomEvent<string>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
