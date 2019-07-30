import { Component, h, Listen, Element, Method, State, Event, EventEmitter } from '@stencil/core';
import { TreeAsAPI, SubNode, TreeLike } from '@mmsb/selectionnable-tree';
import { ONTOLOGY_URL } from '../../utils/utils';
import FrontTopology from '../../utils/FrontTopology';

/**
 * Ontology tree, representing all the MI IDs presents in the graph.
 * 
 * Use selectionnable-tree inside it, and need micro-service omega-topology-MIontology
 */
@Component({
  tag: "omega-onto",
  styleUrl: 'omega-onto.css',
  shadow: false
})
export class OmegaTaxo {
  @Element() el: HTMLElement;

  /** True if MI Tab data is ready. */
  @State() mitab_loaded = false;
  /** Store the MI Tab download percent internally. */
  @State() mitab_percent = 0;
  /** Store if the MI Tab download has encountered an error. */
  @State() mitab_socket_error = false;

  /** Set `mitab_loaded` to true. */
  @Listen('FrontTopology.mitab-downloaded', { target: 'window' })
  loadMitab() {
    this.mitab_loaded = true;
  }

  /** Refresh the MI Tab percent. */
  @Listen('FrontTopology.mitab-download-update', { target: 'window' })
  updateMitab(e: CustomEvent<number | null>) {
    if (e.detail === null) {
      // socket error !
      this.mitab_socket_error = true;
      this.mitab_loaded = false;
      this.mitab_percent = 0;
    }
    else {
      this.mitab_socket_error = false
      this.mitab_percent = e.detail;
    }
  }

  /** Register if the tree can be loaded. */
  @State()
  protected _has_data = false;

  /** Register if a tree fetch has failed or not. */
  @State()
  protected in_error = false;

  /** Register currently selected elements? */
  @State()
  protected selected: [string, string][] = [];

  /** Register if all elements of the tree are selected. */
  @State()
  protected all_selected = true;

  /** Register the last sended MI IDs required to build the tree. */
  protected last_try: string[];

  /** Fires when a trim by ontology terms is asked. */
  @Event({
    eventName: 'omega-onto.trim'
  }) trimByOntology: EventEmitter<string[]>;

  /** Tree component instance. */
  protected get tree() {
    return this.el.querySelector('selectionnable-tree');
  }

  /** Register new data inside the tree, via a API response (SubNode). */
  @Method()
  async setData(d: SubNode) {
    const e = this.tree;
    
    // Converting data
    const converted = await e.convertAPITreeToValidTree(d);
    e.data = converted;
    this._has_data = true;
    this.in_error = false;
  }

  /** Get the actual loaded data in the tree instance. */
  @Method()
  async getData() : Promise<TreeLike[]> {
    return this.tree.data;
  }

  /** Unset currently loaded data. */
  @Method()
  async unsetData() {
    this._has_data = false;
    this.in_error = false;
  }

  /** Refresh the currently selected elements from a JSTree objects array. */
  protected refreshSelected(data: any[]) {
    this.selected = data.map(e => [e.text, e.original.misc.id]);
  }

  /** Get the number of selected nodes. */
  @Method()
  async selectedNumber(bottom_only = true) {
    return bottom_only ? (await this.tree.getBottomSelected()).length : (await this.tree.getSelected()).length;
  }

  /** Listen for node selection inside the tree component. */
  @Listen('selectionnable-tree.select')
  nodeSelect(e: CustomEvent<{nodes: any[], name: string, all_selected: boolean}>) {
    // actualiser une liste
    this.refreshSelected(e.detail.nodes);
    this.all_selected = e.detail.all_selected;
  }

  /** Listen for node unselection inside the tree component. */
  @Listen('selectionnable-tree.deselect')
  nodeUnSelect(e: CustomEvent) {
    // actualiser une liste
    this.refreshSelected(e.detail.nodes);
    this.all_selected = e.detail.all_selected;
  }

  /** Listen for graph reinitialization (reset the tree). */
  @Listen('omega-graph.complete-reset', { target: 'window' })
  resetTree() {
    this.mitab_loaded = false;
    this.mitab_percent = 0;
    this.mitab_socket_error = false;
    this.tree.data = [];
  }

  /** Listen for ontology rebuild (takes a MI IDs array in parameter). */
  @Listen('omega-graph.rebuild-onto', {
    target: 'window'
  })
  async rebuildTree(e: CustomEvent<string[]>) {
    // Obtention du TreeAsAPI
    this.last_try = e.detail;

    try {
      const data = await this.getOntology(e.detail);
      this.setData(data.tree);
    } catch (e) {
      this.in_error = true;
    }
  }

