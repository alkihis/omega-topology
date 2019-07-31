import { Component, h, Prop, Listen, Element, Method, State, Watch, Event, EventEmitter } from '@stencil/core';
import { UniprotProtein } from 'omega-topology-fullstack/build/UniprotContainer';
import { JSXBase } from '@stencil/core/internal';

/**
 * Show node information.
 * 
 * Present protein data, fetched from UniProt.
 * 
 * Make use of omega-topology-uniprot µ-service.
 */
@Component({
  tag: "omega-uniprot-card",
  styleUrl: 'omega-uniprot-card.css',
  shadow: false
})
export class OmegaUniprotCard {
  @Element() el: HTMLElement;

  /** True if the card is loading */
  @State()
  protected in_preload = false;

  /** True if history is visible */
  @State()
  protected history_shown = false;

  /** True if an error has been detected. */
  @Prop() error_mode = false;

  /** Nodes presents in history (including actual node) */
  @State()
  protected history: UniprotProtein[] = [];

  /** Fires when node is hovered in the history */
  @Event({
    eventName: 'omega-uniprot-card.hover-on'
  }) hoverOn: EventEmitter<string>;
  
  /** Fires when node is unhovered in the history */
  @Event({
    eventName: 'omega-uniprot-card.hover-off'
  }) hoverOff: EventEmitter<void>;

  /** Save the current node (inside a Promise, could be in load). */
  protected last_loaded: Promise<UniprotProtein>;

  /** Check if the modal should be closed. Takes a MouseEvent in argument. If the modal should be closed, close it. */
  protected readonly close_fn = (e: Event) => {
    let element = e.target as HTMLElement;

    while (element.tagName !== "HTML") {
      if (element.hasAttribute('omega-uniprot-card-base')) {
        // On est dans la card
        return;
      }

      element = element.parentElement;
    }

    // Close
    this.hide();
  };

  /** Save the current node (unwrapped, when loaded). */
  @Prop() data: UniprotProtein;

  /** Makes the card in preload mode. */
  @Method()
  async preload() {
    this.in_preload = true;
    this.show();
  }

  /** Triggers when omega-graph give a protein (in fact, it give a `Promise`), try to load it. */
  @Listen('omega-graph.load-protein', { target: 'window' })
  async loadProteinData(e: CustomEvent<Promise<UniprotProtein>> | Promise<UniprotProtein>) {
    if (e instanceof CustomEvent) {
      e = e.detail;
    }

    // Remove close event listener
    window.removeEventListener('click', this.close_fn);

    // Disable history
    this.closeHistory();
    // Make history hidden
    this.history_shown = false;
    // Emit hoveroff history event, in case of
    this.hoverOff.emit();

    // Empty current data
    this.data = undefined;
    // Show preloader
    this.in_preload = true;
    // Hide possible error 
    this.error_mode = false;
    // Save the promise
    this.last_loaded = e;
    this.show();

    let data: UniprotProtein;
    try {
      // Try to load data (max 20 secondes authorized)
      data = await Promise.race([ e, new Promise((_, reject) => setTimeout(reject, 20000)) ]) as UniprotProtein;
      this.addInHistory(data);

      if (this.last_loaded === e) {
        this.data = data;
      }
    } catch (c) {
      // Otherwise, show error mode
      this.error_mode = true;
      this.in_preload = false;
    }
  }

  /** Disable preload when data is set. */
  @Watch('data')
  setData(d: UniprotProtein) {
    if (d) {
      this.in_preload = false;
    }
  }

  /** Listen for graph rebuild, to clear history. */
  @Listen('omega-graph.rebuild', { target: 'window' })
  resetHistory() {
    if (this.history.length !== 0)
      this.closeHistory(true);
  }

  /** Show the modal. */
  @Method()
  async show() {
    this.el.querySelector('[omega-uniprot-card-base]').classList.remove('hidden');

    setTimeout(() => {
      window.addEventListener('click', this.close_fn);
    }, 100);
  }

  /** Close the modal. */
  @Method()
  async hide() {
    this.el.querySelector('[omega-uniprot-card-base]').classList.add('hidden');
    window.removeEventListener('click', this.close_fn);
    this.closeHistory();
  }

  /** Close the history modal. */
  protected closeHistory(reset = false) {
    if (reset)
      this.history = [];

    this.history_shown = false;
    this.el.querySelector('.card-history').classList.remove('open');
    this.hoverOff.emit();
  }

