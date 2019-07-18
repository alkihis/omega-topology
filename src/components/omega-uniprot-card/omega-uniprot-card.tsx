import { Component, h, Prop, Listen, Element, Method, State, Watch, Event, EventEmitter } from '@stencil/core';
import { UniprotProtein } from 'omega-topology-fullstack/build/UniprotContainer';
import { JSXBase } from '@mmsb/selectionnable-tree/dist/types/stencil.core';

@Component({
  tag: "omega-uniprot-card",
  styleUrl: 'omega-uniprot-card.css',
  shadow: false
})
export class OmegaUniprotCard {
  @Element() el: HTMLElement;

  @State()
  protected in_preload = false;

  @State()
  protected history_shown = false;

  @Prop() error_mode = false;

  @State()
  protected history: UniprotProtein[] = [];

  @Event({
    eventName: 'omega-uniprot-card.hover-on'
  }) hoverOn: EventEmitter<string>;
  
  @Event({
    eventName: 'omega-uniprot-card.hover-off'
  }) hoverOff: EventEmitter<void>;

  protected in_load = undefined;
  protected last_loaded: Promise<UniprotProtein>;

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

  @Prop() data: UniprotProtein;

  @Method()
  async preload() {
    this.in_preload = true;
    this.show();
  }

  @Listen('omega-graph.load-protein', { target: 'window' })
  async loadProteinData(e: CustomEvent<Promise<UniprotProtein>> | Promise<UniprotProtein>) {
    if (e instanceof CustomEvent) {
      e = e.detail;
    }

    window.removeEventListener('click', this.close_fn);

    // Disable history
    this.closeHistory();
    this.history_shown = false;
    this.hoverOff.emit();

    this.data = undefined;
    this.in_preload = true;
    this.error_mode = false;
    this.last_loaded = e;
    this.show();

    let data: UniprotProtein;
    try {
      data = await e;
      this.addInHistory(data);

      if (this.last_loaded === e) {
        this.data = data;
      }
    } catch (c) {
      this.error_mode = true;
      this.in_preload = false;
    }
  }

  @Watch('data')
  setData(d: UniprotProtein) {
    if (d) {
      this.in_preload = false;
    }
  }

  @Listen('omega-graph.rebuild', { target: 'window' })
  resetHistory() {
    if (this.history.length !== 0)
      this.closeHistory(true);
  }

  @Method()
  async show() {
    this.el.querySelector('[omega-uniprot-card-base]').classList.remove('hidden');

    setTimeout(() => {
      window.addEventListener('click', this.close_fn);
    }, 100);
  }

  @Method()
  async hide() {
    this.el.querySelector('[omega-uniprot-card-base]').classList.add('hidden');
    window.removeEventListener('click', this.close_fn);
    this.closeHistory();
  }

  protected closeHistory(reset = false) {
    if (reset)
      this.history = [];

    this.history_shown = false;
    this.el.querySelector('.card-history').classList.remove('open');
    this.hoverOff.emit();
  }

  protected addInHistory(p: UniprotProtein) {
    this.history = [...this.history.filter(e => e.accession !== p.accession), p];

    if (this.history.length >= 5) {
      this.history = this.history.slice(this.history.length - 5, this.history.length);
    }
  }

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

  protected copyContent(element: HTMLTextAreaElement) {
    element.select();
    document.execCommand("copy");
  }

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

  protected toggleHistory() {
    this.history_shown = !this.history_shown;
    this.hoverOff.emit();
  }

  protected historyList() {
    const elements: JSXBase.LiHTMLAttributes<HTMLLIElement>[] = [];

    for (const prot of this.history) {
      elements.push(<li class={"list-group-item pointer-no-select" + (prot === this.data ? " font-weight-bold" : "")}
        onMouseOver={e => this.hoverOn.emit((e.currentTarget as HTMLElement).innerText)} 
        onMouseOut={() => this.hoverOff.emit()} 
        onClick={() => this.loadProteinData(Promise.resolve(prot))}
      >{prot.accession}</li>);
    }

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
