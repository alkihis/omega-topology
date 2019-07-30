import { Component, h, Prop, Listen, Element, Method, State, Watch, Event, EventEmitter } from '@stencil/core';
import { D3Link, D3Node } from '../../utils/types';
import md5 from 'md5';
import FrontTopology from '../../utils/FrontTopology';
import { JSXBase } from '@stencil/core/internal';
import * as d3 from 'd3';
import { BASE_FIXES } from '../../utils/utils';
import TaxonomyTermsCache from '../../utils/TaxonomyTermsCache';
import OntologyTermsCache from '../../utils/OntologyTermsCache';

/**
 * Show link information.
 * 
 * Present homologs informations, sorted by similarity,
 * allow to see discarded homology evidences,
 * and see experimental detection method.
 */
@Component({
  tag: "omega-mitab-card",
  styleUrl: 'omega-mitab-card.css',
  shadow: false
})
export class OmegaMitabCard {
  @Element() el: HTMLElement;

  /** True if the card is loading */
  @State()
  protected in_preload = false;

  /** True if history is visible */
  @State()
  protected history_shown = false;

  /** Links presents in history (including actual link) */
  @State()
  protected history: D3Link[] = [];

  /** Sort method applied to show homology evidences */
  @State()
  protected sortMethod: "descLowQ" | "ascLowQ" | "descHighQ" | "ascHighQ" = "descLowQ";
  
  /** True if discarded evidences should be shown */
  @State()
  protected showInvalid = false;

  /** Cache for taxonomy_id => human readable term */
  @State()
  protected taxonomy_cache: { [id: string]: string } = {};

  /** Cache for mi_id => human readable term */
  protected ontology_cache: { [id: string]: string } = {};

  /** True if component should refresh cache at the next componentDidUpdate() */
  @State()
  protected must_update = false;

  /** Fires when link is hovered in the history */
  @Event({
    eventName: 'omega-mitab-card.hover-on'
  }) hoverOn: EventEmitter<D3Link>;
  
  /** Fires when link becomes not hovered in the history */
  @Event({
    eventName: 'omega-mitab-card.hover-off'
  }) hoverOff: EventEmitter<void>;

  /** Check if the modal should be closed. Takes a MouseEvent in argument. If the modal should be closed, close it. */
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

  /** Actual link data. */
  @Prop() data: D3Link;

  /** Makes the card in preload mode. */
  @Method()
  async preload() {
    this.in_preload = true;
    this.show();
  }

  /** Listen for graph rebuild, to clear history. */
  @Listen('omega-graph.rebuild', { target: 'window' })
  resetHistory() {
    if (this.history.length !== 0)
      this.closeHistory(true);
  }

  /** Close the history modal. */
  protected closeHistory(reset = false) {
    if (reset)
      this.history = [];

    this.history_shown = false;
    this.el.querySelector('.card-history').classList.remove('open');
    this.hoverOff.emit();
  }

  /** Listen for link click.
   * Load link data on current instance, automatically show the modal 
   * and register the link into the history.
   */
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
    this.must_update = true;
    this.show();

    this.data = e;

