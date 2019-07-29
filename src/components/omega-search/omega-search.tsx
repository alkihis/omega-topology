import { Component, h, Element, Event, EventEmitter, State } from '@stencil/core';
import FrontTopology from '../../utils/FrontTopology';
import { TinyProtein } from 'omega-topology-fullstack';

// Composant de base pour la recherche (todo !)
@Component({
  tag: "omega-search",
  styleUrl: 'omega-search.css',
  shadow: false
})
export class OmegaSearch {
  @Element() el: HTMLElement;

  public static readonly tag = "omega-search";

  @Event({
    eventName: "omega-search.search"
  }) search: EventEmitter<string[]>;

  emit(nodes: string[]) {
    this.search.emit(nodes);
  }

  @State()
  protected matched_objects: TinyProtein[] = [];

  protected last_timeout = 0;

  searchInAnnots(e: Event) {
    const t = e.target as HTMLInputElement;

    if (this.last_timeout) {
      clearTimeout(this.last_timeout);
      this.last_timeout = 0;
    }

    if (t.value === "") {
      this.matched_objects = [];
      return;
    }

    this.last_timeout = setTimeout(() => {
      const matching = FrontTopology.topo.findProteinsInGraphByAnnotation(t.value);
  
      this.matched_objects = matching.map(p => FrontTopology.topo.uniprot_container.getTiny(p));
    }, 200) as unknown as number;
  }

  protected generateMatched() {
    if (this.matched_objects.length === 0) {
      return;
    }

    return (
      <ul class="list-group">
        {this.matched_objects.map(
          e => <li class="list-group-item">{e.accession} ({e.protein_names.join(', ')})</li>
        )}
      </ul>
    );
  }

  get search_container() {
    return this.el.querySelector('.search-body-container');
  }

  /**
   * Rendu graphique.
   */
  render() {
    return (
      <div>
        <div class="search-container" title="Search in graph" data-toggle="modal" data-target="#modalSearch">
          <i class="material-icons">search</i>
        </div>

        <div class="modal fade" id="modalSearch" tabindex="-1" role="dialog" aria-labelledby="modalSearchAll" aria-hidden="true">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title" id="modalResetAll">Search</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
                <input class="form-control" type="text" placeholder="Search" aria-label="Search" onInput={e => this.searchInAnnots(e)}/>

                <div class="search-body-container">{this.generateMatched()}</div>
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
