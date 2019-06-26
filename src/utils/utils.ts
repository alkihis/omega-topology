export const SERVER_WEBSOCKET_URL = "http://localhost:3456";
export const OMEGA_TOPOLOGY_URL = 'http://localhost:3455';

export const BASE_IDENTITY = "30";
export const BASE_SIMILARITY = "40";
export const BASE_COVERAGE = "20";
export const BASE_E_VALUE = "0.001";

export function format(first: string, middle: string, last: string): string {
  return (
    (first || '') +
    (middle ? ` ${middle}` : '') +
    (last ? ` ${last}` : '')
  );
}

