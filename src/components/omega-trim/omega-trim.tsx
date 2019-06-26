import { Component, h, Prop, Listen, Element, Method, State, Event, EventEmitter } from '@stencil/core';
import FrontTopology from '../../utils/FrontTopology';
import { TrimProperties } from '../../utils/types';
import { BASE_COVERAGE, BASE_IDENTITY, BASE_SIMILARITY, BASE_E_VALUE } from '../../utils/utils';

// import * as jstree from '../../..//node_modules/jstree/dist/jstree';
// import $ from 'jquery';

@Component({
  tag: "omega-trim",
  styleUrl: 'omega-trim.css',
  shadow: false
})
export class OmegaTrim {
  @Element() el: HTMLElement;

  public static readonly tag = "omega-trim";

  @State() identity: string = BASE_IDENTITY;
  @State() coverage: string = BASE_COVERAGE;
  @State() similarity: string = BASE_SIMILARITY;
  @State() e_value: string = BASE_E_VALUE;

  @Event({
    eventName: "trim-property-change"
  }) propChange: EventEmitter<TrimProperties>;


  /**
   * Initialisation du composant.
   */
  async componentDidLoad() {
    
  }

  async componentDidUpdate() {
    // this.componentDidLoad();
  }

  handleSubmit(event: Event) {
    event.preventDefault()
    console.log(this.identity);
    // send data to our backend
  }

  handleIdentity(event: Event) {
    this.identity = (event.target as HTMLInputElement).value;
  }

  handleCoverage(event: Event) {
    this.coverage = (event.target as HTMLInputElement).value;
  }

  handleSimilarity(event: Event) {
    this.similarity = (event.target as HTMLInputElement).value;
  }

  handleEvalue(event: Event) {
    this.e_value = (event.target as HTMLInputElement).value;
  }

  emitChange() {
    console.log("changed")
    this.propChange.emit({ identity: Number(this.identity), e_value: Number(this.e_value), coverage: Number(this.coverage), similarity: Number(this.similarity) });
  }

  /**
   * Rendu graphique.
   */
  render() {
    return (
      <form base-form onChange={() => this.emitChange()}>
        <label>
          Identity: {this.identity}%
          <input type="range" value={this.identity} min="0" max="100" step="1" onChange={e => this.handleIdentity(e)}></input>
        </label>

        <label>
          Similarity: {this.similarity}%
          <input type="range" value={this.similarity} min="0" max="100" step="1" onChange={e => this.handleSimilarity(e)}></input>
        </label>

        <label>
          Coverage: {this.coverage}%
          <input type="range" value={this.coverage} min="0" max="100" step="1" onChange={e => this.handleCoverage(e)}></input>
        </label>

        <label>
          E-value: {this.e_value}
          <input type="range" value={this.e_value} min="0.0001" max="1" onChange={e => this.handleEvalue(e)}></input>
        </label>
      </form>
    );
  }
} 
