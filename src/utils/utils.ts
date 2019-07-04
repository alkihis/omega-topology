export const SERVER_WEBSOCKET_URL = "http://localhost:3456";
export const OMEGA_TOPOLOGY_URL = 'http://localhost:3455';
export const TAXONOMY_URL = 'http://localhost:3278';
export const ONTOLOGY_URL = 'http://localhost:3279';

export const BASE_IDENTITY = "35";
export const BASE_SIMILARITY = "75";
export const BASE_COVERAGE = "20";
export const BASE_E_VALUE = "3"; // 10^-x

export function format(first: string, middle: string, last: string): string {
  return (
    (first || '') +
    (middle ? ` ${middle}` : '') +
    (last ? ` ${last}` : '')
  );
}

