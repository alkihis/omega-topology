import OmegaTopology from 'omega-topology-fullstack';
import { OMEGA_TOPOLOGY_URL, SERVER_WEBSOCKET_URL } from './utils';
import io from 'socket.io-client';
import Timer from 'timerize';
import { D3GraphBase } from './types';

const FrontTopology = new class FrontTopology {
  protected topology: OmegaTopology;
  protected init_prom: Promise<OmegaTopology> = undefined;
  protected mitab_promise: Promise<OmegaTopology> = undefined;

  protected mitab_total: number;
  protected mitab_downloaded = 0;

  protected socket: SocketIOClient.Socket;
  protected socket_promise: Promise<void> = undefined;

  protected current_specie: string;
  
  constructor() {
    this.socket = io(SERVER_WEBSOCKET_URL, { autoConnect: false, reconnectionAttempts: 20 });
  }

  init(specie = "R6", auto_mitab_dl = false) {
    this.resetSocketIo();

    this.topology = new OmegaTopology;
    // @ts-ignore
    window["topology"] = this.topology;
    
    this.mitab_total = NaN;
    this.mitab_downloaded = 0;

    this.current_specie = specie.toLocaleLowerCase();

    this.init_prom = this.topology.fromDownload(OMEGA_TOPOLOGY_URL + "/tree/" + this.current_specie)
      .then(() => { 
        this.topology.constructGraphFrom([]);
        return this.topology;
      });

    if (auto_mitab_dl) {
      return this.downloadMitabLines();
    }
    else {
      return this.init_prom;
    }
  }

  protected resetSocketIo() {
    this.socket.disconnect();
    console.log("Resetted listeners");
    this.socket.removeAllListeners();

    this.mitab_promise = undefined;

    return this.socket_promise = new Promise((resolve, reject) => {
      this.socket.connect();
      this.socket.on('connect', resolve);
      this.socket.on('reconnected_failed', reject);
    });
  }

  downloadMitabLines() {
    return this.mitab_promise = this.socket_promise.then(() => {
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
      });

      return new Promise((resolve, reject) => {
        this.socket.on('terminate', () => {
          console.log("Over download for", this.current_specie, "in", t.elapsed, "seconds");

          this.socket.close();

          this.topology.linkMitabLines();

          resolve(this.topology);
        });
        this.socket.on('error', reject);
      });
    });
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
  
  showGraph() {
    this.topology.constructGraphFrom([]);

    const el = document.querySelector('omega-graph');

    if (el) {
      el.dispatchEvent(new CustomEvent('omega-graph-make-graph', { detail: { graph_base: this.getD3GraphBaseFromOmegaTopology() } }));
    }
  }

  trim({
    identity = 0,
    similarity = 0,
    coverage = 0,
    experimental_detection_method = [],
    taxons = [],
    e_value = Infinity,
    definitive = false
  } = {}) {
    const [removed, total] = this.topology.trimEdges({
      simPct: similarity, idPct: identity, cvPct: coverage, definitive,
      exp_det_methods: experimental_detection_method, taxons, eValue: e_value
    });

    console.log(removed, "removed from total", total);

    this.showGraph();
  }

  get topo() {
    return this.topology;
  }

  get awaiter() {
    return this.init_prom;
  }
  
  get percentage_mitab() {
    return (this.mitab_downloaded / this.mitab_total) * 100;
  }
}

export default FrontTopology;
window['fronttopology'] = FrontTopology;
