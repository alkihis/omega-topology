import { Component, h, Listen, Element, Method, State, Event, EventEmitter } from '@stencil/core';
import { TreeAsAPI, TreeLike, SubNode } from '@mmsb/selectionnable-tree';
import { TAXONOMY_URL } from '../../utils/utils';

@Component({
  tag: "omega-taxo",
  styleUrl: 'omega-taxo.css',
  shadow: false
})
export class OmegaTaxo {
  @Element() el: HTMLElement;

  public static readonly tag = "omega-taxo";

  @State() mitab_loaded = false;
  @State() mitab_percent = 0;

  @Listen('FrontTopology.mitab-downloaded', { target: 'window' })
  loadMitab() {
    this.mitab_loaded = true;
  }

  @Listen('FrontTopology.mitab-download-update', { target: 'window' })
  updateMitab(e: CustomEvent<number>) {
    this.mitab_percent = e.detail;
  }

  protected last_try: string[];

  @State()
  protected _has_data = false;

  @State()
  protected in_error = false;

  @State()
  protected selected: [string, string][] = [];

  @Event({
    eventName: 'omega-taxo.trim'
  }) trimByTaxonomy: EventEmitter<string[]>;

  protected get tree() {
    return this.el.querySelector('selectionnable-tree');
  }

  @Method()
  async setData(d: SubNode) {
    const e = this.tree;

    // Converting data
    const converted = await e.convertAPITreeToValidTree(d);
    e.data = converted;
    this._has_data = true;
    this.in_error = false;
  }

  @Method()
  async getData(): Promise<TreeLike[]> {
    return this.tree.data;
  }

  @Method()
  async unsetData() {
    this._has_data = false;
    this.in_error = false;

  }

  protected refreshSelected(data: any[]) {
    this.selected = data.map(e => [e.text, e.original.misc.id]);
  }

  @Listen('selectionnable-tree.select')
  nodeSelect(e: CustomEvent) {
    // actualiser une liste
    this.refreshSelected(e.detail);
  }

  @Listen('selectionnable-tree.deselect')
  nodeUnSelect(e: CustomEvent) {
    // actualiser une liste
    this.refreshSelected(e.detail);
  }

  @Listen('omega-graph.rebuild_taxo', {
    target: 'window'
  })
  async rebuildTree(e: CustomEvent<string[]>) {
    // Obtention du TreeAsAPI
    this.last_try = e.detail;

    try {
      const data = await this.getTaxonomy(e.detail);
      this.setData(data.tree);
    } catch (e) {
      this.in_error = true;
    }
  }

  protected retryLoad() {
    if (this.last_try) {
      this.in_error = false;
      this.rebuildTree(new CustomEvent('refresh', { detail: this.last_try }));
    }
  }

  protected async getTaxonomy(list: string[]): Promise<{ tree: TreeAsAPI }> {
    return fetch(TAXONOMY_URL + '/tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taxids: list })
    }).then(r => r.ok ? r.json() : r.json().then(j => Promise.reject(j)));
  }

  protected async trimTaxons(empty_force = false) {
    this.trimByTaxonomy.emit(empty_force ? [] : await this.tree.getSelected(e => e.original.misc.id));
  }

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

  /**
   * Rendu graphique.
   */
  render() {
    return (
      <div>
        <div class={this.mitab_loaded ? "" : "hide"}>
          <div class={!this.in_error ? "" : "hide"}>
            <div class={this._has_data ? "hide" : ""}>
              Taxonomy tree is waiting for initialisation...
            </div>
            
            <selectionnable-tree name="taxonomy" select_all_on_change={true} class={this._has_data ? "" : "hide"}></selectionnable-tree>

            <div class={(this._has_data ? "" : "hide") + " options"}>
              <div class={this._has_data ? "" : "hide"}>{(this.selected.length ? this.selected.length : "Any") + " taxon" + (this.selected.length > 1 ? "s" : "") + " selected"}</div>

              <button class="left btn btn-secondary" style={{ 'margin-top': '5px', 'margin-right': '5px' }} onClick={() => this.trimTaxons(true)}>Reset taxons</button>
              <button class="right btn btn-primary" style={{ 'margin-top': '5px' }} onClick={() => this.trimTaxons()}>Select those taxons</button>
              <div class="clearb"></div>
            </div>
          </div>

          <div class={(this.in_error ? "" : "hide") + " text-center"}>
            {this.errorMessage()}
          </div>
        </div>

        <div class={this.mitab_loaded ? "hide" : ""}>
          <div class="embedded-preloader">
            <div class="preloader-loader"></div>
          </div>
          <div class="text-center font-weight-bold">Loading MI Tab data ({this.mitab_percent.toFixed(1)}%)...</div>
        </div>
      </div>
    );
  }
} 
