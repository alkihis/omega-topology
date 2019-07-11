import { Component, h, Prop, Listen, Element, Method, State, Watch, Event, EventEmitter } from '@stencil/core';
import { UniprotProtein } from 'omega-topology-fullstack/build/UniprotContainer';

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
    this.el.querySelector('.collapse').classList.remove('show', 'collapsing');
    this.history_shown = false;
    this.hoverOff.emit();

    this.data = undefined;
    this.in_preload = true;
    this.last_loaded = e;
    this.show();

    const data = await e;

    this.addInHistory(data);

    if (this.last_loaded === e) {
      this.data = data;
    }
  }

  @Watch('data')
  setData(d: UniprotProtein) {
    if (d) {
      this.in_preload = false;
    }
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
  }

  protected addInHistory(p: UniprotProtein) {
    this.history = [...this.history.filter(e => e.accession !== p.accession), p];

    if (this.history.length >= 5) {
      this.history = this.history.slice(this.history.length - 5, this.history.length);
    }
  }

  protected generateUniprotHTML() {
    console.log(this.data);

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
        <pre class="pre-scrollable" style={{'overflow-y': 'auto', 'margin-top': '5px'}}>
          <code style={{'white-space': 'pre-wrap'}}>{Array.isArray(this.data.sequence) ? this.data.sequence[4] : this.data.sequence.sequence}</code>
        </pre>
      </div>
    );
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
        onMouseOver={e => this.hoverOn.emit((e.currentTarget as HTMLElement).innerText)} 
        onMouseOut={() => this.hoverOff.emit()} 
        onClick={() => this.loadProteinData(Promise.resolve(prot))}
      >{prot.accession}</li>);
    }

    elements.reverse();

    return <ul class="list-group custom-list">{elements}</ul>
  }

  /**
   * Rendu graphique.
   */
  render() {
    return (
      <div omega-uniprot-card-base class="card hidden">
        <h5 class="card-header">
          {this.data ? this.data.accession : (this.in_preload ? "Loading..." : "Protein data card")}
          <i class={"material-icons float-right pointer-no-select" + (this.history_shown ? " text-primary" : "")} onClick={() => this.toggleHistory()}>history</i>
        </h5>

        <div style={{position: 'relative'}}>
          <div class="collapse" style={{position: 'absolute', width: '100%'}}>
            {this.historyList()}
          </div>
        </div>

        <div class="card-body">
          <div class={this.in_preload ? "hide" : ""}>
            {this.data ? this.generateUniprotHTML() : this.noLoadMessage()}
          </div>

          <div class={!this.in_preload ? "hide" : ""}>
            <div class="embedded-preloader center-block">
              <div class="preloader-loader"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
} 
