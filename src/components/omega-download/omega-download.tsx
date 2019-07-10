import { Component, h, Element, Event, EventEmitter } from '@stencil/core';

@Component({
  tag: "omega-download",
  styleUrl: 'omega-download.css',
  shadow: false
})
export class OmegaTrim {
  @Element() el: HTMLElement;

  public static readonly tag = "omega-download";

  @Event({
    eventName: "omega-download.download"
  }) image: EventEmitter<string>;

  @Event({
    eventName: "omega-download.download-as-file"
  }) file: EventEmitter<string>;

  emit(e: HTMLInputElement) {
    this.image.emit(e.value);
  }

  downloadAsFile(e: HTMLInputElement) {
    this.file.emit(e.value);
  }

  /**
   * Rendu graphique.
   */
  render() {
    return (
      <div>     
        <div class="download-container" title="Download graph" data-toggle="modal" data-target="#modalDownload">
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
                <form>
                  <div class="form-group">
                    <label htmlFor="__graph-name" class="col-form-label">File name</label>
                    <input type="text" value="graph" class="form-control" id="__graph-name"></input>
                  </div>
                </form>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-success" data-dismiss="modal" onClick={() => this.emit(this.el.querySelector('#__graph-name'))}>Download as image</button>
                <button type="button" class="btn btn-info" data-dismiss="modal" onClick={() => this.downloadAsFile(this.el.querySelector('#__graph-name'))}>Download as tabular file</button>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }
} 
