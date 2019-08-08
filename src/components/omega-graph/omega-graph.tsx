import { Component, h, Prop, Listen, Element, Method, Event, EventEmitter, Watch, State } from '@stencil/core';
import ReversibleKeyMap from 'reversible-key-map';
import * as d3 from 'd3-force-3d';
import ForceGraph3D from '3d-force-graph';
import { Color, Material, MeshLambertMaterial, LineBasicMaterial } from 'three';
import { PSQData } from 'omega-topology-fullstack';
import { UniprotProtein } from 'omega-topology-fullstack/build/UniprotContainer';

import FrontTopology, { TrimOptions } from '../../utils/FrontTopology';
import { D3GraphBase, D3Node, D3Link, MakeGraphEvent, TrimProperties, PruneAddProperty, PruneDeleteProperty } from '../../utils/types';
import Animator from './Animator';

@Component({
  tag: "omega-graph",
  styleUrl: 'omega-graph.css',
  shadow: false
})
export class OmegaGraph {
  /* --- HTML PROPERTIES --- */

  /** Specie representated by the graph */
  @Prop({ mutable: true }) specie: string = "r6";

  /* --- ELEMENT --- */

  @Element() el: HTMLElement;

  /* --- STATES --- */

  /** If the graph actually support node selection or not */
  @State()
  protected in_selection = false;

  /** Number of selected/highlighted nodes */
  @State()
  protected number_selected_nodes = 0;

  /* --- INTERNAL PROPERTIES --- */

  /** Selected nodes / highlighted nodes  */
  protected highlighted_nodes: Set<D3Node> = new Set;
  /** Hovered nodes */
  protected hovered_nodes: Set<D3Node> = new Set;
  /** Hovered nodes from a history menu */
  protected history_hover_nodes: Set<string> = new Set;

  /** Highlighted links */
  protected highlighted_links: Set<D3Link> = new Set;
  /** Hovered links */
  protected hovered_links: Set<D3Link> = new Set;
  /** Hovered links from a history menu */
  protected history_hover_links: Set<D3Link> = new Set;

  /** 3D FORCE GRAPH instance */
  protected three_d_graph: any = undefined;
  
  /** Actual stored data (not really D3GraphBase complient, use `.three_d_graph.graphData()` instead) */
  protected _actual_data: D3GraphBase;

  /** Storage for fast link accession, with node ID in key */
  protected _links_to_nodes: ReversibleKeyMap<string, string, D3Link> = new ReversibleKeyMap;

  /** Color for hovered nodes */
  protected hovered_color = new Color('rgb(255,150,0,1)');
  /** Color for selectionned nodes */
  protected selectionned_color = new Color('rgb(255,0,0,1)');
  /** Default color for nodes */
  protected group_0_color = new Color(0x607AC1);
  /** Color for nodes selectionned as seeds */
  protected group_1_color = new Color(0x60C183);

  /** Color for hovered nodes */
  protected hovered_link_color = new Color('rgb(250,120,30,1)');
  /** Default color for links */
  protected classic_link_color = new Color('rgb(255,255,255,1)');

  /** Material for hovered links */
  protected link_hovered_material = new LineBasicMaterial({
    color: this.hovered_link_color,
    linewidth: 3,
    opacity : 0.8,
    transparent: true,
    linecap: 'round',
    linejoin:  'round'
  });

  /** Classic material for links */
  protected link_classic_material = new LineBasicMaterial({
    color: this.classic_link_color,
    linewidth: 1,
    opacity : 0.2,
    transparent: true,
    linecap: 'round',
    linejoin:  'round'
  });

  /* --- EVENTS --- */

  /** Fires when a node is selected */
  @Event({
    eventName: "omega-graph.prune-add"
  }) addSelectedNode: EventEmitter<PruneAddProperty>;

  /** Fires when a node is unselected */
  @Event({
    eventName: "omega-graph.prune-remove"
  }) removeSelectedNode: EventEmitter<PruneDeleteProperty>;

  /** Fires when button "unselect all" is clicked */
  @Event({
    eventName: "omega-graph.prune-reset"
  }) resetSelectedNodes: EventEmitter<void>;

  /** Fires when a prune is asked */
  @Event({
    eventName: "omega-graph.prune-make"
  }) makeAPrune: EventEmitter<string[]>;

  /** Fires when taxonomy tree needs to be refreshed. Data: taxonomic IDs */
  @Event({
    eventName: "omega-graph.rebuild-taxo"
  }) buildTaxoTree: EventEmitter<string[]>;

  /** Fires when ontology tree needs to be refreshed. Data: MI IDs */
  @Event({
    eventName: "omega-graph.rebuild-onto"
  }) buildOntoTree: EventEmitter<string[]>;

