import OmegaTopology from 'omega-topology-fullstack';
import { OMEGA_TOPOLOGY_URL, SERVER_WEBSOCKET_URL, UNIPROT_URL } from './utils';
import io from 'socket.io-client';
import Timer from 'timerize';
import { D3GraphBase } from './types';

const FrontTopology = new class FrontTopology {
  protected topology: OmegaTopology;
  protected init_prom: Promise<OmegaTopology> = undefined;
  public full_ready_promise: Promise<any> = undefined;
  protected mitab_promise: Promise<OmegaTopology> = undefined;

  protected mitab_total: number;
  protected mitab_downloaded = 0;
  protected mitab_complete = false;

  protected socket: SocketIOClient.Socket;
  protected socket_promise: Promise<void> = undefined;
  protected socket_io_fail = false;

  protected current_specie: string;
  
  constructor() {
    this.configureSocket();
  }

  protected configureSocket() {
    this.socket = io(SERVER_WEBSOCKET_URL, { autoConnect: false, reconnectionAttempts: 20 });
  }

  init(specie = "R6", auto_mitab_dl = false) {
    this.resetSocketIo();

    this.topology = new OmegaTopology(undefined, undefined, UNIPROT_URL);
    // @ts-ignore
    window["topology"] = this.topology;
    
    this.mitab_total = NaN;
    this.mitab_downloaded = 0;

    this.current_specie = specie.toLocaleLowerCase();

    this.init_prom = this.topology.fromDownload(OMEGA_TOPOLOGY_URL + "/tree/" + this.current_specie)
      .then(() => { 
        this.topology.constructGraph();
        return this.topology;
      });

    const after_init = this.init_prom.then(async () => {
      Timer.default_format = "s";
      const t = new Timer;
      console.log("Downloading GO Terms...");

      try {
        await this.topo.downloadGoTerms(...this.topo.nodes.map(e => e[0]));
        console.log("Go terms downloaded in", t.elapsed);

        this.setupGoTerms();

        window.dispatchEvent(new CustomEvent('FrontTopology.go-terms-downloaded'));
      } catch (e) {
        console.error("Error while fetching GO Terms:", e);
        window.dispatchEvent(new CustomEvent('FrontTopology.go-terms-download-error', { detail: e }));

        // N'essaie pas plus: c'est le même endpoint
        return;
      }

      t.reset();

      try {
        await this.topo.downloadNeededUniprotData();
        console.log('Download complete in', t.elapsed, '.');
  
        this.setupNetworkTable();
  
        window.dispatchEvent(new CustomEvent('FrontTopology.uniprot-downloaded'));
      } catch (e) {
        console.error("Error while fetching UniProt data:", e);
        window.dispatchEvent(new CustomEvent('FrontTopology.uniprot-download-error', { detail: e }));
      }
    });

    if (auto_mitab_dl) {
      const mitab_prom = this.downloadMitabLines();
      return this.full_ready_promise = Promise.all([after_init, mitab_prom]);
    }
    else {
      this.full_ready_promise = after_init;
      return this.init_prom;
    }
  }

  protected resetSocketIo() {
    this.socket.disconnect();
    this.socket.removeAllListeners();
    this.socket_io_fail = false;

    this.mitab_promise = undefined;

    return this.socket_promise = new Promise((resolve, reject) => {
      this.socket.connect();
      this.socket.on('connect', resolve);
      this.socket.on('connect_error', () => { 
        reject(); 
        this.socket_io_fail = true; 
        window.dispatchEvent(new CustomEvent<number>('FrontTopology.mitab-download-update', { detail: null }));
      });
    });
  }

  async downloadUniprotData() {
    await this.topo.downloadGoTerms(...this.topo.nodes.map(e => e[0]));
    this.setupGoTerms();
    await this.topo.downloadNeededUniprotData();
    this.setupNetworkTable();
  }

  downloadMitabLines(reset_socket_io = false) {
    return this.mitab_promise = (reset_socket_io ? this.resetSocketIo() : this.socket_promise).then(() => {
      // récupère les pairs
      const pairs = this.topology.uniqueTemplatePairs(false);

      console.log(pairs.length, "pairs");

      // Les demande au serveur
      this.socket.emit('getlines', this.current_specie, pairs);

      Timer.default_format = "s";
      const t = new Timer;

      // Attend la réponse du serveur
      this.mitab_total = pairs.length;

      this.socket.on(this.current_specie, (lines: string[][]) => {
        this.mitab_downloaded += this.topology.read(lines);
        // Envoi l'évènement de push
        window.dispatchEvent(new CustomEvent<number>('FrontTopology.mitab-download-update', { detail: this.percentage_mitab }));
      });

      return new Promise((resolve, reject) => {
        this.socket.on('terminate', () => {
          console.log("Over download for", this.current_specie, "in", t.elapsed, "seconds");

          this.socket.close();

          
          this.mitab_complete = true;
          
          this.topology.linkMitabLines();
          
          // Résoud la promesse
          resolve(this.topology);

          // Envoie l'évènement de terminaison
          window.dispatchEvent(new CustomEvent('FrontTopology.mitab-downloaded'));
        });
        this.socket.on('error', reject);
      });
    });
  }

  protected setupGoTerms(visible_only = true) {
    // GO Chart
    const go = document.querySelector('go-chart');

    const nodes = this.topo.nodes;

    if (go) {
      // Interface d'éléments contenant { id: string, value: number (nb itérations de ID), term: string (nom) }

      const elements: { id: string, value: number, term: string }[] = [];
      const visible_nodes = new Set(nodes.map(e => e[0]));

      for (const [id, t_p] of this.topo.go_container.entries()) {
        // Recherche uniquement les visibles
        if (visible_only) {
          let i = 0;
          for (const e of t_p[1]) {
            // Rechercher si ce noeud existe dans le graphe
            if (visible_nodes.has(e)) {
              i++;
            }
          }

          if (i) {
            elements.push({
              id,
              value: i,
              term: t_p[0]
            });
          }
        }
        else {
          elements.push({
            id,
            value: t_p[1].size,
            term: t_p[0]
          });
        }
      }

      go.data = elements;
    }
  }

  protected setupNetworkTable() {
    const nodes = this.topo.nodes;

    // Network table !
    const table = document.querySelector('network-table');
    if (table) {
      // Get all visible nodes and their degree
      // Tuples constructions
      const tuples: [string, string, string][] = [];
      tuples.push(['UniProt ID', 'Gene name', 'Degree']);

      for (const [id, cmpt] of nodes) {
        tuples.push([
          id,
          this.topo.uniprot_container.getTiny(id).gene_names[0],
          cmpt.val.toString()
        ]);
      }

      table.data = tuples;
    }
  }

  /**
   * Rebuild UniProt data (with GO Chart and Network table)
   * Graph must have been constructed !!
   * @param visible_only 
   */
  setupUniprotData(visible_only = true) {
    this.setupGoTerms(visible_only);
    this.setupNetworkTable();
  }

  protected getD3GraphBaseFromOmegaTopology() {
    const nodes = this.topology.nodes;
    const links = this.topology.links;

    // @ts-ignore
    return {
      nodes: nodes.map(e => { return { id: e[0], group: e[1].group, value: e[1].val } }),
      links: links.map(l => { return { source: l[0][0], target: l[0][1], misc: l[1], value: "" } })
    } as D3GraphBase;
  }
  
  showGraph(reset = true) {
    if (reset)
      this.topology.constructGraph(true);

    const el = document.querySelector('omega-graph');

    if (el) {
      el.dispatchEvent(new CustomEvent('omega-graph-make-graph', { detail: { graph_base: this.getD3GraphBaseFromOmegaTopology() } }));
    }
  }

  resetInstance() {
    this.topology = undefined;
    this.init_prom = undefined;
    this.mitab_promise = undefined;
    this.full_ready_promise = undefined;
    this.mitab_total = undefined;
    this.mitab_downloaded = 0;
    this.mitab_complete = false;
    this.configureSocket();
    this.socket_promise = undefined;
    this.socket_io_fail = false;
    this.current_specie = undefined;
  }

  ///// CACHE
  protected _trim_cache: TrimOptions = {};
  protected _prune_cache: [string[], number];

  get current_trim_parameters() {
    return this._trim_cache;
  }

  get current_prune_parameters() {
    return this._prune_cache;
  }

  trim(options: TrimOptions = {}) {
    if (options.keep_old !== false) {
      // Récupère les données du cache
      options = Object.assign({}, this._trim_cache, options);
    } 

    // Set des valeurs par défaut
    const {
      identity = 0,
      similarity = 0,
      coverage = 0,
      experimental_detection_method = [],
      taxons = [],
      e_value = Infinity,
      definitive = false
    } = options;

    const [removed, total] = this.topology.trimEdges({
      simPct: similarity, idPct: identity, cvPct: coverage, definitive,
      exp_det_methods: experimental_detection_method, taxons, eValue: e_value
    });

    console.log(removed, "removed from total", total);

    // Sauvegarde le cache
    this._trim_cache = {
      identity, similarity, coverage, experimental_detection_method, taxons, e_value
    };

    if (options.custom_prune) {
      this.prune(...options.custom_prune); return;
    }
    else if (this._prune_cache) {
      console.log("Re-pruning")
      this.prune(...this._prune_cache); return;
    }

    this.showGraph();
  }

  prune(seeds: string[], distance = Infinity) {
    const graph = this.topology.prune(distance, ...seeds);
    
    if (graph.edgeCount() === 0) {
      console.warn("Graph does not have any edge ! Cancelling prune...");
      this._prune_cache = undefined;
      this.showGraph(true);
      return;
    }

    this._prune_cache = [seeds, distance];

    if (seeds.length === 0) {
      this._prune_cache = undefined;
    }

    this.showGraph(false);
  }

  get topo() {
    return this.topology;
  }

  get taxo_ids() {
    return this.topology.visible_taxonomy_ids_in_graph;
  }

  get onto_ids() {
    return this.topology.visible_experimental_methods_in_graph;
  }

  get awaiter() {
    return this.init_prom;
  }
  
  get percentage_mitab() {
    return (this.mitab_downloaded / this.mitab_total) * 100;
  }

  get mitab_loaded() {
    if (this.topo) {
      return this.topo.mitab_loaded;
    }

    return false;
  }
}

export default FrontTopology;
window['fronttopology'] = FrontTopology;

export interface TrimOptions {
  identity?: number,
  similarity?: number,
  coverage?: number,
  experimental_detection_method?: string[],
  taxons?: string[],
  e_value?: number,
  definitive?: boolean,
  keep_old?: boolean,
  custom_prune?: [string[], number]
}
