import type { Conversation } from './types';

const LS_KEY = 'wca_convs_v1';

function lsAll(): Conversation[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]') || [];
  } catch {
    return [];
  }
}

function lsSave(a: Conversation[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(a));
  } catch {
    /* ignore */
  }
}

class ConvDBImpl {
  private idb: IDBDatabase | null = null;
  private useLS = false;

  init(): Promise<void> {
    return new Promise((res) => {
      try {
        if (!('indexedDB' in window)) {
          this.useLS = true;
          res();
          return;
        }
        const q = indexedDB.open('webchatai', 1);
        q.onupgradeneeded = () => {
          q.result.createObjectStore('convs', { keyPath: 'id' });
        };
        q.onsuccess = () => {
          this.idb = q.result;
          res();
        };
        q.onerror = () => {
          this.useLS = true;
          res();
        };
        q.onblocked = () => {
          this.useLS = true;
          res();
        };
      } catch {
        this.useLS = true;
        res();
      }
    });
  }

  all(): Promise<Conversation[]> {
    if (this.useLS || !this.idb) return Promise.resolve(lsAll());
    return new Promise((res) => {
      try {
        const tx = this.idb!.transaction('convs', 'readonly');
        const rq = tx.objectStore('convs').getAll();
        rq.onsuccess = () => res((rq.result as Conversation[]) || []);
        rq.onerror = () => res(lsAll());
      } catch {
        res(lsAll());
      }
    });
  }

  put(c: Conversation): Promise<void> {
    if (this.useLS || !this.idb) {
      const a = lsAll().filter((x) => x.id !== c.id);
      a.unshift(c);
      lsSave(a);
      return Promise.resolve();
    }
    return new Promise((res) => {
      try {
        const tx = this.idb!.transaction('convs', 'readwrite');
        tx.objectStore('convs').put(c);
        tx.oncomplete = () => res();
        tx.onerror = () => res();
      } catch {
        res();
      }
    });
  }

  del(id: string): Promise<void> {
    if (this.useLS || !this.idb) {
      lsSave(lsAll().filter((x) => x.id !== id));
      return Promise.resolve();
    }
    return new Promise((res) => {
      try {
        const tx = this.idb!.transaction('convs', 'readwrite');
        tx.objectStore('convs').delete(id);
        tx.oncomplete = () => res();
        tx.onerror = () => res();
      } catch {
        res();
      }
    });
  }

  clear(): Promise<void> {
    if (this.useLS || !this.idb) {
      lsSave([]);
      return Promise.resolve();
    }
    return new Promise((res) => {
      try {
        const tx = this.idb!.transaction('convs', 'readwrite');
        tx.objectStore('convs').clear();
        tx.oncomplete = () => res();
        tx.onerror = () => res();
      } catch {
        res();
      }
    });
  }
}

export const db = new ConvDBImpl();