  /** Fires when the graph is refreshed */
  @Event({
    eventName: "omega-graph.rebuild"
  }) graphGenericRebuild: EventEmitter<void>;

  /** Fires when a node is clicked, and a information card needs to be loaded */
  @Event({
    eventName: "omega-graph.load-protein"
  }) loadProteinCard: EventEmitter<Promise<UniprotProtein>>;

  /** Fires when a link is clicked, and a information card needs to be loaded */
  @Event({
    eventName: "omega-graph.load-link"
  }) loadLinkCard: EventEmitter<D3Link>;

  /** Fires when the graph is reset */
  @Event({
    eventName: "omega-graph.complete-reset"
  }) resetAllData: EventEmitter<void>;

  /** Fires when the graph has a node number or a link number update */
  @Event({
    eventName: "omega-graph.data-update"
  }) actualDataUpdate: EventEmitter<{nodeNumber: number, linkNumber: number}>;

  /* --- WATCHERS --- */

  @Watch('specie')
  protected specieChange(specie: string, old: string) {
    if (specie !== old && old) {
      // Attends que l'espèce soit modifiée puis recharge le graphe
      setTimeout(() => { 
        this.destroyCurrentGraph(true); 
        FrontTopology.resetInstance(); 
        this.load(true, true); 
      }, 30);
    }
  }

  /* --- LISTENERS --- */

  /**
   * Update the trees components (taxonomy tree and ontology tree).
   * 
   * Listen for MI Tab download completion.
   */
  @Listen('FrontTopology.mitab-downloaded', { target: 'window' })
  updateTrees() {
    if (FrontTopology.mitab_loaded) {
      this.buildTaxoTree.emit([...FrontTopology.taxo_ids]);
      this.buildOntoTree.emit([...FrontTopology.onto_ids]);
    }
  }

  /**
   * Trim the current graph according to a omega-trim property change event.
   */
  @Listen('omega-trim.property-change', { target: 'window' })
  handleTrimChange(event: CustomEvent<TrimProperties>) {
    FrontTopology.trim(event.detail);
  }

  /**
   * Trim the current graph according to a omega-onto ontology select event.
   */
  @Listen('omega-onto.trim', { target: 'window' })
  handleOntologyChange(event: CustomEvent<string[]>) {
    FrontTopology.trim({ experimental_detection_method: event.detail });
  }

  /**
   * Trim the current graph according to a omega-taxo taxons select event.
   */
  @Listen('omega-taxo.trim', { target: 'window' })
  handleTaxonomyChange(event: CustomEvent<string[]>) {
    FrontTopology.trim({ taxons: event.detail });
  }

  /**
   * Enable node selection.
   */
  @Listen('omega-prune.selection', { target: 'window' })
  startSelection() {
    this.in_selection = true;
  }

  /**
   * Disable node selection.
   */
  @Listen('omega-prune.end-selection', { target: 'window' })
  stopSelection() {
    this.in_selection = false;
  }

  /**
   * Unselect all selected nodes.
   */
  @Listen('omega-prune.unselect-all', { target: 'window' })
  @Listen('network-table.unselect-all', { target: 'window' })
  unselectAll() {
    this.resetHighlighting();
    this.in_selection = false;
  }

  /**
   * Hover a single node, according a to hover event containing the node ID.
   */
  @Listen('omega-uniprot-card.hover-on', { target: 'window' })
  makeNodeOverHistory(e: CustomEvent<string>) {
    this.makeNodeHovered([e.detail]);
  }

  /**
   * Hover a single node, according a to hover event containing the node ID in first array position.
   */
  @Listen('network-table.hover-on', { target: 'window' })
  makeNodeTable(e: CustomEvent<string[]>) {
    this.makeNodeHovered([e.detail[0]]);
  }

  /**
   * Remove node hover highlight.
   */
  @Listen('omega-uniprot-card.hover-off', { target: 'window' })
  @Listen('network-table.hover-off', { target: 'window' })
  @Listen('go-chart.hover-off', { target: 'window' })
  removeNodeOverHistory() {
    this.history_hover_nodes = new Set;
    this.updateGeometries();
  }

  /**
   * Hover a single link, according a to hover event containing the `D3Link` reference.
   */
  @Listen('omega-mitab-card.hover-on', { target: 'window' })
  makeLinkOverHistory(e: CustomEvent<D3Link>) {
    this.history_hover_links = new Set([e.detail]);
    this.updateGeometries();
  }

  /**
   * Remove link hover highlighting.
   */
  @Listen('omega-mitab-card.hover-off', { target: 'window' })
  removeLinkOverHistory() {
    this.history_hover_links = new Set;
    this.updateGeometries();
  }

