import { Component, h, Element, Event, EventEmitter, State } from '@stencil/core';
import FrontTopology from '../../utils/FrontTopology';

/**
 * Button used to download current graph.
 * 
 * Use a bootstrap modal as interface.
 */
@Component({
  tag: "omega-download",
  styleUrl: 'omega-download.css',
  shadow: false
})
export class OmegaTrim {
  @Element() el: HTMLElement;

  /**
   * Property used to trigger a render. Store a random number. 
   */
  @State() 
  protected render_trigger: number;

  /**
   * Fires when user ask a download as image.
   */
  @Event({
    eventName: "omega-download.download"
  }) image: EventEmitter<string>;

  /**
   * Fires when user ask a download as tabular file.
   */
  @Event({
    eventName: "omega-download.download-as-file"
  }) file: EventEmitter<string>;

  /**
   * Fires when user ask a download as JSON.
   */
  @Event({
    eventName: "omega-download.download-as-json"
  }) fileJSON: EventEmitter<string>;

  downloadAsImage(e: HTMLInputElement) {
    this.image.emit(e.value);
  }

  downloadAsFile(e: HTMLInputElement, type = "text") {
    if (type === "text")
      this.file.emit(e.value);
    else
      this.fileJSON.emit(e.value);
  }

  /**
   * Generate list of pruning parameter in HTML.
   */
  generatePruneParameters() {
    const trim_p = FrontTopology.current_trim_parameters;
    const prune_p = FrontTopology.current_prune_parameters;
    let data: any;

    if (prune_p) {
      data = prune_p;
    }
    else if ('custom_prune' in trim_p && trim_p.custom_prune) {
      data = trim_p.custom_prune;
    }
    else {
      return <li>You don't have any current prune parameters</li>;
    }

    return [
      <li>Maximum distance: {data[1]}</li>, 
      <li>Seed(s): {data[0].length} selected</li>
    ];
  }

  /**
   * Generate list of trimming parameter in HTML.
   */
  generateTrimParameters() {
    const trim_p = FrontTopology.current_trim_parameters;

    // Bind keys to human readable title
    const binding = {
      identity: "Identity",
      similarity: "Similarity",
      coverage: "Coverage",
      experimental_detection_method: "Experimental detection methods",
      taxons: "Taxons",
      e_value: "E-value"
    };

    const items = [];

    if (Object.keys(trim_p).length === 0) {
      return <li>You don't have any current trimming parameters</li>;
    }
    
    // Generate HTML with binding title: value
    for (const t in trim_p) {
      const data = trim_p[t];
      const title = binding[t];

      if (t === 'custom_prune') {
        continue;
      }
      else if (!data || (Array.isArray(data) && data.length === 0)) {
        continue;
      }
      else {
        items.push(
          <li>
            {title}: {Array.isArray(data) ? String(data.length) + " selected" : data.toString()}
          </li>
        );
      }
    }

    return items;
  }

  /**
   * Rendu graphique.
   */
  render() {
    return (
      <div>     
        <div class="download-container" title="Download graph" data-toggle="modal" data-target="#modalDownload" onClick={() => this.render_trigger = Math.random()}>
          <i class="material-icons">get_app</i>
        </div>

        <div class="modal fade" id="modalDownload" tabindex="-1" role="dialog" aria-labelledby="modal_dl" aria-hidden="true">
          <div class="modal-dialog" role="document">
            <div class="modal-content">

              <div class="modal-header">
                <h5 class="modal-title" id="modal_dl">Download graph</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>

              <div class="modal-body">
                <p>
                  Current graph have {FrontTopology.topo ? FrontTopology.topo.nodeNumber : 0} nodes and {FrontTopology.topo ? FrontTopology.topo.edgeNumber : 0} links.
                  <br/>
                  Defined trimming parameters are:
                  <ul>{this.generateTrimParameters()}</ul>
                  Defined prune parameters:
                  <ul>{this.generatePruneParameters()}</ul>
                </p>
                <p>
                  File will be downloaded with the name given in this input.
                  <br/>
                  In order to reconstruct a graph in this tool, you must use the JSON file format.
                </p>
                <form>
                  <div class="form-group">
                    <label htmlFor="__graph-name" class="col-form-label">File name</label>
                    <input type="text" value="graph" class="form-control" id="__graph-name"></input>
                  </div>
                </form>

                <hr/>

                <button type="button" class="btn btn-success btn-block" data-dismiss="modal" onClick={() => this.downloadAsImage(this.el.querySelector('#__graph-name'))}>Download as image</button>
                <button type="button" class="btn btn-info btn-block" data-dismiss="modal" onClick={() => this.downloadAsFile(this.el.querySelector('#__graph-name'))}>Download as tabular file</button>
                <button type="button" class="btn btn-dark btn-block" data-dismiss="modal" onClick={() => this.downloadAsFile(this.el.querySelector('#__graph-name'), "JSON")}>Download as JSON file</button>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }
} 
