import { Component, h, Element, State, Host, Listen } from '@stencil/core';
import FrontTopology, { TrimOptions } from '../../utils/FrontTopology';

@Component({
  tag: "omega-graph-infos",
  styleUrl: 'omega-graph-infos.css',
  shadow: false
})
export class OmegaInfos {
  @Element() el: HTMLElement;

  @State()
  graph_informations: { nodeNumber: number, linkNumber: number, trimSettings: TrimOptions } = {
    nodeNumber: NaN,
    linkNumber: NaN,
    trimSettings: { }
  };

  @Listen('omega-graph.data-update', { target: 'window' })
  buildInfos(e: CustomEvent<{nodeNumber: number, linkNumber: number}>) {
    this.graph_informations = {
      nodeNumber: e.detail.nodeNumber,
      linkNumber: e.detail.linkNumber,
      trimSettings: Object.assign({}, FrontTopology.current_trim_parameters, { custom_prune: FrontTopology.current_prune_parameters })
    };
    console.log("Rebuilding infos", this.graph_informations);
  }


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