  /**
   * Select nodes according to a go-chart select event 
   */
  @Listen('go-chart.select', { target: 'window' })
  protected selectNodes(event: CustomEvent<{ selected: {id: string}[] }>) {
    const go_ids = event.detail.selected.map(e => e.id);

    // Get nodes from GO IDS
    const nodes = FrontTopology.topo.go_container.bulkSearch(go_ids);

    this.resetHighlighting();
    this.highlightNode(...nodes);
  }

  /**
   * Make node flash according to a go-chart hover event
   */
  @Listen('go-chart.hover-on', { target: 'window' })
  protected hoverByGoId(event: CustomEvent<string[]>) {
    const go_ids = event.detail;

    // Get nodes from GO IDS
    const nodes = FrontTopology.topo.go_container.bulkSearch(go_ids);

    this.makeNodeHovered(nodes);
  }

  /**
   * Reload the 3DGraph instance with new data.
   * Warning : This will make current trim parameters irreversibles !
   */
  @Listen('omega-reheat.reheat', { target: 'window' })
  protected reheat(data?: D3GraphBase) {
    if (data instanceof CustomEvent) {
      data = data.detail;
    }

    if (!data) {
      data = this.actual_data;
    }

    this._actual_data = undefined;

    this.three_d_graph
      .graphData({links:[], nodes:[]})
      .cooldownTicks(300)
      .cooldownTime(10000);

    this._links_to_nodes = new ReversibleKeyMap;

    this.make3dGraph(data);
  }

  /**
   * Completely reset the graph. Ask FrontTopology to load untrimmed data.
   */
  @Listen('omega-reset.reset', { target: 'window' })
  @Listen('omega-artefact.reset', { target: 'window' })
  protected reset() {
    this.destroyCurrentGraph(true);

    this._actual_data = undefined;
    this.three_d_graph = undefined;
    this._links_to_nodes = new ReversibleKeyMap;
    FrontTopology.trim({ keep_old: false, custom_prune: [[], Infinity] });

    const self = this;
    setTimeout(function reloadData() {
      if (self.three_d_graph.graphData().nodes[0].id === undefined) {
        setTimeout(reloadData, 100);
      }
      else {
        // Actualise les arbres si les infos mitab sont disponibles
        self.updateTrees();

        FrontTopology.setupUniprotData();
      }
    }, 100);
  }

  /**
   * Prepare for a new importation. Empty the instance, and reset FrontTopology.
   */
  @Listen('omega-import.import', { target: 'window' })
  protected loadExternalGraph() {
    this.destroyCurrentGraph(true);
    FrontTopology.resetInstance();
    this.resetAllData.emit();
  }

  /**
   * Select a node according to a network-table event.
   */
  @Listen('network-table.select', { target: 'window' })
  protected selectNetworkTable(e: CustomEvent<string[]>) {
    this.highlightNode(e.detail[0]);
  }

  /**
   * Unselect a node according to a network-table event.
   */
  @Listen('network-table.unselect', { target: 'window' })
  protected unselectNetworkTable(e: CustomEvent<string[]>) {
    this.removeHighlighting(e.detail[0]);
  }

  /* ------------------------ */
  /* --- CLASSIC METHODS  --- */
  /* ------------------------ */

  /* --- INITIALIZATION --- */

  /**
   * Properly initiate component specie with query string in URL.
   */
  componentWillLoad() {
    // Remove possible tag, extract the query string (without the ?)
    const url = window.location.href.split('#')[0].split('?')[1];

    if (url) {
      // If query string exists, split every parameter 
      // and make a tuple [name, value] for each parameter
      const splitted = url.split('&').map(e => e.split('=', 2));;
      const parms_real: { [key: string]: string } = {};

      // Register every tuple in a key => value object
      for (const [key, value] of splitted) {
        parms_real[key] = value;
      }

      // Check if specie exists
      if ('specie' in parms_real) {
        this.specie = parms_real.specie.toLocaleUpperCase();
      }
    }
  }

  /**
   * When the component starts. Do not call this method !
   */
  componentDidLoad() {
    document.body.classList.remove('white');

    // Attends l'initialisation des go_terms (c'est plus smooth après)
    this.load(true, true);
  }

