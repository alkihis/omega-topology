# omega-artefact

## What's this ?

This component is the interface to add "artefactual" edges to the graph.

An artefactual edge is a link that is not registred in the database.

Users can register their own edges using a TSV file, under the form:

```
ID_1    ID_2    MI_ID
```

As those interactions aren't registred into the database, a simple page reload will erase the added data.



<!-- Auto Generated Below -->


## Events

| Event                  | Description                                                                 | Type                |
| ---------------------- | --------------------------------------------------------------------------- | ------------------- |
| `omega-artefact.reset` | Fires when omega-artefact needs to reset the graph after links importation. | `CustomEvent<void>` |


----------------------------------------------

*Built with [StencilJS](https://stenciljs.com/)*
