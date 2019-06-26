import { Component, h, Prop, Listen, Element, Method } from '@stencil/core';
import FrontTopology from '../../utils/FrontTopology';

import ForceGraph3D from '3d-force-graph';
import { D3GraphBase, D3Node, D3Link, MakeGraphEvent, TrimProperties } from '../../utils/types';

// import * as jstree from '../../..//node_modules/jstree/dist/jstree';
// import $ from 'jquery';

@Component({
  tag: "omega-graph",
  styleUrl: 'omega-graph.css',
  shadow: false
})
export class OmegaGraph {
  /** Espèce modélisée par le graphe */
  @Prop({ mutable: true }) specie: string = "r6";
  @Element() el: HTMLElement;

  public static readonly tag = "omega-graph";

  /** Noeuds actuellement en surbrillance dans le graphe  */
  protected highlighted_nodes: Set<D3Node> = new Set;
  protected hovered_nodes: Set<D3Node> = new Set;

  protected highlighted_links: Set<D3Link> = new Set;
  protected hovered_links: Set<D3Link> = new Set;

  /** Graph 3D */
  protected three_d_graph: any = undefined;

  /**
   * Initialisation du composant.
   */
  async componentDidLoad() {
    window['graphcomponent'] = this;

    await FrontTopology.init(this.specie);
    
    // Construction du graphe
    console.log("Topology has been initialized.");

    FrontTopology.trim({ similarity: 70, coverage: 30, identity: 40 });

    // FrontTopology.downloadMitabLines();
  }

  async componentDidUnload() {
    console.log("Unload component");
  }

  async componentDidUpdate() {
    this.componentDidLoad();
  }

  /**
   * Rendu graphique. Ne change jamais (juste un div adpaté)
   */
  render() {
    return <div graph-element></div>;
  }

  /**
   * Données actuellement chargées dans le graphe.
   *
   * @readonly
   */
  get actual_data() : D3GraphBase {
    return this.three_d_graph.graphData();
  }

  @Listen('trim-property-change', { target: 'window' })
  handleTrimChange(event: CustomEvent<TrimProperties>) {
    console.log("change")
    FrontTopology.trim(event.detail);
  }

