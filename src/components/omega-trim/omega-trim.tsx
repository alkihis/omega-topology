import { Component, h, Prop, Listen, Element, Method, State, Event, EventEmitter } from '@stencil/core';
import { TrimProperties } from '../../utils/types';
import { BASE_COVERAGE, BASE_IDENTITY, BASE_SIMILARITY, BASE_E_VALUE, BASE_FIXES } from '../../utils/utils';

const original_fixed_at = BASE_FIXES;

@Component({
  tag: "omega-trim",
  styleUrl: 'omega-trim.css',
  shadow: false
})
export class OmegaTrim {
  @Element() el: HTMLElement;

  public static readonly tag = "omega-trim";

  @State() identity: string;
  @State() coverage: string;
  @State() similarity: string;
  @State() e_value: string;

  @State() fixed_by_user = false;

  @Prop() fix_at?: {
    identity?: string,
    coverage?: string,
    similarity?: string,
    e_value?: string
  } = original_fixed_at;

  @Event({
    eventName: "trim-property-change"
  }) propChange: EventEmitter<TrimProperties>;

  @Listen('omega-reset.reset', { target: 'window' })
  protected reallow() {
    this.fix_at = original_fixed_at;

    // Reset
    this.componentDidLoad();
    
    requestAnimationFrame(() => {
      this.el.querySelectorAll('input[type="range"]').forEach((e: HTMLInputElement) => e.value = e.min);
      this.fixed_by_user = false;
    });
  }

  @Listen('omega-reheat.reheat', { target: 'window' })
  protected manuallyBlock() {
    this.fix_at = { identity: this.identity, coverage: this.coverage, similarity: this.similarity, e_value: this.e_value };
    this.fixed_by_user = true;
  }


  /**
   * Initialisation du composant.
   */
  async componentDidLoad() {
    this.identity = this.fix_at.identity ? this.fix_at.identity : "0";
    this.coverage = this.fix_at.coverage ? this.fix_at.coverage : "0";
    this.similarity = this.fix_at.similarity ? this.fix_at.similarity : "0";
    this.e_value = this.fix_at.e_value ? this.fix_at.e_value : "1";
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

  protected convertEValue() {
    return 10 ** -Number(this.e_value);
  }

  emitChange() {
    this.propChange.emit({ identity: Number(this.identity), e_value: this.convertEValue(), coverage: Number(this.coverage), similarity: Number(this.similarity) });
  }

  toggleVision() {
    this.el.classList.toggle('hide-elements');
  }

  /**
   * Rendu graphique.
   */
  render() {
    return (
      <div>
        <form onChange={() => this.emitChange()}>
          <div class="form-group">
            <label class="text-center" htmlFor="identityRangeForm">
              Identity: <span class="font-weight-bold">{this.identity}%</span>
            </label>
            <input id="identityRangeForm" class="form-control-range" type="range" value={this.identity} min={this.fix_at && this.fix_at.identity ? this.fix_at.identity : "0"} max="100" step="1" onInput={e => this.handleIdentity(e)}></input>
          </div>

          <hr></hr>
          
          <div class="form-group">
            <label class="text-center" htmlFor="similairtyRangeForm">
              Similarity: <span class="font-weight-bold">{this.similarity}%</span>
            </label>
            <input id="similairtyRangeForm" class="form-control-range" type="range" value={this.similarity} min={this.fix_at && this.fix_at.similarity ? this.fix_at.similarity : "0"} max="100" step="1" onInput={e => this.handleSimilarity(e)}></input>
          </div>

          <hr></hr>

          <div class="form-group">
            <label class="text-center" htmlFor="coverageRangeForm">
              Coverage: <span class="font-weight-bold">{this.coverage}%</span>
            </label>
            <input id="coverageRangeForm" class="form-control-range" type="range" value={this.coverage} min={this.fix_at && this.fix_at.coverage ? this.fix_at.coverage : "0"} max="100" step="1" onInput={e => this.handleCoverage(e)}></input>
          </div>

          <hr></hr>

          <div class="form-group">
            <label class="text-center" htmlFor="evalRangeForm">
              E-value: <span class="font-weight-bold">10^-{this.e_value}</span>
            </label>
            <input id="evalRangeForm" class="form-control-range" type="range" value={this.e_value} min={this.fix_at && this.fix_at.e_value ? this.fix_at.e_value : "1"} max="15" onInput={e => this.handleEvalue(e)}></input>
          </div>
        </form>

        <div class={(this.fixed_by_user ? "" : "hide") + " text-danger font-weight-bold"}>
          <hr></hr>
          <div style={{'max-width': '250px'}} class="text-justify">
            You need to reset the graph 
            to have access to lower values.
          </div>
        </div>
      </div>
    );
  }
} 
