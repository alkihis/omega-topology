import { Component, h, Prop, Listen, Element, Method, Event, EventEmitter, Watch } from '@stencil/core';
import FrontTopology from '../../utils/FrontTopology';

import ForceGraph3D from '3d-force-graph';
import { D3GraphBase, D3Node, D3Link, MakeGraphEvent, TrimProperties } from '../../utils/types';
import { BASE_SIMILARITY, BASE_COVERAGE, BASE_IDENTITY } from '../../utils/utils';
import ReversibleKeyMap from 'reversible-key-map';

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

  @Event({
    eventName: "prune-add-node"
  }) addSelectedNode: EventEmitter;

  @Event({
    eventName: "prune-delete-node"
  }) removeSelectedNode: EventEmitter;

  @Event({
    eventName: "prune-reset-nodes"
  }) resetSelectedNodes: EventEmitter<void>;

  @Event({
    eventName: "omega-graph.rebuild_taxo"
  }) buildTaxoTree: EventEmitter<string[]>;

  @Event({
    eventName: "omega-graph.rebuild_onto"
  }) buildOntoTree: EventEmitter<string[]>;

  public static readonly tag = "omega-graph";

  /** Noeuds actuellement en surbrillance dans le graphe  */
  protected highlighted_nodes: Set<D3Node> = new Set;
  protected hovered_nodes: Set<D3Node> = new Set;

  protected highlighted_links: Set<D3Link> = new Set;
  protected hovered_links: Set<D3Link> = new Set;

  /** Graph 3D */
  protected three_d_graph: any = undefined;

  protected in_selection = false;
  
  protected _actual_data: D3GraphBase;
  protected _links_to_nodes: ReversibleKeyMap<string, string, D3Link> = new ReversibleKeyMap;

  /**
   * Initialisation du composant.
   */
  async componentDidLoad() {
    window['graphcomponent'] = this;

    await FrontTopology.init(this.specie);
    
    // Construction du graphe
    console.log("Topology has been initialized.");

    FrontTopology.trim({ similarity: Number("50"), coverage: Number(BASE_COVERAGE), identity: Number(BASE_IDENTITY), definitive: true });
    //FrontTopology.showGraph();

    FrontTopology.downloadMitabLines()
      .then(() => {
        if (FrontTopology.percentage_mitab >= 100) {
          this.buildTaxoTree.emit([...FrontTopology.taxo_ids]);
          this.buildOntoTree.emit([...FrontTopology.onto_ids]);
        }
      });
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

  protected clip(nodes: D3Node[], force = false) {
    console.log(nodes);

    for (const node of (this.three_d_graph.graphData().nodes as D3Node[])) {
      node.__threeObj.visible = force ? node.__threeObj.visible : false;

      for (const centerNode of nodes) {
        if (node.id === centerNode.id || this._links_to_nodes.hasCouple(node.id, centerNode.id)) {
          // console.log('i will show ' + node.id);
          node.__threeObj.visible = true;
          break;
        }
      }
    }

    for (const link of (this.three_d_graph.graphData().links as D3Link[])) {
      link.__lineObj.visible = force ? link.__lineObj.visible : false;
    }

    for (const centerNode of nodes) {
      const linkByPartner = this._links_to_nodes.getAllFrom(centerNode.id);

      if (linkByPartner)
        for (const partner of linkByPartner.values()) {
          partner.__lineObj.visible = true;
        }
    }
  }

  protected unclip() {
    for (const n of this.three_d_graph.graphData().nodes) {
      n.__threeObj.visible = true;
    }

    for (const l of this.three_d_graph.graphData().links) {
      l.__lineObj.visible = true;
    }
  }

  protected async registerLinks() {
    const links = this.three_d_graph.graphData().links as D3Link[];

    // Actualise les links
    // DOIT attendre que la création des liens est effective
    for (const l of links) {
      if (typeof l.source.id === 'undefined') {
        await new Promise(resolve => setTimeout(resolve, 50));

        this.registerLinks();
        return;
      }

      this._links_to_nodes.set(l.source.id, l.target.id, l);
    }

    console.log("Registred");
  }

  set actual_data(data: D3GraphBase) {
    if (!this.actual_data) {
      this.three_d_graph.graphData(data);
      this._actual_data = data;

      this.registerLinks();
      return;
    }

    this._actual_data = data;

    // Unclip all
    this.unclip();

    // Clip 
    this.clip(data.nodes);

    // Actualise les arbres si les infos mitab sont disponibles
    if (FrontTopology.percentage_mitab >= 100) {
      this.buildTaxoTree.emit([...FrontTopology.taxo_ids]);
      this.buildOntoTree.emit([...FrontTopology.onto_ids]);
    }
  }

  get actual_data() {
    return this._actual_data;
  }

  @Listen('trim-property-change', { target: 'window' })
  handleTrimChange(event: CustomEvent<TrimProperties>) {
    FrontTopology.trim(event.detail);
  }

  @Listen('omega-onto.trim', { target: 'window' })
  handleOntologyChange(event: CustomEvent<string[]>) {
    FrontTopology.trim({ experimental_detection_method: event.detail });
  }

  @Listen('omega-taxo.trim', { target: 'window' })
  handleTaxonomyChange(event: CustomEvent<string[]>) {
    FrontTopology.trim({ taxons: event.detail });
  }

  @Listen('prune-select-nodes', { target: 'window' })
  startSelection() {
    this.in_selection = true;
  }

  @Listen('prune-end-select-nodes', { target: 'window' })
  stopSelection() {
    this.in_selection = false;
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
    this.resetSelectedNodes.emit();

    const graph_base = data instanceof CustomEvent ? (event as MakeGraphEvent).detail.graph_base : data;

    if (!graph_base) {
      throw new TypeError("Bad event raised: graph_base is not defined");
    }

    console.log(graph_base);

    if (this.three_d_graph) {
      console.log("Rebuilding from existant");
      this.actual_data = graph_base;
    }
    else {
      const element = this.el.querySelector(`div[graph-element]`);
      element.innerHTML = "";

      this.three_d_graph = ForceGraph3D() //.backgroundColor('#fff').linkWidth(2).linkColor("#000").linkOpacity(0.5)
        (element)
        .nodeLabel('id')
        // .forceEngine('ngraph') // Fait planter cameraPosition
        .linkCurvature((l: D3Link) => l.target == l.source ? 0.5 : 0)
        .nodeColor((node: D3Node) => (this.highlighted_nodes.has(node) || this.hovered_nodes.has(node)) ? 'rgb(255,0,0,1)' : (node.group === 0 ? '#607AC1' : '#60C183'))
        // .linkWidth((link: D3Link) => (this.highlighted_links.has(link) || this.hovered_links.has(link)) ? 4 : 0)
        .linkDirectionalParticles((link: D3Link) => (this.highlighted_links.has(link) || this.hovered_links.has(link)) ? 4 : 0)
        .linkDirectionalParticleWidth(4)
        .cooldownTicks(300)
        .cooldownTime(10000)
        .onNodeClick((node: D3Node) => {
            if (this.in_selection) {
              if (this.highlighted_nodes.has(node)) {
                this.removeHighlighting(node.id);
              }
              else {
                this.highlightNode(node.id);
              }
                
              return;
            }

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

      this.three_d_graph.onEngineStop(() => {
          this.three_d_graph.cooldownTicks(0)
            .cooldownTime(0)
      });

      this.actual_data = graph_base;
    }
  }

  @Method()
  async highlightNode(...node_ids: string[]) {
    const indexes = new Set(node_ids);

    for (let i = 0; i < this.actual_data.nodes.length && indexes.size; i++) {
      if (indexes.has(this.actual_data.nodes[i].id)) {
        indexes.delete(this.actual_data.nodes[i].id);

        if (!this.highlighted_nodes.has(this.actual_data.nodes[i])) {
          this.addSelectedNode.emit(this.actual_data.nodes[i].id);
        }

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
      this.removeSelectedNode.emit(nd.id);
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
    // Sauvegarde des états des noeuds
    const nodes_map = new Map<string, boolean>();
    const links_map = new ReversibleKeyMap<string, string, boolean>();

    for (const node of (this.three_d_graph.graphData().nodes as D3Node[])) {
      nodes_map.set(node.id, node.__threeObj.visible);
    }
    for (const link of (this.three_d_graph.graphData().links as D3Link[])) {
      links_map.set(link.target.id, link.source.id, link.__lineObj.visible);
    }

    this.three_d_graph.nodeRelSize(4); // trigger update of 3d objects in scene

    // Restauration des états
    for (const node of (this.three_d_graph.graphData().nodes as D3Node[])) {
      node.__threeObj.visible = nodes_map.get(node.id);
    }
    for (const link of (this.three_d_graph.graphData().links as D3Link[])) {
      link.__lineObj.visible = links_map.get(link.target.id, link.source.id);
    }
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
    this.actual_data = { nodes, links };
  }
} 
