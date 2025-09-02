const DB_NAME = 'lab_management_db';
const DB_VERSION = 2; // Use a higher version number if you change the schema
const OBJECT_STORE_NAMES = ['computers', 'software', 'suppliers', 'users', 'roles', 'permissions', 'role_permissions'];

let db;

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            OBJECT_STORE_NAMES.forEach(storeName => {
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                }
            });
            console.log('IndexedDB upgrade complete.');
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('IndexedDB opened successfully.');
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

function addData(storeName, data) {
    return new Promise(async (resolve, reject) => {
        if (!db) {
            await openDatabase();
        }
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            console.error(`Error adding data to ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

function getData(storeName, id) {
    return new Promise(async (resolve, reject) => {
        if (!db) {
            await openDatabase();
        }
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            console.error(`Error getting data from ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

function getAllData(storeName) {
    return new Promise(async (resolve, reject) => {
        if (!db) {
            await openDatabase();
        }
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            console.error(`Error getting all data from ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

function updateData(storeName, data) {
    return new Promise(async (resolve, reject) => {
        if (!db) {
            await openDatabase();
        }
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data); // put() updates if key exists, adds if not

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            console.error(`Error updating data in ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

function deleteData(storeName, id) {
    return new Promise(async (resolve, reject) => {
        if (!db) {
            await openDatabase();
        }
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            console.error(`Error deleting data from ${storeName}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

// Initialize the database when the script loads
openDatabase();

export { openDatabase, addData, getData, getAllData, updateData, deleteData };