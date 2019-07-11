import { Component, h, Prop, Listen, Element, Method, State, Watch, Event, EventEmitter } from '@stencil/core';
import { D3Link, D3Node } from '../../utils/types';
import md5 from 'md5';
import FrontTopology from '../../utils/FrontTopology';
import { JSXBase } from '@stencil/core/internal';
import zip from 'python-zip';
import { HoParameter } from 'omega-topology-fullstack';
import { MitabParameter } from 'omega-topology-fullstack/build/HoParameter';
import xolor from 'xolor';
import { BASE_FIXES } from '../../utils/utils';

@Component({
  tag: "omega-mitab-card",
  styleUrl: 'omega-mitab-card.css',
  shadow: false
})
export class OmegaMitabCard {
  @Element() el: HTMLElement;

  @State()
  protected in_preload = false;

  @State()
  protected history_shown = false;

  @State()
  protected history: D3Link[] = [];

  @Event({
    eventName: 'omega-mitab-card.hover-on'
  }) hoverOn: EventEmitter<D3Link>;
  
  @Event({
    eventName: 'omega-mitab-card.hover-off'
  }) hoverOff: EventEmitter<void>;

  protected readonly close_fn = (e: Event) => {
    let element = e.target as HTMLElement;

    while (element.tagName !== "HTML") {
      if (element.hasAttribute('omega-mitab-card-base')) {
        // On est dans la card
        return;
      }

      element = element.parentElement;
    }

    // Close
    this.hide();
  };

  @Prop() data: D3Link;

  @Method()
  async preload() {
    this.in_preload = true;
    this.show();
  }

  @Listen('omega-graph.rebuild', { target: 'window' })
  resetHistory() {
    if (this.history.length !== 0)
      this.closeHistory(true);
  }

  protected closeHistory(reset = false) {
    if (reset)
      this.history = [];

    this.history_shown = false;
    this.el.querySelector('.collapse').classList.remove('show', 'collapsing');
    this.hoverOff.emit();
  }

  @Listen('omega-graph.load-link', { target: 'window' })
  async loadLinkData(e: CustomEvent<D3Link> | D3Link) {
    if (e instanceof CustomEvent) {
      e = e.detail;
    }

    window.removeEventListener('click', this.close_fn);

    // Disable history
    this.closeHistory();

    this.data = undefined;
    this.in_preload = true;
    this.show();

    this.data = e;

    this.addInHistory(e);
  }

  @Watch('data')
  setData(d: D3Link) {
    if (d) {
      this.in_preload = false;
    }
  }

  @Method()
  async show() {
    this.el.querySelector('[omega-mitab-card-base]').classList.remove('hidden');

    setTimeout(() => {
      window.addEventListener('click', this.close_fn);
    }, 100);
  }

  @Method()
  async hide() {
    this.el.querySelector('[omega-mitab-card-base]').classList.add('hidden');
    window.removeEventListener('click', this.close_fn);
  }

  protected addInHistory(p: D3Link) {
    this.history = [...this.history.filter(e => e !== p), p];

    if (this.history.length >= 5) {
      this.history = this.history.slice(this.history.length - 5, this.history.length);
    }
  }

