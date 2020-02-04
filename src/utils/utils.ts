
export const DEV_MODE = true;
export const WEBSERVER_ROOT_URL = DEV_MODE ? "http://localhost" : "";

export const SERVER_WEBSOCKET_URL = WEBSERVER_ROOT_URL + (DEV_MODE ? ":3456" : "");
export const OMEGA_TOPOLOGY_URL = WEBSERVER_ROOT_URL + (DEV_MODE ? ":3455" : '/service');
export const TAXONOMY_URL = WEBSERVER_ROOT_URL + (DEV_MODE ? ":3278" : '/taxonomy');
export const ONTOLOGY_URL = WEBSERVER_ROOT_URL + (DEV_MODE ? ":3279" : '/ontology');
export const UNIPROT_URL = WEBSERVER_ROOT_URL + (DEV_MODE ? ":3289" : '/uniprot');
// export const SERVER_WEB_SOCKET_PREPEND = DEV_MODE ? '' : '/mitab_data';
export const SERVER_WEB_SOCKET_PREPEND = "";

export const BASE_FIXES = {
    identity: "25",
    coverage: "30",
    similarity: "32"
};

