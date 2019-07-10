import { Component, h, Listen, Element, Method, State, Event, EventEmitter, Watch } from '@stencil/core';
import { TreeAsAPI, SubNode, TreeLike } from '@mmsb/selectionnable-tree';
import { ONTOLOGY_URL } from '../../utils/utils';

@Component({
  tag: "omega-onto",
  styleUrl: 'omega-onto.css',
  shadow: false
})
export class OmegaTaxo {
  @Element() el: HTMLElement;

  public static readonly tag = "omega-onto";

  @State()
  protected _has_data = false;

  @State()
  protected selected: [string, string][] = [];

  @Event({
    eventName: 'omega-onto.trim'
  }) trimByOntology: EventEmitter<string[]>;

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
  }

  @Method()
  async getData() : Promise<TreeLike[]> {
    return this.tree.data;
  }

  @Method()
  async unsetData() {
    this._has_data = false;

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

  @Listen('omega-graph.rebuild_onto', {
    target: 'window'
  })
  async rebuildTree(e: CustomEvent<string[]>) {
    // Obtention du TreeAsAPI
    const data = await this.getOntology(e.detail);

    // console.log(data.tree);
    this.setData(data.tree);
  }

  protected async getOntology(list: string[]) : Promise<{ tree: TreeAsAPI }> {
    return fetch(ONTOLOGY_URL + '/tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mi_ids: list })
    }).then(r => r.ok ? r.json() : r.json().then(j => Promise.reject(j)));
  }

  protected async trimTaxons(empty_force = false) {
    this.trimByOntology.emit(empty_force ? [] : await this.tree.getSelected(e => e.original.misc.id));
  }

  /**
   * Rendu graphique.
   */
  render() {
    return (
      <div>
        <div class={this._has_data ? "hide" : ""}>
          Interaction data are not loaded yet.
        </div>

        <selectionnable-tree name="ontology" select_all_on_change={true} class={this._has_data ? "" : "hide"}></selectionnable-tree>

        <div class="options">
          <div class={this._has_data ? "" : "hide"}>{(this.selected.length ? this.selected.length : "Any") + " method" + (this.selected.length > 1 ? "s" : "") + " selected"}</div>
          
          <button class="left" style={{'margin-top': '5px'}} onClick={() => this.trimTaxons(true)}>Reset methods</button>
          <button class="right" style={{'margin-top': '5px'}} onClick={() => this.trimTaxons()}>Select those methods</button>
          <div class="clearb"></div>
        </div>
      </div>
    );
  }
} 
