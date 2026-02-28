/**
 * AgentSpark Database Management (IndexedDB)
 */
import { state } from './state.js';
import { DB_NAME, DB_VERSION, STORE_NAME } from './constants.js';

/**
 * Open IndexedDB database
 */
export function dbOpen() {
    return new Promise((resolve, reject) => {
        if (state.db) { resolve(state.db); return; }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
        };
        req.onsuccess = e => {
            state.db = e.target.result;
            resolve(state.db);
        };
        req.onerror = e => reject(e.target.error);
    });
}

/**
 * Get all projects from the database, newest first
 */
export async function dbGetAll() {
    const db = await dbOpen();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).index('updatedAt').getAll();
        req.onsuccess = e => resolve(e.target.result.reverse());
        req.onerror = e => reject(e.target.error);
    });
}

/**
 * Get a specific project by id
 */
export async function dbGet(id) {
    const db = await dbOpen();
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

/**
 * Store or update a project
 */
export async function dbPut(project) {
    const db = await dbOpen();
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(project);
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = e => reject(e.target.error);
    });
}

/**
 * Delete a project by id
 */
export async function dbDelete(id) {
    const db = await dbOpen();
    return new Promise((resolve, reject) => {
        const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
        req.onsuccess = e => resolve();
        req.onerror = e => reject(e.target.error);
    });
}
