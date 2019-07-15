export class TermsCache {
    constructor(
        protected url: string
    ) { }

    protected cache: { [id: string]: string } = {};

    protected async fetchTerm(id: string | string[], timeout = 15000) {
        const abort = new AbortController;

        const t = setTimeout(() => {
            abort.abort();
        }, timeout);

        return fetch(this.url + "/term", {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ term: id }),
            signal: abort.signal,
            method: 'POST'
        }).then(r => {
            clearTimeout(t);
            return r;
        }).then(r => r.ok ? r.json() : r.json().then(t => Promise.reject(t)));
    }

    async getTerm(id: string) {
        if (id in this.cache) {
            return this.cache[id];
        }

        try {
            const terms = await this.fetchTerm(id);
            if (terms.terms[id]) {
                this.cache[id] = terms.terms[id];
                return terms[id];
            }
        } catch (e) { }

        return undefined;
    }

    async bulkTerm(id: string[]) {
        const ids_to_fetch = [];
        const ids_ok = {};

        for (const i of id) {
            if (i in this.cache) {
                ids_ok[i] = this.cache[i];
            }
            else {
                ids_to_fetch.push(i);
            }
        }

        if (ids_to_fetch.length) {
            try {
                const terms = await this.fetchTerm(ids_to_fetch);
    
                for (const [term_id, term_val] of Object.entries(terms.terms) as [string, string][]) {
                    this.cache[term_id] = term_val;
                    ids_ok[term_id] = term_val;
                }
            } catch (e) { console.warn(e) }
        }

        return ids_ok;
    }
}