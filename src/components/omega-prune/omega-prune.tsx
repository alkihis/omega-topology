import { Component, h, Prop, Listen, Element, Method, State, Event, EventEmitter } from '@stencil/core';
import FrontTopology from '../../utils/FrontTopology';
import { PruneProperties, PruneAddProperty, PruneDeleteProperty } from '../../utils/types';

// import * as jstree from '../../..//node_modules/jstree/dist/jstree';
// import $ from 'jquery';

@Component({
  tag: "omega-prune",
  styleUrl: 'omega-prune.css',
  shadow: false
})
export class OmegaTrim {
  @Element() el: HTMLElement;

  public static readonly tag = "omega-prune";

  @Event({
    eventName: "prune-select-nodes"
  }) selectEvent: EventEmitter<void>;

  @Event({
    eventName: "prune-end-select-nodes"
  }) endSelectEvent: EventEmitter<void>;

  @State() selected: string[] = [];

  @State() in_selection = false;

  emitPrune() {
    console.log("prune")
    FrontTopology.prune(this.selected);
  }

  toggleVision() {
    this.el.classList.toggle('hide-elements');
  }

  @Listen('prune-add-node', { target: 'window' })
  protected addNode(e: CustomEvent<PruneAddProperty>) {
    console.log(e);
    this.selected = [...new Set([...this.selected, e.detail])];
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

  /**
   * Rendu graphique.
   */
  render() {
    return (
      <div>
        <a class="clickable" onClick={() => this.toggleVision()}>
          <span class="on-hidden">Show</span><span class="hiddable">Hide</span>
        </a>
        <div class="hiddable">
          <div selected-elements>
            {(this.selected.length ? "Selected nodes: " + this.selected.join(', ')
            : "You don't have selected any node.")}
          </div>
          <div select-element>
            <button onClick={this.in_selection ? () => this.endSelection() : () => this.beginSelection()}>{this.in_selection ? "Finish selection" : "Select nodes"}</button>
            <button onClick={() => this.emitPrune()}>{this.selected.length ? "Prune" : "Reset graph"}</button>
          </div>
        </div>
      </div>
    );
  }
} 
