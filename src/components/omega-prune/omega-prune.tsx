import { Component, h, Listen, Element, State, Event, EventEmitter } from '@stencil/core';
import FrontTopology from '../../utils/FrontTopology';
import { PruneAddProperty, PruneDeleteProperty } from '../../utils/types';

@Component({
  tag: "omega-prune",
  styleUrl: 'omega-prune.css',
  shadow: false
})
export class OmegaTrim {
  @Element() el: HTMLElement;

  public static readonly tag = "omega-prune";

  @State() uniprot_loaded = false;

  @Listen('FrontTopology.uniprot-downloaded', { target: 'window' })
  loadUniprot() {
    this.uniprot_loaded = true;
  }

  @Event({
    eventName: "prune-select-nodes"
  }) selectEvent: EventEmitter<void>;

  @Event({
    eventName: "prune-end-select-nodes"
  }) endSelectEvent: EventEmitter<void>;

  @State() selected: string[] = [];

  @State() in_selection = false;

  protected distance = Infinity;

  emitPrune() {
    FrontTopology.prune(this.selected, this.distance);
  }

  toggleVision() {
    this.el.classList.toggle('hide-elements');
  }

  @Listen('prune-add-node', { target: 'window' })
  protected addNode(e: CustomEvent<PruneAddProperty>) {
    const to_add = typeof e.detail === 'string' ? [e.detail as string] : [...e.detail as string[]];
    this.selected = [...new Set([...this.selected, ...to_add])];
  }

  @Listen('prune-delete-node', { target: 'window' })
  protected removeNode(e: CustomEvent<PruneDeleteProperty>) {
    const s = new Set(this.selected);
    s.delete(e.detail);
    this.selected = [...s];
  }

  @Listen('prune-reset-nodes', { target: 'window' })
  protected resetNodes() {
    this.selected = [];
    this.endSelection();
  }

  protected beginSelection() {
    this.selectEvent.emit();
    this.in_selection = true;
  }

  protected endSelection() {
    this.endSelectEvent.emit();
    this.in_selection = false;
  }

  protected updateDistance(event: Event) {
    const dist = (event.target as HTMLSelectElement).value;

    if (dist === "Inf") {
      this.distance = Infinity;
    }
    else if (parseInt(dist)) {
      this.distance = parseInt(dist);
    }
  }

  /**
   * Rendu graphique.
   */
  render() {
    return (
      <div class="container">
        <div class="row">
          <div class="col" style={{'padding-left': '0'}}>
            <div class={this.uniprot_loaded ? "" : "hide"}>
              <network-table></network-table>
            </div>
            <div class={this.uniprot_loaded ? "hide" : ""}>
              <div class="embedded-preloader">
                <div class="preloader-loader"></div>
              </div>
              <div class="text-center font-weight-bold">Loading UniProt data...</div>
            </div>
          </div>

          <div class="col" style={{'padding-right': '0'}}>
            <div selected-elements>
              {(this.selected.length ? `You have selected ${this.selected.length} nodes.`
                : "You don't have selected any node.")}
            </div>

            <hr></hr>

            <div select-element>
              <button type="button" class="btn btn-primary btn-block" style={{ 'margin-right': '5px' }} onClick={this.in_selection ? () => this.endSelection() : () => this.beginSelection()}>{this.in_selection ? "Finish selection" : "Select nodes"}</button>
              <button type="button" class={this.selected.length ? "btn btn-warning btn-block" : "btn btn-danger btn-block"} onClick={() => this.emitPrune()}>{this.selected.length ? "Prune" : "Reset graph"}</button>

              <hr></hr>

              <form style={{ 'margin-top': '5px' }}>
                <div class="form-group">
                  <label htmlFor="select_distance">Maximum distance<br></br></label>
                  <select class="form-control" id="select_distance" onChange={e => this.updateDistance(e)}>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="Inf" selected>Infinite</option>
                  </select>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }
} 