  /** Retry the tree construction from the API. */
  protected retryLoad() {
    if (this.last_try) {
      this.in_error = false;
      this.rebuildTree(new CustomEvent('refresh', { detail: this.last_try }));
    }
  }

  /** Retry the MI Tab download, in case of error. */
  protected retryMitabLoad() {
    FrontTopology.downloadMitabLines(true);
    this.mitab_loaded = false;
    this.mitab_socket_error = false;
  }

  /** Fetch the tree data from the API, with the wanted MI IDs in `list`. */
  protected async getOntology(list: string[]) : Promise<{ tree: TreeAsAPI }> {
    return fetch(ONTOLOGY_URL + '/tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mi_ids: list })
    }).then(r => r.ok ? r.json() : r.json().then(j => Promise.reject(j)));
  }

  /** Start a trim by ontology with the currently selected nodes. */
  protected async trimTaxons(empty_force = false) {
    if (this.all_selected) {
      empty_force = true;
    }

    this.trimByOntology.emit(empty_force ? [] : await this.tree.getSelected(e => e.original.misc.id));
  }

  /** HTML tree generation error message. */
  protected errorMessage() {
    return (
      <div>
        <div class="row">
          <div class="col text-center"><i class="material-icons text-danger" style={{ 'font-size': '48px' }}>error</i></div>
        </div>
        <div class="row font-weight-bold">
          <div class="col text-center">Unable to load tree.</div>
        </div>
        <div class={"row font-weight-bold text-primary pointer-no-select" + (this.last_try ? "" : " hide")} style={{ 'margin-top': '10px' }}>
          <div class="col text-center" onClick={() => this.retryLoad()}><i class="material-icons float-left">refresh</i>Reload</div>
        </div>
      </div>
    );
  }

  /** HTML MI Tab download error message. */
  protected mitabErrorMessage() {
    return (
      <div>
        <div class="row">
          <div class="col text-center"><i class="material-icons text-danger" style={{ 'font-size': '48px' }}>error</i></div>
        </div>
        <div class="row font-weight-bold">
          <div class="col text-center">Unable to load interactions informations.</div>
        </div>
        <div class={"row font-weight-bold text-primary pointer-no-select" + (this.last_try ? "" : " hide")} style={{ 'margin-top': '10px' }}>
          <div class="col text-center" onClick={() => this.retryMitabLoad()}><i class="material-icons float-left">refresh</i>Reload</div>
        </div>
      </div>
    );
  }

  /**
   * Rendu graphique.
   */
  render() {
    return (
      <div>
        <div class={this.mitab_loaded ? "" : "hide"}>

          <div class={!this.in_error ? "" : "hide"}>
            <div class={this._has_data ? "hide" : ""}>
              Interaction methods tree is waiting for initialisation...
            </div>

            <selectionnable-tree name="ontology" select_all_on_change={true} class={this._has_data ? "" : "hide"}></selectionnable-tree>

            <div class={(this._has_data ? "" : "hide") + " options"}>
              <div class={this._has_data ? "" : "hide"}>{(this.selected.length ? this.selected.length : "Any") + " method" + (this.selected.length > 1 ? "s" : "") + " selected"}</div>
              
              <button class="left btn btn-secondary" style={{'margin-top': '5px', 'margin-right': '5px'}} onClick={() => this.trimTaxons(true)}>Reset methods</button>
              <button class="right btn btn-primary" style={{'margin-top': '5px'}} onClick={() => this.trimTaxons()}>Select those methods</button>
              <div class="clearb"></div>
            </div>
          </div>

          <div class={(this.in_error ? "" : "hide") + " text-center"}>
            {this.errorMessage()}
          </div>
        </div>

        <div class={this.mitab_loaded ? "hide" : ""}>
          <div class={(this.mitab_socket_error ? "" : "hide") + " text-center"}>
            {this.mitabErrorMessage()}
          </div>

          <div class={this.mitab_socket_error ? "hide" : ""}>
            <div class="embedded-preloader">
              <div class="preloader-loader"></div>
            </div>
            <div class="text-center font-weight-bold">Loading MI Tab data ({this.mitab_percent.toFixed(1)}%)...</div>
          </div>
        </div>
      </div>
    );
  }
} 
