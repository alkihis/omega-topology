import { Component, h, Element, Event, EventEmitter, State, Watch } from '@stencil/core';
import FrontTopology from '../../utils/FrontTopology';
import { BASE_FIXES } from '../../utils/utils';

@Component({
  tag: "omega-import",
  styleUrl: 'omega-import.css',
  shadow: false
})
export class OmegaImport {
  @Element() el: HTMLElement;

  public static readonly tag = "omega-import";

  @State()
  protected file: File;

  @State()
  protected has_accepted = false;

  @State()
  protected in_error = false;

  @Event({
    eventName: "omega-import.import"
  }) import: EventEmitter<void>;

  emit() {
    this.import.emit();
  }

  @Watch('file')
  fileChange() {
    this.has_accepted = false;
  }

  async loadTheFile() {
    this.has_accepted = true;
    
    await new Promise(resolve => setTimeout(resolve, 20));
    
    const progress = this.el.querySelector('.progress-bar') as HTMLElement;
    const message = this.el.querySelector('[loader-message]') as HTMLElement;
    const graph_file = this.file;

    message.innerText = "Reading JSON file";

    // Lit le fichier

    try {
      let graph: any = await new Promise((resolve, reject) => {
        const r = new FileReader;

        r.onerror = reject;
        r.onload = () => {
          resolve(r.result as string);
        }

        r.readAsText(graph_file);
      }) as string;

      graph = JSON.parse(graph);

      progress.style.width = "10%";

      this.emit();

      message.innerText = "Downloading graph skeleton";

      // Laisse du temps aux composants de se dé-initialiser
      // À exporter dans un composant à part (avec affichage de modal !)
      await new Promise(resolve => setTimeout(resolve, 100));

      const trim = document.querySelector('omega-trim');
      const trim_p = graph.misc.trim_parameters;

      trim.identity = String(trim_p.identity ? trim_p.identity : BASE_FIXES.identity);
      trim.similarity = String(trim_p.similarity ? trim_p.similarity : BASE_FIXES.similarity);
      trim.e_value = String(trim_p.e_value ? trim_p.e_value : "1");
      trim.coverage = String(trim_p.coverage ? trim_p.coverage : BASE_FIXES.coverage);

      // Attends à nouveau que tout soit prêt
      await new Promise(resolve => setTimeout(resolve, 100));

      // Télécharge le squelette
      await FrontTopology.init(graph.misc.specie);
      progress.style.width = "25%";

      message.innerText = "Downloading UniProt data";

      // Téléchargement des données GO
      await FrontTopology.full_ready_promise;
      progress.style.width = "45%";
        
      // Données GO téléchargées
      // Démarre le graph
      FrontTopology.showGraph();

      const interval = setInterval(() => {
        const actual_percent = FrontTopology.percentage_mitab / 2;
        progress.style.width = String(isNaN(actual_percent) ? 0 : actual_percent + 45) + '%';
      }, 25);

      message.innerText = "Downloading interaction data";

      // Lance le télécharge du MI Tab 
      // (nécessaire pour pouvoir faire certains types de prune)
      await FrontTopology.downloadMitabLines().catch(() => clearInterval(interval));

      clearInterval(interval);
      
      // Ok ! On lance trim & prune
      if (graph.misc.prune_parameters) {
        graph.misc.trim_parameters.custom_prune = graph.misc.prune_parameters;
      }

      message.innerText = "Applying filters";

      FrontTopology.trim(graph.misc.trim_parameters);

      progress.style.width = "100%";
      
      // Fermeture modal
      await new Promise(resolve => setTimeout(resolve, 100));

      this.file = undefined;
      this.closeModal();
    } catch (e) {
      this.in_error = true;
      this.file = undefined;
    }
  }

  generateLoader() {
    return (
      <div>
        <h5 class="modal-title"></h5>
        <p class="font-weight-bold text-center" style={{'margin-top': '10px'}} loader-message>

        </p>
        <div class="progress">
          <div class="progress-bar" role="progressbar"></div>
        </div>
      </div>
    );
  }

  generateFileInput() {
    return (
      <div>
        Load a saved graph using a JSON exported model.

        <div class="custom-file" style={{'margin-top': '10px'}}>
          <input type="file" class="custom-file-input" id="fileInputReset" accept="application/json" onChange={e => this.handleFileChange(e)}></input>
          <label class="custom-file-label" htmlFor="fileInputReset">Choose file</label>
        </div>
        {this.file && !this.has_accepted ? (
        <div style={{'margin-top': '30px'}}>
          <p>
            Do you want to load {this.file.name} ?
          </p>
          <button class="btn btn-primary btn-block" style={{'margin-top': '20px'}} onClick={() => this.loadTheFile()}>Load</button>
        </div>
        ) : ""}
      </div>
    );
  }

  handleFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    this.in_error = false;

    if (input.files.length) {
      this.file = input.files[0];
    }
  }

  openModal() {
    // @ts-ignore
    $(this.el.querySelector('.modal')).modal({ backdrop: 'static', keyboard: false, show: false });

    // @ts-ignore
    $(this.el.querySelector('.modal')).modal('show');
  }

  closeModal() {
    // @ts-ignore
    $(this.el.querySelector('.modal')).modal('hide');
  }

  /**
   * Rendu graphique.
   */
  render() {
    return (
      <div>
        <div class="import-container" title="Import" onClick={() => this.openModal()}>
          <i class="material-icons">file_upload</i>
        </div>

        <div class="modal fade" tabindex="-1" role="dialog" aria-labelledby="modalUploadAll" aria-hidden="true" data-backdrop="static" data-keyboard={false}>
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="modalUploadAll">Import</h5>
              </div>
              <div class="modal-body">              
                {this.in_error ? <p class="text-danger font-weight-bold">Unable to load the file.</p> : ""}

                {this.file && this.has_accepted ? this.generateLoader() : this.generateFileInput()}
              </div>
              <div class="modal-footer">
                {this.file && this.has_accepted ? "" : <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
} 