    this.addInHistory(e);
  }

  /**
   * When the data is set, preload mode is cancelled.
   */
  @Watch('data')
  setData(d: D3Link) {
    if (d) {
      this.in_preload = false;
    }
  }

  /** Show the modal. */
  @Method()
  async show() {
    this.el.querySelector('[omega-mitab-card-base]').classList.remove('hidden');

    // Ajoute close_fn en tant qu'event lst. (pas de suite, sinon il va recevoir le click d'ouverture)
    setTimeout(() => {
      window.addEventListener('click', this.close_fn);
    }, 100);
  }

  /** Close the modal. */
  @Method()
  async hide() {
    this.el.querySelector('[omega-mitab-card-base]').classList.add('hidden');
    this.closeHistory();
    window.removeEventListener('click', this.close_fn);
    this.destroyTooltips();
  }

  /** Add a link into the history. */
  protected addInHistory(p: D3Link) {
    this.history = [...this.history.filter(e => e !== p), p];

    if (this.history.length >= 5) {
      this.history = this.history.slice(this.history.length - 5, this.history.length);
    }
  }

  protected initTooltips() {
    setTimeout(() => {
      // @ts-ignore
      $(this.el.querySelectorAll('[data-toggle="tooltip"]')).tooltip();
    }, 100);
  }

  protected destroyTooltips() {
    try {
      // @ts-ignore
      $(this.el.querySelectorAll('[data-toggle="tooltip"]')).tooltip('dispose');
    } catch (e) { }
  }

  /** If the cache needs an update, trigger a cache download. */
  async componentDidUpdate() {
    if (this.must_update && this.data) {
      this.must_update = false;
      const pointer_to_tax = this.taxonomy_cache;

      // Get all the needed taxids
      const ids = new Set<string>();
      const ids_mitab = new Set<string>();

      for (const couples of this.data.misc.mitabCouples) {
        for (const line of couples) {
          ids_mitab.add(line.data.interactionDetectionMethod);
          
          for (const id of line.data.taxid) {
            ids.add(id);
          }
        }
      }

      try {
        const data = await TaxonomyTermsCache.bulkTerm([...ids]);
        const mitab_data = await OntologyTermsCache.bulkTerm([...ids_mitab]);

        if (this.taxonomy_cache === pointer_to_tax) {
          this.ontology_cache = {...this.ontology_cache, ...mitab_data};
          this.taxonomy_cache = {...this.taxonomy_cache, ...data};
        }
      } catch (e) { }
    }

    this.destroyTooltips();
    this.initTooltips();
  }

  /** Determine which node is the low and which is the high. */
  protected getLowHighQuery() : [D3Node, D3Node] {
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
    
    return [lowQuery, highQuery];
  }

  /** Generate body HTML */
  protected generateHTML() {
    // Construction des données !
    const omega_trim_element = document.querySelector('omega-trim');
    const current_max_similarity = omega_trim_element ? omega_trim_element.similarity : BASE_FIXES.similarity;

    // Détermination low/high
    const [lowQuery, highQuery] = this.getLowHighQuery();

    // tr generation
    type TR_Array_Element = [JSXBase.HTMLAttributes<HTMLTableRowElement>, [number, number]];
    const trs: TR_Array_Element[] = [];
    const invalid_trs: TR_Array_Element[] = [];

    // Génération du gradient de couleur
    // @ts-ignore
    const gradient = d3.scaleLinear().domain([Number(current_max_similarity), 100]).range(["red", "green"]);

    const gradient_text = `linear-gradient(to right, ${gradient(0).replace(')', ",0.5)")}, ${gradient(100).replace(')', ",0.5)")})`;
    const gradient_block = <div class="float-right" style={{position: 'relative', width: '95%'}}>
      <div style={{background: gradient_text, width: '100%', height: '4px', 'border-radius': '2px', position: 'absolute'}}></div>
      <div class="font-weight-bold" style={{position: 'absolute', top: '3px'}}>{current_max_similarity}%</div>
      <div class="font-weight-bold" style={{position: 'absolute', right: '0', top: '3px'}}>100%</div>
      <div class="text-center font-italic" style={{'margin-top': '3px'}}>Similarity</div>
    </div>;

    // Pour chaque couple d'homologues 
    for (const [lowQ, highQ, couples] of this.data.misc.full_iterator()) {
      // Détermine la couleur de fond de low et high
      const color: string = gradient(Number(lowQ.simPct));
      const color2: string = gradient(Number(highQ.simPct));

      if (!couples.length) {
        continue;
      }

      // Si ils ne sont pas valides (et non demandés) on ignore
      if ((!lowQ.valid || !highQ.valid) && !this.showInvalid) {
        // Si c'est invalide et qu'on ne les veut pas
        continue;
      }

      // On prend la première ligne MI Tab du couple, les informations
      // que l'on souhaite récupérer sont les mêmes sur tts les lignes
      const line = couples[0];

      if (line === undefined) {
        continue;
      }

      // On détermine si l'id1 mitab correspond à low ou non
      const first_is_first = line.ids[0] === lowQ.template;

      // Récupération taxid, interactants et méthode de détection expérimentale
      const tax_ids = line.taxid;
      const [taxid_1, taxid_2] = first_is_first ? tax_ids : tax_ids.reverse();

      const ids_of_interactors = line.ids;
      const [id_i_1, id_i_2] = first_is_first ? ids_of_interactors : ids_of_interactors.reverse();
      
      const detection_methods = new Set(couples.map(line => line.interactionDetectionMethod));

      const tax_1 = (taxid_1 in this.taxonomy_cache ? this.taxonomy_cache[taxid_1] : "taxid:" + taxid_1);
      const tax_2 = (taxid_2 in this.taxonomy_cache ? this.taxonomy_cache[taxid_2] : "taxid:" + taxid_2);

      // On pousse dans trs pour les valides, invalid_trs pour les discarded
      // On pousse de l'HTML qui sera inséré
      (!lowQ.valid || !highQ.valid ? invalid_trs : trs).push(
        [
          <tr class={!lowQ.valid || !highQ.valid ? "table-secondary disabled" : ""} data-lowQSim={lowQ.simPct} data-highQSim={highQ.simPct}>
            <td style={{'background-color': color.replace(')', ",0.5)")}}>
              <span><a class="link-no-color underline" href={'https://www.uniprot.org/uniprot/' + id_i_1} target="_blank">{id_i_1}</a> </span>
              <p data-toggle="tooltip" data-placement="top" title={tax_1} class="no-margin">
                ({tax_1.length > 12 ? tax_1.slice(0, 12) + "..." : tax_1})
              </p>

              <div class="float-right tiny-text">{lowQ.simPct.toFixed(2)}% similarity</div>
            </td>
            <td style={{'background-color': color2.replace(')', ",0.5)")}}>
              <span><a class="link-no-color underline" href={'https://www.uniprot.org/uniprot/' + id_i_2} target="_blank">{id_i_2}</a> </span>
              <p data-toggle="tooltip" data-placement="top" title={tax_2} class="no-margin">
                ({tax_2.length > 12 ? tax_2.slice(0, 12) + "..." : tax_2})
              </p> 

              <div class="float-right tiny-text">{highQ.simPct.toFixed(2)}% similarity</div>
            </td>
            <td>
              { [...detection_methods]
                  .map(interaction_method => interaction_method in this.ontology_cache ? this.ontology_cache[interaction_method] : interaction_method)
                  .join(', ')
              }
            </td>
          </tr>, 
          [ lowQ.simPct, highQ.simPct ]
        ]
      );
    }

    // On trie en fonction du type de tri souhaité: Fonction
    const sort_function = (trA: TR_Array_Element, trB: TR_Array_Element) => {
      if (this.sortMethod.includes("LowQ")) {
        const lowqA = trA[1][0];
        const lowqB = trB[1][0];

        if (this.sortMethod.includes("desc")) {
          return lowqB - lowqA;
        }
        else {
          return lowqA - lowqB;
        }
      }
      else {
        const highqA = trA[1][1];
        const highqB = trB[1][1];
        
        if (this.sortMethod.includes("desc")) {
          return highqB - highqA;
        }
        else {
          return highqA - highqB; 
        }
      }
    };

    // Sorting tr according to sort mode
    const sorted_trs = trs.sort(sort_function);
    const sorted_invalid_trs = invalid_trs.sort(sort_function);
    
    // Retourne l'HTML final avec le contenu des tableaux insérés
    return (
      <div>
        <div class="container" style={{'margin-bottom': '20px'}}>
          <div class="row">
            <div class="col">
              <div class="form-check float-left">
                <input class="form-check-input" type="checkbox" id="evidencescheckbox" onChange={e => this.registerCheckboxInvalid(e)} checked={this.showInvalid}></input>
                <label class="form-check-label" htmlFor="evidencescheckbox">
                  Show discarded evidences
                </label>
              </div>
            </div>
            <div class="col">
              {gradient_block}
            </div>
          </div>
        </div>

        <table class="table table-bordered">
          <thead>
            <tr>
              <th scope="col" class="text-center" colSpan={2}>Homologs of</th>
              <th scope="col"></th>
            </tr>
            <tr>
              <th scope="col" onClick={() => this.makeSort(true)}>
                <a href={'https://www.uniprot.org/uniprot/' + lowQuery.id} target="_blank">{lowQuery.id}</a>
                <i class={ "text-" + (this.sortMethod.includes('Low') ? "primary" : "secondary") + " material-icons pointer-no-select float-right" }>swap_vert</i>
              </th>
              <th scope="col" onClick={() => this.makeSort(false)}>
                <a href={'https://www.uniprot.org/uniprot/' + highQuery.id} target="_blank">{highQuery.id}</a>
                <i class={ "text-" + (this.sortMethod.includes('High') ? "primary" : "secondary") + " material-icons pointer-no-select float-right" }>swap_vert</i>
              </th>
              <th scope="col">Detection method</th>
            </tr>
          </thead>
          <tbody>
            {sorted_trs.map(e => e[0])}
            {sorted_invalid_trs.map(e => e[0])}
          </tbody>
        </table>
      </div>
    );
  }

  /** Register "show discarded evidences" checkbox status */
  protected registerCheckboxInvalid(e: Event) {
    this.showInvalid = (e.currentTarget as HTMLInputElement).checked;
  }

  /** Register sort method */
  protected makeSort(is_low_q: boolean) {
    if (is_low_q) {
      this.sortMethod = this.sortMethod.includes('desc') ? "ascLowQ" : "descLowQ";
    }
    else {
      this.sortMethod = this.sortMethod.includes('desc') ? "ascHighQ" : "descHighQ";
    }
  }

  /** HTML message for no link loaded */
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

  /** HTML message for MI Tab informations not availables */
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

  /** Show or hide history. */
  protected toggleHistory() {
    this.history_shown = !this.history_shown;
    this.hoverOff.emit();
  }

  /** Generate HTML for history */
  protected historyList() {
    const elements = [];

    // Each history element is a <li> element
    for (const prot of this.history) {
      elements.push(<li class={"list-group-item pointer-no-select" + (prot === this.data ? " font-weight-bold" : "")}
        onMouseOver={() => this.hoverOn.emit(prot)} 
        onMouseOut={() => this.hoverOff.emit()} 
        onClick={() => this.loadLinkData(prot)}
      >{prot.source.id + " - " + prot.target.id}</li>);
    }

    // Last pushed should be the first in the list
    elements.reverse();

    return (
      <ul class="list-group custom-list">
        <li class="list-group-item font-weight-bold history-title">History</li>
        {elements}
      </ul>
    );
  }

  /**
   * Rendu graphique.
   */
  render() {
    return (
      <div omega-mitab-card-base class="card hidden">
        <h5 class="card-header">
          {this.data ? `Interaction of ${this.data.source.id}-${this.data.target.id}: Homology support` : (this.in_preload ? "Loading..." : "Protein data card")}
          <i class={"material-icons float-right pointer-no-select" + (this.history_shown ? " text-primary" : "")} onClick={() => this.toggleHistory()}>history</i>
        </h5>

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

        <div class="card-history-container">
          <div class={"card-history" + (this.history_shown ? " open" : "")}>
            {this.historyList()}
          </div>
        </div>
      </div>
    );
  }
} 