  /** 
   * Construction d'un graphe, en utilisant ForceGraph3D.
   * 
   * Capable de recevoir un *CustomEvent* doté une propriété *detail* contenant un objet, possédant une propriété *graph_base* de type `D3GraphBase` (type `MakeGraphEvent`).
   * 
   * Il est possible de directement passer un object implémentant `D3GraphBase` à cette fonction, qui construira le graphe en conséquence.
   */
  @Listen('omega-graph-make-graph')
  @Method()
  async make3dGraph(data: MakeGraphEvent | D3GraphBase) {
    const graph_base = data instanceof CustomEvent ? (event as MakeGraphEvent).detail.graph_base : data;

    if (!graph_base) {
      throw new TypeError("Bad event raised: graph_base is not defined");
    }

    console.log(graph_base);

    if (this.three_d_graph) {
      console.log("Rebuilding from existant");
      this.three_d_graph.graphData(graph_base);
    }
    else {
      const element = this.el.querySelector(`div[graph-element]`);
      element.innerHTML = "";

      this.three_d_graph = ForceGraph3D() //.backgroundColor('#fff').linkWidth(2).linkColor("#000").linkOpacity(0.5)
        (element)
        .graphData(graph_base)
        .nodeLabel('id')
        // .forceEngine('ngraph') // Fait planter cameraPosition
        .linkCurvature((l: D3Link) => l.target == l.source ? 0.5 : 0)
        .nodeColor((node: D3Node) => (this.highlighted_nodes.has(node) || this.hovered_nodes.has(node)) ? 'rgb(255,0,0,1)' : (node.group === 0 ? '#607AC1' : '#60C183'))
        // .linkWidth((link: D3Link) => (this.highlighted_links.has(link) || this.hovered_links.has(link)) ? 4 : 0)
        .linkDirectionalParticles((link: D3Link) => (this.highlighted_links.has(link) || this.hovered_links.has(link)) ? 4 : 0)
        .linkDirectionalParticleWidth(4)
        .onNodeClick((node: D3Node) => {
            const distance = 120;
            const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
            console.log(distRatio)
            this.three_d_graph.cameraPosition(
                { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
                node, // lookAt ({ x, y, z })
                3000  // ms transition duration
            );
        })
        .onNodeHover(async (node: D3Node) => {
          // no state change
          if ((!node && !this.hovered_nodes.size) || (this.hovered_nodes.has(node))) return;

          this.hovered_nodes = node ? new Set([node]) : new Set;
          this.hovered_links = node ? new Set(await this.getLinksOf(node.id)) : new Set;

          this.updateGeometries();
        })
        .onLinkHover((link: D3Link) => {
          // no state change
          if (this.hovered_links.has(link)) return;

          this.hovered_links = new Set([link]);
          this.hovered_nodes = link ? new Set([link.source, link.target]) : new Set;
          this.updateGeometries();
        });

    }
  }

  @Method()
  async highlightNode(...node_ids: string[]) {
    const indexes = new Set(node_ids);

    for (let i = 0; i < this.actual_data.nodes.length && indexes.size; i++) {
      if (indexes.has(this.actual_data.nodes[i].id)) {
        indexes.delete(this.actual_data.nodes[i].id);
        this.highlighted_nodes.add(this.actual_data.nodes[i]);
      }
    }

    if (indexes.size) {
      console.warn('Node(s) ' + [...indexes].join(', ') + ' not found');
    }

    this.updateGeometries();
  }

  @Method()
  async highlightNodeRegex(matcher: RegExp) {
    for (let i = 0; i < this.actual_data.nodes.length; i++) {
      if (matcher.test(this.actual_data.nodes[i].id)) {
        this.highlighted_nodes.add(this.actual_data.nodes[i]);
      }
    }

    this.updateGeometries();
  }

  @Method()
  async highlightLink(source: string, target: string) {
    // do not know what to do
  }

  @Method()
  async removeHighlighting(...node_ids: string[]) {
    const nodes_to_remove = new Set(node_ids);
    const to_remove = [...this.highlighted_nodes].filter(e => nodes_to_remove.has(e.id));

    for (const nd of to_remove) {
      this.highlighted_nodes.delete(nd);
    }

    this.updateGeometries();
  }

  @Method()
  async removeHighlightingRegex(matcher: RegExp) {
    const to_remove = [...this.highlighted_nodes].filter(e => matcher.test(e.id));

    for (const nd of to_remove) {
      this.highlighted_nodes.delete(nd);
    }

    this.updateGeometries();
  }

  @Method()
  async resetHighlighting() {
    this.highlighted_nodes = new Set;
    this.updateGeometries();
  }

  protected updateGeometries() {
    this.three_d_graph.nodeRelSize(4); // trigger update of 3d objects in scene
  }

  @Method()
  async getNode(id: string) {
    return this.actual_data.nodes.find(e => e.id === id);
  }

  @Method()
  async getLinksOf(id: string) {
    return this.actual_data.links.filter(e => e.target.id === id || e.source.id === id);
  }

  @Method()
  async removeNode(...removed_nodes: Array<D3Node | string | RegExp>) {
    if (removed_nodes.length === 0) return;

    const tmp: D3Node[] = [];

    for (const e of removed_nodes) {
      if (typeof e === 'string') {
        const node = this.actual_data.nodes.find(n => n.id === e);

        if (node) {
          tmp.push(node);
        }
      }
      else if (e instanceof RegExp) {
        const nodes = this.actual_data.nodes.filter(n => n.id.match(e));

        if (nodes.length) {
          tmp.push(...nodes);
        }
      }
      else {
        tmp.push(e);
      }
    }

    removed_nodes = tmp;

    const to_remove = new Set(removed_nodes);
    const to_remove_index = new Set(removed_nodes.map(e => (e as D3Node).index));

    let { nodes, links } = this.three_d_graph.graphData() as D3GraphBase;

    // Deleting nodes and links
    links = links.filter(l => !to_remove.has(l.source) && !to_remove.has(l.target)); // Remove links attached to node
    nodes = nodes.filter((_, index) => !to_remove_index.has(index)); // Remove node

    nodes.forEach((n, idx) => { n.index = idx; }); // Reset node ids to array index
    this.three_d_graph.graphData({ nodes, links });
  }
} 