  /** Add a node into the history. */
  protected addInHistory(p: UniprotProtein) {
    this.history = [...this.history.filter(e => e.accession !== p.accession), p];

    if (this.history.length >= 5) {
      this.history = this.history.slice(this.history.length - 5, this.history.length);
    }
  }

  /** Generate the HTML body of the card */
  protected generateUniprotHTML() {
    const prot = this.data.protein;
    const name = prot.recommendedName ?
      prot.recommendedName.fullName.value :
      (prot.submittedName && prot.submittedName.length 
        ? prot.submittedName[0].fullName.value
        : (prot.alternativeName && prot.alternativeName.length 
          ? prot.alternativeName[0].fullName.value
          : "No name defined in UniProt"
        )
      );

    const fns = this.data.comments ? this.data.comments
      .filter(e => e.type === "FUNCTION")
      .map(e => e.reaction ? e.reaction.name : (e.text ? e.text[0].value : ""))
      .map(e => <p class="card-text">{e}</p>) : [];

    return (
      <div>
        <h5 class="card-title">{name}</h5>

        <h6 class="card-subtitle">Organism</h6>
        <p class="card-text">
          {this.data.organism.names[0].value}
        </p>

        <hr></hr>

        <h6 class="card-subtitle">Genes</h6>
        {this.data.gene.map(e => <p class="card-text">{e.name ? e.name.value : (e.olnNames ? e.olnNames[0].value : "")}</p>)}

        
        {fns.length > 0 ? 
          <div>
            <hr></hr>
            <h6 class="card-subtitle">Functions</h6>
            {fns}
          </div>
        : ""}

        <hr></hr>

        <h6 class="card-subtitle">Sequence</h6>

        <div class="form-group" style={{'overflow-y': 'auto', 'margin-top': '5px', 'position': 'relative'}}>
          <div class="copy-button pointer-no-select" onClick={() => this.copyContent(this.el.querySelector('textarea'))}><i class="material-icons">content_copy</i></div>
          <textarea readOnly={true} class="form-control" rows={3} 
            value={Array.isArray(this.data.sequence) ? this.data.sequence[4] : this.data.sequence.sequence}></textarea>
        </div>
      </div>
    );
  }

  /** Macro for auto copy element text. */
  protected copyContent(element: HTMLTextAreaElement) {
    element.select();
    document.execCommand("copy");
  }

  /** HTML message for no link loaded */
  protected noLoadMessage() {
    return (
      <div>
        <h5 class="text-primary card-title">No protein is loaded</h5>
        <p class="card-text">
          Oops. This message should not appear !
        </p>
      </div>
    );
  }

  /** Error message when await fails. */
  protected errorMessage() {
    return (
      <div>
        <h5 class="text-primary card-title text-danger">Informations couldn't be retrieved</h5>
        <p class="card-text">
          UniProt informations couldn't be downloaded. Try again later.
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
    const elements: JSXBase.LiHTMLAttributes<HTMLLIElement>[] = [];

    for (const prot of this.history) {
      elements.push(<li class={"list-group-item pointer-no-select" + (prot === this.data ? " font-weight-bold" : "")}
        onMouseOver={e => this.hoverOn.emit((e.currentTarget as HTMLElement).innerText)} 
        onMouseOut={() => this.hoverOff.emit()} 
        onClick={() => this.loadProteinData(Promise.resolve(prot))}
      >{prot.accession}</li>);
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
      <div omega-uniprot-card-base class="card hidden">
        <h5 class="card-header">
          {this.data ? <a href={'https://www.uniprot.org/uniprot/' + this.data.accession} target="_blank">{this.data.accession}</a> : (this.in_preload ? "Loading..." : "Error")}
          <i class={"material-icons float-right pointer-no-select" + (this.history_shown ? " text-primary" : "")} onClick={() => this.toggleHistory()}>history</i>
        </h5>

        <div class="card-body">
          <div class={this.in_preload ? "hide" : ""}>
            {this.data ? this.generateUniprotHTML() : (this.error_mode ? this.errorMessage() : this.noLoadMessage())}
          </div>

          <div class={!this.in_preload ? "hide" : ""}>
            <div class="embedded-preloader center-block">
              <div class="preloader-loader"></div>
            </div>
          </div>
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
