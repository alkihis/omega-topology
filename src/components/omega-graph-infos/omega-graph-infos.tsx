import { Component, h, Element, State, Host, Listen } from '@stencil/core';
import FrontTopology, { TrimOptions } from '../../utils/FrontTopology';

/**
 * Show a short résumé of current graph nodes number and links number and the current trimming parameters.
 */
@Component({
  tag: "omega-graph-infos",
  styleUrl: 'omega-graph-infos.css',
  shadow: false
})
export class OmegaInfos {
  @Element() el: HTMLElement;

  /** Store current informations to show to the user */
  @State()
  protected graph_informations: { nodeNumber: number, linkNumber: number, trimSettings: TrimOptions } = {
    nodeNumber: NaN,
    linkNumber: NaN,
    trimSettings: {}
  };

  /**
   * Listen for graph data update, and register proper informations in `graph_informations`.
   */
  @Listen('omega-graph.data-update', { target: 'window' })
  async buildInfos(e: CustomEvent<{nodeNumber: number, linkNumber: number}>) {
    const trimSettings = Object.assign({}, FrontTopology.current_trim_parameters, { custom_prune: FrontTopology.current_prune_parameters });

    if (trimSettings.taxons && trimSettings.taxons.length) {
      // Récupération du vrai nombre de taxons
      const el = document.querySelector('omega-taxo');

      if (el) {
        const bottom = await el.selectedNumber();

        if (bottom) {
          trimSettings.taxons = Array(bottom).fill(null);
        }
      }
    }

    if (trimSettings.experimental_detection_method && trimSettings.experimental_detection_method.length) {
      // Récupération du vrai nombre de cases cochées en ontologie
      const el = document.querySelector('omega-onto');

      if (el) {
        const bottom = await el.selectedNumber();

        if (bottom) {
          trimSettings.experimental_detection_method = Array(bottom).fill(null);
        }
      }
    }

    this.graph_informations = {
      nodeNumber: e.detail.nodeNumber,
      linkNumber: e.detail.linkNumber,
      trimSettings
    };
  }

  /**
   * Generate information text, in HTML.
   */
  generateInfoCard() {
    const trim_s = this.graph_informations.trimSettings;

    const taxons = trim_s.taxons && trim_s.taxons.length ? String(trim_s.taxons.length) : undefined;
    const experimental_detection_method = trim_s.experimental_detection_method && trim_s.experimental_detection_method.length ? String(trim_s.experimental_detection_method.length) : undefined;
    const id = this.graph_informations.trimSettings.identity ? this.graph_informations.trimSettings.identity : undefined;
    const sim = this.graph_informations.trimSettings.similarity ? this.graph_informations.trimSettings.similarity : undefined;

    const texts = [
      id ? `Identity ${id}%` : "",
      sim ? `Similarity ${sim}%` : ""
    ].filter(e => e).join(', ').toLocaleLowerCase();

    const elements = [
      taxons ? taxons + " taxons selected." : "",
      experimental_detection_method ? experimental_detection_method + " detection methods selected." : "",
      trim_s.custom_prune ? String(trim_s.custom_prune[0].length) + " nodes selected as seeds." : ""
    ].filter(e => e);
    
    return (
      <div style={{padding: '15px'}}>
        Graph has {this.graph_informations.linkNumber} links and {this.graph_informations.nodeNumber} nodes. 
        {texts ? <p class="paragraph-info">{"Filters: " + texts + "."}</p> : ""}
        {elements.map(e => <p class="paragraph-info">{e}</p>)}
      </div>
    );
  }

  /**
   * Rendu graphique.
   */
  render() {
    return (
      <Host>
        {/* Node number, etc */}
        <div class="omega-graph-center" style={{width: '600px', 'max-width': '65vw', 'max-height': '160px'}}>
          {this.generateInfoCard()}
        </div>
      </Host>
    );
  }
} 