  /**
   * Initialize the graph.
   * Initialize FrontTopology with desired specie, 
   * wait for GO terms download, 
   * show the graph,
   * download UniProt data,
   * then start the MI Tab download.
   * 
   * @param with_slowdown Wait 100 ms after the start of the method
   * @param wait_for_go_init Wait for GO terms download
   */
  async load(with_slowdown = false, wait_for_go_init = false) {
    window['graphcomponent'] = this;

    const preloader_infos = document.getElementById('preloader-initialisation-message');

    if (preloader_infos)
      preloader_infos.innerText = "Downloading graph for specie " + this.specie.toLocaleUpperCase();

    if (with_slowdown) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const promise_terms_download = new Promise((resolve, reject) => {
      // Attends 30 secondes au maximum
      const remove_evt_lst = () => {
        window.removeEventListener('FrontTopology.go-terms-downloaded', resolve_fn);
        window.removeEventListener('FrontTopology.go-terms-download-error', error_fn);
      }

      const resolve_fn = () => {
        resolve();
        remove_evt_lst();
        clearTimeout(timeout);
      };

      const error_fn = () => {
        reject();
        remove_evt_lst();
        clearTimeout(timeout);
      };

      window.addEventListener('FrontTopology.go-terms-downloaded', resolve_fn);
      window.addEventListener('FrontTopology.go-terms-download-error', error_fn);
      const timeout = setTimeout(error_fn, 40000);
    });

    try {
      await FrontTopology.init(this.specie);
    } catch (e) {
      console.error("Unable to load specie skeleton", e);
      // Afficher un message d'erreur en position absolute.
      const fail_init = document.getElementById('__modal_fail_initialisation__');

      const not_found = 'error' in e && e.error === "File not found";

      if (fail_init) {
        //@ts-ignore
        $(fail_init).modal({ keyboard: false, backdrop: 'static', show: true });

        if (not_found)
          $('#__modal_fail_initialisation_text__').text("The specie you're looking for does not have a pre-calculated interlog network available. You can request this specie to an administrator.");
        else
          $('#__modal_fail_initialisation_text__').text("Please refresh this page or try again later.")
      }
    }
    
    if (with_slowdown) {
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    
    // Construction du graphe
    console.log("Topology has been initialized.");
    
    const loader = document.getElementById('preloader-base');

    if (wait_for_go_init) {
      if (preloader_infos)
        preloader_infos.innerText = "Downloading UniProt metadata";
      
      try {
        // Télécharge les données et attend ! 
        await promise_terms_download;
      } catch (e) {
        const alert_element = document.querySelector('#__uniprot_data_error_message__ .alert-content') as HTMLElement;

        if (alert_element) {
          alert_element.innerHTML = "<strong>Unable to load UniProt data.</strong> Some data will be inaccessible. Try refreshing this page later.";
          alert_element.parentElement.parentElement.style.display = "";
        }
      }
    }

    if (loader) {
      loader.remove();
    }

    FrontTopology.showGraph();

    FrontTopology.downloadMitabLines();
  }

  /* --- GRAPH RENDER --- */

  /** 
   * Make the graph, using ForceGraph3D.
   * 
   * Able to receive a *CustomEvent* holding a *detail* property, containing a *graph_base* property of type `D3GraphBase` (type `MakeGraphEvent`).
   * 
   * You can also just give a `D3GraphBase` complient object to this method.
   */
  @Listen('omega-graph.make-graph')
  @Method()
  async make3dGraph(data: MakeGraphEvent | D3GraphBase) {
    // Destroy exisiting data without empty the HTML
    this.destroyCurrentGraph(false);

    // Get the real graph base
    const graph_base = data instanceof CustomEvent ? (event as MakeGraphEvent).detail.graph_base : data;

    if (!graph_base) {
      throw new TypeError("Bad event raised: graph_base is not defined");
    }

    // If a graph is already defined, give the logic to the `.actual_data` setter.
    if (this.three_d_graph) {
      this.actual_data = graph_base;
    }
    else {
      // Construct the graph from scratch
      const element = this.el.querySelector(`div[graph-element]`);
      element.innerHTML = "";

      // See ForceGraph3D documentation for all the methods
      this.three_d_graph = ForceGraph3D({ rendererConfig: { antialias: true, alpha: true, preserveDrawingBuffer: true } })
        (element)
        .nodeLabel('id')
        .linkCurvature((l: D3Link) => l.target == l.source ? 0.5 : 0)
        // Nécessaire pour avoir une bonne couleur à l'initialisation
        .nodeColor((node: D3Node) => (this.highlighted_nodes.has(node) || this.hovered_nodes.has(node)) ? 'rgb(255,0,0,1)' : (node.group === 0 ? '#607AC1' : '#60C183'))
        .cooldownTicks(300)
        .cooldownTime(10000)
        .linkHoverPrecision(1.5)
        .onNodeClick((node: D3Node) => {
          // If in selection, select the node
          if (this.in_selection) {
            if (this.highlighted_nodes.has(node)) {
              this.removeHighlighting(node.id);
            }
            else {
              this.highlightNode(node.id);
            }
              
            return;
          }

          // Else, show node card
          const uniprot_id = node.id;
          this.loadProteinCard.emit(FrontTopology.topo.getProteinInfos(uniprot_id));
        })
        .onNodeHover(async (node: D3Node) => {
          // Highlight the node
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
        })
        .onLinkClick((link: D3Link) => {
          this.loadLinkCard.emit(link);
        })
        .d3Force('charge', d3.forceManyBody().strength(-90))
        .d3VelocityDecay(0.3);

      this.three_d_graph.onEngineStop(() => {
          this.three_d_graph.cooldownTicks(0)
            .cooldownTime(0)
      });

      this.actual_data = graph_base;
    }
  }

  /**
   * Update the graph colors, animations and other things linked to ThreeJS render.
   * 
   * Should be called after a `Set` update.
   */
  protected updateGeometries() {
    if (!this.three_d_graph)
      return;

    // Checking node color
    const data = this.three_d_graph.graphData() as D3GraphBase;

    Animator.cancelAll();

    if (data.nodes.length === 0 || data.nodes[0].__threeObj === undefined) {
      return;
    }

    for (const node of data.nodes) {
      const node_material = node.__threeObj.material as MeshLambertMaterial;

      if (this.history_hover_nodes.has(node.id)) {
        if (node_material.color !== this.hovered_color) {
          const clone = node_material.clone();
          clone.color = this.hovered_color;
          node.__threeObj.material = clone;
        }

        Animator.addAnimation(node, (node, tween) => {
          const s = { x: 1, y: 1, z: 1 };
          const s2 = { x: 3, y: 3, z: 3 };

          new tween.Tween(s)
            .to(s2, 700)
            .delay(0)
            .easing(tween.Easing.Linear.None)
            // @ts-ignore
            .onUpdate( function() { node.__threeObj.scale.copy(s); } )
            .chain(new tween.Tween(s2)
              .to({ x: 1, y: 1, z: 1 }, 700)
              .delay(0)
              .easing(tween.Easing.Linear.None)
              // @ts-ignore
              .onUpdate( function() { node.__threeObj.scale.copy(s2); } )
            ).start();
        }, 1500);
      }
      else if (this.hovered_nodes.has(node)) {
        if (node_material.color !== this.hovered_color) {
          const clone = node_material.clone();
          clone.color = this.hovered_color;
          node.__threeObj.material = clone;
        }
      }
      else if (this.highlighted_nodes.has(node)) {
        if (node_material.color !== this.selectionned_color) {
          const clone = node_material.clone();
          clone.color = this.selectionned_color;
          node.__threeObj.material = clone;
        }
      }
      else if (node.group === 1) {
        if (node_material.color !== this.group_1_color) {
          const clone = node_material.clone();
          clone.color = this.group_1_color;
          node.__threeObj.material = clone;
        }
      }
      else {
        if (node_material.color !== this.group_0_color) {
          const clone = node_material.clone();
          clone.color = this.group_0_color;
          node.__threeObj.material = clone;
        }
      }

      // @ts-ignore
      node.__threeObj.scale.copy({ x: 1, y: 1, z: 1 });
    }

    // Checking link color & size
    for (const link of data.links) {
      const material = link.__lineObj.material as Material;

      if (this.history_hover_links.has(link)) {
        if (material !== this.link_hovered_material) {
          link.__lineObj.material = this.link_hovered_material;
        }
      }
      else if (this.highlighted_links.has(link) || this.hovered_links.has(link)) {
        if (material !== this.link_hovered_material) {
          link.__lineObj.material = this.link_hovered_material;
        }
      }
      else {
        if (material !== this.link_classic_material) {
          link.__lineObj.material = this.link_classic_material;
        }
      }
    }
  }

  /**
   * Make visible the nodes and the links given.
   */
  protected clip(nodes: Map<string, D3Node>, links: Map<string, Set<string>>) {
    for (const node of (this.three_d_graph.graphData().nodes as D3Node[])) {
      node.__threeObj.visible = nodes.has(node.id);
    }

    for (const link of (this.three_d_graph.graphData().links as D3Link[])) {
      link.__lineObj.visible = false;
    }

    for (const centerNode of nodes.keys()) {
      const linkByPartner = this._links_to_nodes.getAllFrom(centerNode);

      if (linkByPartner)
        for (const [, partner] of linkByPartner.entries()) {
          if (partner.__lineObj.visible) {
            continue;
          }
          
          if (links.has(partner.source.id) && links.get(partner.source.id).has(partner.target.id)) {
            partner.__lineObj.visible = true;
          }
        }
    }
  }

  /**
   * Hide all the links and nodes in the graph.
   */
  protected unclip() {
    for (const n of this.three_d_graph.graphData().nodes) {
      n.__threeObj.visible = true;
    }

    for (const l of this.three_d_graph.graphData().links) {
      l.__lineObj.visible = true;
    }
  }

  /* --- GRAPH HIGHLIGHTING --- */

  /**
   * Make flash all the nodes contained in the `nodes` array.
   */
  makeNodeHovered(nodes: string[]) {
    this.history_hover_nodes = new Set(nodes);
    this.updateGeometries();
  }

  /**
   * Highlight one or multiple nodes, according to their IDs.
   * 
   * @param node_ids Must be nodes IDs (protein accession numbers)
   */
  @Method()
  async highlightNode(...node_ids: string[]) {
    const indexes = new Set(node_ids);

    const data = this.three_d_graph.graphData() as D3GraphBase;
    const to_highlight: string[] = [];

    for (let i = 0; i < data.nodes.length && indexes.size; i++) {
      if (indexes.has(data.nodes[i].id)) {
        indexes.delete(data.nodes[i].id);

        if (!this.highlighted_nodes.has(data.nodes[i])) {
          to_highlight.push(data.nodes[i].id);
        }

        this.highlighted_nodes.add(data.nodes[i]);
      }
    }

    // Recherche si les noeuds sont présents dans actual_data (les élimine sinon)
    const nodes_set = new Set<string>(this.actual_data.nodes.map(e => e.id));
    const tmp = new Set<D3Node>();
    for (const i of this.highlighted_nodes) {
      if (nodes_set.has(i.id)) {
        tmp.add(i);
      }
    }

    this.highlighted_nodes = tmp;

    this.updateGeometries();
    this.addSelectedNode.emit(to_highlight);
    this.number_selected_nodes = this.highlighted_nodes.size;
  }

  /**
   * Remove highlighting from one or multiple nodes, according to their IDs.
   * 
   * @param node_ids Must be nodes IDs (protein accession numbers)
   */
  @Method()
  async removeHighlighting(...node_ids: string[]) {
    const nodes_to_remove = new Set(node_ids);

    const to_remove = [...this.highlighted_nodes].filter(e => nodes_to_remove.has(e.id));

    for (const nd of to_remove) {
      this.removeSelectedNode.emit(nd.id);
      this.highlighted_nodes.delete(nd);
    }

    this.updateGeometries();

    this.number_selected_nodes = this.highlighted_nodes.size;
  }

  /**
   * Remove the highlighting for all the nodes.
   */
  @Method()
  async resetHighlighting() {
    this.highlighted_nodes = new Set;
    this.number_selected_nodes = this.highlighted_nodes.size;
    this.resetSelectedNodes.emit();
    this.updateGeometries();
  }


  /* --- GRAPH DATA --- */

  /**
   * Get a `D3Node` object according to its ID.
   */
  @Method()
  async getNode(id: string) : Promise<D3Node> {
    return (this.three_d_graph.graphData() as D3GraphBase).nodes.find(e => e.id === id);
  }

  /**
   * Get `D3Link[]` objects linked to a node ID.
   */
  @Method()
  async getLinksOf(id: string) : Promise<D3Link[]> {
    return this.three_d_graph.graphData().links.filter(e => e.target.id === id || e.source.id === id);
  }

  /**
   * Remove a node from the graph.
   * 
   * Warning, with the new graph actualisation system, the graph must be reheated after the removal !
   * 
   * @param removed_nodes Remove a node according to its reference (`D3Node`), to its ID (`string`), or with a ID-Regex-matcher (`RegExp`).
   */
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

  /**
   * Register links into the `._links_to_nodes` Map.
   * 
   * Must wait that the graph is ready, so this is a async method.
   */
  protected async registerLinks() {
    const links = this.three_d_graph.graphData().links as D3Link[];

    // Actualise les links
    // DOIT attendre que la création des liens est effective
    for (const l of links) {
      if (typeof l.source.id === 'undefined') {
        await new Promise(resolve => setTimeout(resolve, 50));
        await this.registerLinks();
        return;
      }

      this._links_to_nodes.set(l.source.id, l.target.id, l);
    }
  }

  /**
   * Destroy all informations about the current graph, and send the appropriate events.
   */
  protected destroyCurrentGraph(empty_html = false) {
    this.resetSelectedNodes.emit();
    this.graphGenericRebuild.emit();
    this.highlighted_links = new Set;
    this.highlighted_nodes = new Set;
    this.history_hover_nodes = new Set;
    this.history_hover_links = new Set;

    if (empty_html) {
      const element = this.el.querySelector(`div[graph-element]`);
      element.innerHTML = "";
      this.three_d_graph = undefined;
      this._actual_data = undefined;
    }
  }

  /**
   * Register new data inside the graph, refresh it if necessary, and create it if the graph is not loaded.
   */
  set actual_data(data: D3GraphBase) {
    this.actualDataUpdate.emit({ nodeNumber: data.nodes.length, linkNumber: data.links.length });

    if (!this.actual_data) {
      this.three_d_graph.graphData(data);
      this._actual_data = data;

      this.registerLinks();
      return;
    }

    this._actual_data = data;

    const node_index = new Map<string, D3Node>();
    for (const node of this._actual_data.nodes) {
      node_index.set(node.id, node);
    } 

    // Register les groupes de façon asynchrone
    setTimeout(() => {
      for (const node of this.three_d_graph.graphData().nodes as D3Node[]) {
        if (node_index.has(node.id)) {
          node.group = node_index.get(node.id).group;
        }
      }

      this.updateGeometries();
    }, 5);

    const link_index = new Map<string, Set<string>>();
    for (const link of this._actual_data.links) {
      // @ts-ignore
      if (!link_index.has(link.target)) {
        // @ts-ignore
        link_index.set(link.target, new Set([link.source]));
      }
      else {
        // @ts-ignore
        link_index.get(link.target).add(link.source);
      }
      // @ts-ignore
      if (!link_index.has(link.source)) {
        // @ts-ignore
        link_index.set(link.source, new Set([link.target]));
      }
      else {
        // @ts-ignore
        link_index.get(link.source).add(link.target);
      }
    } 

    // Clip 
    this.clip(node_index, link_index);

    // Actualise les arbres si les infos mitab sont disponibles
    this.updateTrees();

    FrontTopology.setupUniprotData();
  }

  /** 
   * Graph nodes and links. Warning: This data may not be `D3GraphBase` complient, the nodes objects could just be strings.
   */
  get actual_data() {
    return this._actual_data;
  }

  /**
   * Graph nodes and links, with real `D3GraphBase` objets. Warning: This accessor is painful for the CPU !
   */
  get real_data() : D3GraphBase {
    // @ts-ignore
    const valid_links = new ReversibleKeyMap<string, string, null>(this.actual_data.links.map(l => [[l.source.id ? l.source.id : l.source, l.target.id ? l.target.id : l.target], null]));

    const nodes = new Set<D3Node>();
    const links = [];

    for (const l of (this.three_d_graph.graphData() as D3GraphBase).links) {
      if (valid_links.hasCouple(l.source.id, l.target.id)) {
        nodes.add(l.source);
        nodes.add(l.target);
        links.push(l);
      }
    }

    return { nodes: [...nodes], links };
  }

  /* --- GRAPH DOWNLOAD --- */

  /**
   * Universal method to download the graph in the file format you want.
   * 
   * @param file_name Filename (without extension)
   * @param type Could be "image", "JSON" or "tabular"
   */
  @Method()
  async downloadGraphAs(file_name: string, type = "image") {
    const saveFile = function (strData: string, filename: string) {
      const link = document.createElement('a');
      // Autodownload
      document.body.appendChild(link); //Firefox requires the link to be in the body
      link.download = filename;
      link.href = strData;
      link.click();
      document.body.removeChild(link); //remove the link when done

      setTimeout(() => {
        try {
          URL.revokeObjectURL(strData);
        } catch (e) { }
      }, 2000);
    }

    if (type === 'image') {
      return saveFile(this.constructImageFromGraph(), file_name + ".jpg");
    }
    else if (type === 'tabular') {
      return saveFile(URL.createObjectURL(new Blob([await this.toTabular()], {type: "text/plain"})), file_name + ".tsv");
    }
    else if (type === "JSON") {
      return saveFile(URL.createObjectURL(new Blob([await this.toJSON()], {type: "application/json"})), file_name + ".json");
    }
    else {
      throw new Error("Unknown type");
    }
  }

  /**
   * Start the download of the graph as a JPG image
   * @param image_name Filename. Could be wrapped in a CustomEvent.
   */
  @Listen('omega-download.download', { target: 'window' })
  @Method()
  async downloadGraphAsImage(image_name: string | CustomEvent = "graph") {
    if (image_name instanceof CustomEvent) {
      image_name = image_name.detail;
    }

    return this.downloadGraphAs(image_name as string, "image");
  }

  /**
   * Start the download of the graph as a JSON file
   * @param name Filename. Could be wrapped in a CustomEvent.
   */
  @Listen('omega-download.download-as-json', { target: 'window' })
  @Method()
  async downloadGraphAsJSON(name: string | CustomEvent = "graph") {
    if (name instanceof CustomEvent) {
      name = name.detail;
    }

    return this.downloadGraphAs(name as string, "JSON");
  }

  /**
   * Start the download of the graph as a tabulated file
   * @param name Filename. Could be wrapped in a CustomEvent.
   */
  @Listen('omega-download.download-as-file', { target: 'window' })
  @Method()
  async downloadGraphAsTab(name: string | CustomEvent = "graph") {
    if (name instanceof CustomEvent) {
      name = name.detail;
    }

    return this.downloadGraphAs(name as string, "tabular");
  }

  /**
   * Get a link holding a graph screenshot image.
   */
  protected constructImageFromGraph() : string {
    try {
      const strMime = "image/jpeg", strDownloadMime = "image/octet-stream";;
      const imgData = this.three_d_graph.renderer().domElement.toDataURL(strMime);

      return imgData.replace(strMime, strDownloadMime);
    } catch (e) {
        console.log(e);
        throw e;
    }
  }

  /* --- GRAPH SERIALIZATION --- */

  /**
   * Serialize graph into a string using a custom function.
   *
   * @template T
   * @param encoder 
   * Called for each link in graph, with node1 & node2 as link source and target.
   * Accumulator is undefined during the first call.
   * Return value of the function will be used as accumulator during the next function call.
   * 
   * @param [finalize_function] Optional. Called after link iteration.
   * 
   * @returns R if finalize_function is defined, string instead.
   */
  @Method()
  async serialize<T, R = string>(
    encoder: (link: D3Link, node1: D3Node, node2: D3Node, accumulator?: T) => T, 
    finalize_function?: (composed: T) => R
  ) : Promise<R | string> {
    let previous_return: T;
    const exising_links = new ReversibleKeyMap<string, string, boolean>();

    for (const link of this.actual_data.links) {
      if (typeof link.source === 'string' && typeof link.target === 'string') {
        exising_links.set(link.source, link.target, true);
      }
      else {
        exising_links.set(link.source.id, link.target.id, true);
      }
    }

    for (const link of (this.three_d_graph.graphData() as D3GraphBase).links) {
      if (exising_links.hasCouple(link.target.id, link.source.id))
        previous_return = encoder(link, link.source, link.target, previous_return);
    }

    if (finalize_function) {
      return finalize_function(previous_return);
    }

    if (typeof previous_return === 'string') {
      return previous_return;
    }
    else {
      return JSON.stringify(previous_return);
    }
  }

  /**
   * Serialize the graph to JSON (using the `.serialize()` method).
   */
  @Method()
  toJSON() : Promise<string> {
    return this.serialize(
      (link, node1, node2, acc: ExportedJSON) => {
        if (!acc) {
          acc = { 
            nodes: {}, 
            links: [], 
            misc: { 
              trim_parameters: FrontTopology.current_trim_parameters,
              prune_parameters: FrontTopology.current_prune_parameters,
              specie: this.specie
            } 
          };
        }

        acc.nodes[node1.id] = { val: node1.value, group: node1.group };
        acc.nodes[node2.id] = { val: node2.value, group: node2.group };

        acc.links.push({
          source: link.source.id,
          target: link.target.id,
          homologyInfo: link.misc
        });

        return acc;
      }
    )
  }

  /**
   * Serialize the graph to tabular data (using the `.serialize()` method).
   */
  @Method()
  toTabular() : Promise<string> {
    return this.serialize(
      (link, node1, node2, acc: string) => {
        if (!acc) {
          acc = "";
        }

        ///// Line:
        // id1  id2 identity (best of)  mitabLine

        const id1 = node1.id;
        const id2 = node2.id;
        const best_identity = Math.max(...link.misc.lowQueryParam.map(v => v.idPct));

        const lines: PSQData[] = [].concat(...link.misc.mitabCouples.map(e => e.map(d => d.data)));

        for (const line of lines) {
          acc += `${id1}\t${id2}\t${best_identity}\t` + line.toString() + "\n";
        }

        return acc;
      }
    )
  }

  /* --- STENCIL RENDER --- */

  /**
   * Graphical render.
   */
  render() {
    return (
      <div>
        <div graph-element />
        <div class={"graph-selected-nodes" + (this.in_selection ? "" : " hide")}>
          <div style={{'margin-bottom': '10px'}}>{this.number_selected_nodes} node(s) selected</div>

          <button type="button" class="btn btn-warning btn-block" onClick={() => { this.makeAPrune.emit([...this.highlighted_nodes].map(e => e.id)) }}>Prune</button>
          <button type="button" class="btn btn-dark btn-block" onClick={() => this.unselectAll()}>Unselect all</button>
        </div>
      </div>
    );
  }
} 

type ExportedJSON = { 
  nodes: { 
    [nodeId: string]: { val: number, group: number } 
  }, 
  links: { 
    source: string, target: string, homologyInfo: any 
  }[],
  misc: {
    trim_parameters: TrimOptions,
    prune_parameters: [string[], number],
    specie: string
  } 
};