  protected generateHTML() {
    // Construction des données !
    const node1 = this.data.source;
    const node2 = this.data.target;

    let lowQuery: D3Node, highQuery: D3Node;

    if (md5(node1.id) < md5(node2.id)) {
      lowQuery = node1, highQuery = node2;
    }
    else {
      lowQuery = node2, highQuery = node1;
    }

    console.log(lowQuery, highQuery, this.data.misc);

    // tr generation
    const trs: JSXBase.HTMLAttributes<HTMLTableRowElement>[] = [];

    const gradient_red = xolor('red');

    // for each mitab line:
    // [idLow, organism] ; [idHigh, organism] ; [interDetMethod]
    for (
      const [lowQ, highQ, couples] of 
      // @ts-ignore
      zip(this.data.misc.lowQueryParam, this.data.misc.highQueryParam, this.data.misc.mitabCouples) as IterableIterator<[HoParameter, HoParameter, MitabParameter[]]>
    ) {
      // Recherche de la meilleure similarité pour low
      // Conversion de base pour la similarité
      const color_sim_low =  ((lowQ.simPct - Number(BASE_FIXES.similarity)) / (100 - Number(BASE_FIXES.similarity)));
      const color: string = gradient_red.gradient('green', color_sim_low);

      const color_sim_high =  ((highQ.simPct - Number(BASE_FIXES.similarity)) / (100 - Number(BASE_FIXES.similarity)));
      const color2: string = gradient_red.gradient('green', color_sim_high);
      

      for (const line of couples) {
        const first_is_first = line.data.ids[0] === lowQuery.id; console.log(line.data.ids[0], lowQuery.id);

        const species = line.data.full_species;
        const [specie_1, specie_2] = first_is_first ? species : species.reverse();

        const tax_ids = line.data.taxid;
        const [taxid_1, taxid_2] = first_is_first ? tax_ids : tax_ids.reverse();

        const ids_of_interactors = line.data.ids;
        const [id_i_1, id_i_2] = first_is_first ? ids_of_interactors : ids_of_interactors.reverse();

        const interaction_method = line.data.interactionDetectionMethod;

        trs.push(
          <tr>
            <td style={{'background-color': color}}>
              {id_i_1} ({specie_1} / taxid:{taxid_1})
            </td>
            <td style={{'background-color': color2}}>
              {id_i_2} ({specie_2} / taxid:{taxid_2})
            </td>
            <td>
              {interaction_method}
            </td>
          </tr>
        );
      }
    }
    
    return (
      <table class="table table-bordered">
        <thead>
          <tr>
            <th scope="col">{lowQuery.id}</th>
            <th scope="col">{highQuery.id}</th>
            <th scope="col">Detection method</th>
          </tr>
        </thead>
        <tbody>
          {trs}
        </tbody>
      </table>
    );
  }

  protected noLoadMessage() {
    return (
      <div>
        <h5 class="text-primary card-title">No link is loaded</h5>
        <p class="card-text">
          Oops. This message should not appear !
        </p>
      </div>
    );
  }

  protected noMitab() {
    return (
      <div>
        <h5 class="text-primary card-title">Interactions informations are not loaded.</h5>
        <p class="card-text">
          Please wait for interactions informations download completion, then click on a link again.
        </p>
      </div>
    );
  }

  protected toggleHistory() {
    // @ts-ignore
    $(this.el.querySelector('.collapse')).collapse('toggle');
    this.history_shown = !this.history_shown;
    this.hoverOff.emit();
  }

  protected historyList() {
    if (this.history.length < 2) {
      return <ul class="list-group custom-list"><li class="list-group-item">History is empty.</li></ul>;
    }

    const elements = [];

    for (let i = 0; i < this.history.length - 1; i++) {
      const prot = this.history[i];
      elements.push(<li class="list-group-item pointer-no-select" 
        onMouseOver={e => this.hoverOn.emit(prot)} 
        onMouseOut={() => this.hoverOff.emit()} 
        onClick={() => this.loadLinkData(prot)}
      >{prot.source.id + " - " + prot.target.id}</li>);
    }

    elements.reverse();

    return <ul class="list-group custom-list">{elements}</ul>
  }

  /**
   * Rendu graphique.
   */
  render() {
    return (
      <div omega-mitab-card-base class="card hidden">
        <h5 class="card-header">
          {this.data ? this.data.source.id + " - " + this.data.target.id : (this.in_preload ? "Loading..." : "Protein data card")}
          <i class={"material-icons float-right pointer-no-select" + (this.history_shown ? " text-primary" : "")} onClick={() => this.toggleHistory()}>history</i>
        </h5>

        <div style={{position: 'relative'}}>
          <div class="collapse" style={{position: 'absolute', width: '100%'}}>
            {this.historyList()}
          </div>
        </div>

        <div class="card-body">
          {
            !FrontTopology.mitab_loaded 
            ? this.noMitab()
            : 
            <div>
              <div class={this.in_preload ? "hide" : ""}>
                {this.data ? this.generateHTML() : this.noLoadMessage()}
              </div>

              <div class={!this.in_preload ? "hide" : ""}>
                <div class="embedded-preloader center-block">
                  <div class="preloader-loader"></div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    );
  }
} 
