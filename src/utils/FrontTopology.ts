import OmegaTopology from 'omega-topology-fullstack';
import { OMEGA_TOPOLOGY_URL, SERVER_WEBSOCKET_URL, UNIPROT_URL, SERVER_WEB_SOCKET_PREPEND } from './utils';
import io from 'socket.io-client';
import Timer from 'timerize';
import { D3GraphBase } from './types';

/**
 * FrontTopology administrate the OmegaTopology object.
 * 
 * Used when accessing to the interolog network data, to produce a new graph, 
 * to do actions to the graph like trimming and pruning, refresh components data
 * like ontology tree, or download informations like MI Tab data automatically.
 */
const FrontTopology = new class FrontTopology {
  /* --- PROPERTIES --- */

  /**
   * OmegaTopology object. Can be changed when the specie change.
   */
  protected topology: OmegaTopology;
  /** Promise indicating when graph skeleton is ready */
  protected init_prom: Promise<OmegaTopology> = undefined;
  /** Promise indicating when graph skeleton, uniprot data and mitab data are ready */
  public full_ready_promise: Promise<any> = undefined;
  /** Promise indicating when mitab data skeleton is ready */
  protected mitab_promise: Promise<OmegaTopology> = undefined;

  /** Mitab expected download size */
  protected mitab_total: number;
  /** Downloaded mitab lines */
  protected mitab_downloaded = 0;
  /** True if mitab is downloaded */
  protected mitab_complete = false;

  /** Socket.io instance for dialogue with omega-topology-mitab-service */
  protected socket: SocketIOClient.Socket;
  /** Promise resolving when Socket.io connection is etablished. */
  protected socket_promise: Promise<void> = undefined;
  /** True if the connection to Socket.io service can not be etablished. */
  protected socket_io_fail = false;

  /** Current specie name. */
  protected current_specie: string;

  /** 
   * Trimming parameters cache. Store previously set parameters and apply them during the next `.trim()`.
   */
  protected _trim_cache: TrimOptions = {};
  /**
   * Prune parameters cache. Store previoulsy set parameters and apply them if a new `.trim()` is asked (by default, a trim erase a prune).
   */
  protected _prune_cache: [string[], number];

  /* --- METHODS --- */

  /* -- INITALIZATION -- */
  
  /**
   * Construct a new FrontTopology object and auto configure Socket.io instance
   */
  constructor() {
    this.configureSocket();
  }

  /**
   * Initialize the FrontTopology object for the desired specie.
   * 
   * If you want to change current specie, just re-call this method with the new specie name.
   * 
   * @param specie Specie name to load
   * @param auto_mitab_dl True if the MI Tab data download should automatically begin. 
   * If not, you must use `.downloadMitabLines()` in order to start download.
   */
  init(specie = "R6", auto_mitab_dl = false) {
    // Reset all socket connection, in case of the mitab was already in download
    this.resetSocketIo();

    // Instanciate new Omegatopology instance
    this.topology = new OmegaTopology(undefined, undefined, UNIPROT_URL);
    // @ts-ignore
    window["topology"] = this.topology;
    
    // Reset counters
    this.mitab_total = NaN;
    this.mitab_downloaded = 0;

    // Register current specie
    this.current_specie = specie.toLocaleLowerCase();

    // Initialize the skeleton with fromDownload
    this.init_prom = this.topology.fromDownload(OMEGA_TOPOLOGY_URL + "/tree/" + this.current_specie)
      .then(() => { 
        this.topology.constructGraph();
        return this.topology;
      });

    // Initalize the GO terms then the uniprot data
    const after_init = this.init_prom.then(async () => {
      Timer.default_format = "s";
      const t = new Timer;
      console.log("Downloading GO Terms...");

      try {
        // Download in the Container
        await this.topo.downloadGoTerms(...this.topo.nodes.map(e => e[0]));
        console.log("Go terms downloaded in", t.elapsed);

        // Automatic setup (with go-chart setup)
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
        // Download in the container
        await this.topo.downloadNeededUniprotData();
        console.log('Download complete in', t.elapsed, '.');
  
        // Setup network-table
        this.setupNetworkTable();
  
        window.dispatchEvent(new CustomEvent('FrontTopology.uniprot-downloaded'));
      } catch (e) {
        console.error("Error while fetching UniProt data:", e);
        window.dispatchEvent(new CustomEvent('FrontTopology.uniprot-download-error', { detail: e }));
      }
    });

    // Start auto download if wanted
    if (auto_mitab_dl) {
      const mitab_prom = this.downloadMitabLines();
      return this.full_ready_promise = Promise.all([after_init, mitab_prom]);
    }
    else {
      this.full_ready_promise = after_init;
      return this.init_prom;
    }
  }

  /**
   * Completely reset the instance. Recommanded before a new `.init()`.
   */
  resetInstance() {
    this.topology = undefined;
    this.init_prom = undefined;
    this.mitab_promise = undefined;
    this.full_ready_promise = undefined;
    this.mitab_total = undefined;
    this.mitab_downloaded = 0;
    this.mitab_complete = false;
    this.resetSocketIo(false);
    this.configureSocket();
    this.socket_promise = undefined;
    this.socket_io_fail = false;
    this.current_specie = undefined;
  }

  /* -- SOCKET.IO -- */

  /** Auto configure the Socket.io instance. */
  protected configureSocket() {
    this.socket = io(SERVER_WEBSOCKET_URL, { autoConnect: false, reconnectionAttempts: 20, path: SERVER_WEB_SOCKET_PREPEND + '/socket.io' });
  }

  /**
   * Reset the Socket.io connection and disconnect all.
   */
  protected resetSocketIo(auto_reconnect = true) {
    this.socket.disconnect();
    this.socket.removeAllListeners();
    this.socket_io_fail = false;

    this.mitab_promise = undefined;

    if (auto_reconnect) {
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
    else {
      return undefined;
    }
  }

  /* -- UNIPROT DATA -- */

  /**
   * Automatic download all the UniProt data (GO terms + Protein infos) and setup the components go-chart and network-table.
   */
  async downloadUniprotData() {
    await this.topo.downloadGoTerms(...this.topo.nodes.map(e => e[0]));
    this.setupGoTerms();
    await this.topo.downloadNeededUniprotData();
    this.setupNetworkTable();
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


  /**
   * Automatic setup for go-chart (format GO terms to the go-chart data entry then load).
   * @param visible_only Visible nodes only.
   */
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

  /**
   * Automatic setup for network-table (format nodes and UniProt gene names to the network-table format then load).
   */
  protected setupNetworkTable() {
    const nodes = this.topo.nodes;

    // Network table !
    const table = document.querySelector('network-table');
    if (table) {
      // Get all visible nodes and their degree
      // Tuples constructions
      const tuples: [string, string, string][] = [];
      tuples.push(['UniProt ID', 'Gene name', 'Degree']);

      const to_fetch = [];

      for (const [id, cmpt] of nodes) {
        const uni_info = this.topo.uniprot_container.getTiny(id);

        // Lance une récup
        if (!uni_info) 
          to_fetch.push(id);

        tuples.push([
          id,
          uni_info ? uni_info.gene_names[0] : "None",
          cmpt.val.toString()
        ]);
      }

      if (to_fetch.length)
        this.topo.uniprot_container.bulkTiny(...to_fetch);

      table.data = tuples;
    }
  }

  /* -- INTERACTION DATA - MI TAB -- */

  /**
   * Download the required MI Tab lines, load them into the PSICQuic container, then register them into HoParameterSets.
   * @param reset_socket_io True if you want to reset Socket.io instance (f.e. if the download has already failed)
   */
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

  /* -- GRAPH MANIPULATION -- */

  /**
   * Reconstruct the internal interolog graph, compute nodes and links data, then trigger a graph update.
   * 
   * @param reset If the interolog graph needs a reconstruct (`false` after a prune !)
   */
  showGraph(reset = true) {
    if (reset)
      this.topology.constructGraph(true);

    const el = document.querySelector('omega-graph');

    if (el) {
      el.dispatchEvent(new CustomEvent('omega-graph.make-graph', { detail: { graph_base: this.getD3GraphBaseFromOmegaTopology() } }));
    }
  }

  /**
   * Trim the current graph using `OmegaTopology`'s `.trimEdges()`.
   * 
   * This method will automatically apply old non-specified trimming parameters,
   * unless you specify `keep_old = false` inside the `options` object.
   * 
   * If one trim option does not exists in your `options` object, and is not present in the
   * old saved parameters, the automatic default setting will be applied.
   * 
   * Default settings for each parameters are:
   * `identity = 0, similarity = 0, coverage = 0, experimental_detection_method = [], taxons = [], e_value = Infinity, definitive = false`
   * 
   * @param options Trimming options. See `TrimOptions` interface.
   */
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

    // Sauvegarde le cache si skip_save === false ou si il n'est pas défini
    if (!options.skip_save) {
      this._trim_cache = {
        identity, similarity, coverage, experimental_detection_method, taxons, e_value
      };
    }

    if (options.custom_prune) {
      this.prune(...options.custom_prune); return;
    }
    else if (this._prune_cache) {
      console.log("Re-pruning")
      this.prune(...this._prune_cache); return;
    }

    this.showGraph();
  }

  /**
   * Prune the current graph using `OmegaTopology`'s `.prune()`.
   * 
   * @param seeds Protein IDs to define as graph seeds
   * @param distance Maximum visible distance from seeds
   */
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

  /**
   * Generate 3DGraph `.graphData()` compatible data from the current `OmegaTopology` graph.
   */
  protected getD3GraphBaseFromOmegaTopology() {
    const nodes = this.topology.nodes;
    const links = this.topology.links;

    // @ts-ignore
    return {
      nodes: nodes.map(e => { return { id: e[0], group: e[1].group, value: e[1].val } }),
      links: links.map(l => { return { source: l[0][0], target: l[0][1], misc: l[1], value: "" } })
    } as D3GraphBase;
  }

  /* -- ACCESSORS -- */

  /**
   * Trimming parameters used in the previous `.trim()` call.
   */
  get current_trim_parameters() {
    return this._trim_cache;
  }

  /**
   * Prune parameters used in the previous `.prune()` or `.trim()` call.
   */
  get current_prune_parameters() {
    return this._prune_cache;
  }

  /** Internal OmegaTopology object */
  get topo() {
    return this.topology;
  }

  /** Internal PSICQuic container */
  get psi() {
    return this.topology.psi;
  }

  /** Taxonomic IDs inside the graph */
  get taxo_ids() {
    return this.topology.visible_taxonomy_ids_in_graph;
  }

  /** MI IDs inside the graph */
  get onto_ids() {
    return this.topology.visible_experimental_methods_in_graph;
  }

  get awaiter() {
    return this.init_prom;
  }
  
  /** MI Tab download percentage */
  get percentage_mitab() {
    return (this.mitab_downloaded / this.mitab_total) * 100;
  }

  /** True if the MI Tab data are loaded */
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
  /** Sequence identity percentage. */
  identity?: number,
  /** Sequence similarity percentage. */
  similarity?: number,
  /** Sequence coverage percentage. */
  coverage?: number,
  /** Authorized interaction detection method. Empty array mean all the methods are authorized. */
  experimental_detection_method?: string[],
  /** Authorized taxons. Empty array mean all the taxons are authorized. */
  taxons?: string[],
  /** Maximum e-value for homology. */
  e_value?: number,
  /** Determine if the trim will remove permanently invalid nodes from the network. */
  definitive?: boolean,
  /** False mean that the old saved trimming parameters will be ignored. */
  keep_old?: boolean,
  /** Specify here prune parameters if you want to prune the network after the trim. */
  custom_prune?: [string[], number],
  /** If true, the trim parameters for this call will not be saved. */
  skip_save?: boolean
}
