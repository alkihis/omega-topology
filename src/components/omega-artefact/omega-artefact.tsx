import { Component, h, Element, Event, EventEmitter, State, Watch } from '@stencil/core';
import FrontTopology from '../../utils/FrontTopology';

/**
 * Component used for create artefactual edges.
 * 
 * Use a bootstrap modal as interface.
 */
@Component({
  tag: "omega-artefact",
  styleUrl: 'omega-artefact.css',
  shadow: false
})
export class OmegaArtefact {
  @Element() el: HTMLElement;

  /**
   * Fires when omega-artefact needs to reset the graph after links importatiob.
   */
  @Event({
    eventName: "omega-artefact.reset"
  }) reheat: EventEmitter<void>;

  /**
   * File stored into the component
   */
  @State()
  protected file: File;

  @Watch('file')
  fileChange() {
    this.has_accepted = false;
  }

  /**
   * Store if the user have clicked on the "Load" button
   */
  @State()
  protected has_accepted = false;

  /**
   * True if the file could not be read
   */
  @State()
  protected in_error = false;

  emit() {
    this.reheat.emit();
  }

  /**
   * HTML generation for the loading indicator
   */
  generateLoader() {
    return (
      <div>
        <h5 class="modal-title">Loading...</h5>
        <p>
          Please wait, the graph will soon reload
        </p>
      </div>
    );
  }

  /**
   * Read the selected file.
   * 
   * Add all the links presents in the file into the interolog network, then refresh the graph.
   */
  async loadTheFile() {
    this.has_accepted = true;
    
    const interact_file = this.file;

    // Lit le fichier

    try {
      let data: any = await new Promise((resolve, reject) => {
        const r = new FileReader;

        r.onerror = reject;
        r.onload = () => {
          resolve(r.result as string);
        }

        r.readAsText(interact_file);
      }) as string;

      // Parsage ligne par ligne...
      let i = 0;
      for (const line of data.split('\n')) {
        if (line.trim() === "") {
          continue;
        }

        const [id1, id2, idMethod] = line.split('\t');

        if (!id1 || !id2 || !idMethod) {
          throw {message: 'Unable to read line ' + String(i+1), id1, id2, idMethod};
        }

        // Add the edge
        FrontTopology.topo.createArtefactual({
          source: id1,
          target: id2
        }, [{
          mi_ids: [idMethod],
          tax_ids: [FrontTopology.topo.taxomic_id],
          id1, id2,
          pubmed_ids: ["000000"]
        }]);

        i++;
      }

      this.reheat.emit();

      this.file = undefined;
      this.has_accepted = false;
      this.closeModal();
    } catch (e) {
      console.log(e);
      this.in_error = true;
      this.file = undefined;
    }
  }

  closeModal() {
    // @ts-ignore
    $(this.el.querySelector('.modal')).modal('hide');
  }

  generateFileInput() {
    return (
      <div>
        Load interaction data from a tab-separated value file (TSV).

        <div class="custom-file" style={{'margin-top': '10px'}}>
          <input type="file" class="custom-file-input" id="fileInputReset" onChange={e => this.handleFileChange(e)}></input>
          <label class="custom-file-label" htmlFor="fileInputReset">Choose file</label>
        </div>
        {this.file && !this.has_accepted ? (
        <div style={{'margin-top': '30px'}}>
          <p>
            Do you want to load {this.file.name} ?
          </p>
          <p>
            All your trimming parameters will be lost.
          </p>
          <button class="btn btn-primary btn-block" style={{'margin-top': '20px'}} onClick={() => this.loadTheFile()}>Load</button>
        </div>
        ) : ""}
      </div>
    );
  }

  /**
   * Refresh the file property with the input[type=file] data.
   */
  handleFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    this.in_error = false;

    if (input.files.length) {
      this.file = input.files[0];
    }
  }

  /**
   * Rendu graphique.
   */
  render() {
    return (
      <div>
        <div class="load-interact-container" title="Load custom interactions" data-toggle="modal" data-target="#modalInteract">
          <i class="material-icons">insert_drive_file</i>
        </div>

        <div class="modal fade" id="modalInteract" tabindex="-1" role="dialog" aria-labelledby="modalInteractA" aria-hidden="true">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="modalInteractA">Load interaction data</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">              
                {this.in_error ? <p class="text-danger font-weight-bold">Unable to load the file.</p> : ""}

                {this.file && this.has_accepted ? this.generateLoader() : this.generateFileInput()}
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
