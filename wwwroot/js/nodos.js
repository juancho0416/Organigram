

        const NODOS = [
            // Director General
            { id: 1, nombre: 'Jorge Recillas', puesto: 'Director General', area: 'TI', email: 'jorge@cne.gob.mx', jefeId: null, foto: '' },

            // Directores
            { id: 10, nombre: 'Jeronimo', puesto: 'Director', area: 'Base de datos', email: 'jeronimo@cne.mx', jefeId: 1, foto: '' },
            { id: 20, nombre: 'Paco', puesto: 'Director', area: 'Desarrollo', email: 'paco@cne.gob.mx', jefeId: 1, foto: '' },
            { id: 30, nombre: 'Talia', puesto: 'Director', area: 'T', email: 'talia@cne.mx', jefeId: 1, foto: '' },
            { id: 40, nombre: 'Dani', puesto: 'Director', area: 'Infraestructura', email: 'dani@cne.gob.mx', jefeId: 1, foto: '' },
            { id: 50, nombre: 'Hector', puesto: 'Director', area: 'Operaciones', email: 'hector@cne.gob.mx', jefeId: 1, foto: '' },

            // Subdirectores
            { id: 11, nombre: 'Uriel', puesto: 'Subdirector', area: 'Base de datos', email: 'uriel@cne.gob.mx', jefeId: 10, foto: '' },
            { id: 21, nombre: 'Hernan', puesto: 'Subdirector', area: 'Desarrollo', email: 'hernan@cne.gob.mx', jefeId: 20, foto: '' },
            { id: 31, nombre: 'Antonio', puesto: 'Subdirector', area: 'T', email: 'antonio@cne.gob.mx', jefeId: 30, foto: '' },
            { id: 34, nombre: 'Alfredo', puesto: 'Subdirector', area: 'T', email: 'alfredo@cne.gob.mx', jefeId: 30, foto: '' },
            { id: 41, nombre: 'Vite', puesto: 'Subdirector', area: 'Infraestructura', email: 'vite@cne.gob.mx', jefeId: 40, foto: '' },
            { id: 51, nombre: 'Marlene', puesto: 'Subdirector', area: 'T', email: 'marlene@cne.gob.mx', jefeId: 30, foto: '' },
            
            // Jefaturas
            { id: 12, nombre: 'Fani', puesto: 'Jefe', area: 'Base de datos', email: 'fani@cne.gob.mx', jefeId: 11, foto: '' },
            { id: 22, nombre: 'Jose', puesto: 'Jefe', area: 'Desarrollo', email: 'jose@cne.gob.mx', jefeId: 21, foto: '' },
            { id: 32, nombre: 'Gabo', puesto: 'Jefe', area: 'T', email: 'gabo@cne.gob.mx', jefeId: 31, foto: '' },
            { id: 42, nombre: 'Juanjo', puesto: 'Jefe', area: 'Infraestructura', email: 'juanjo@cne.gob.mx', jefeId: 41, foto: '' },
            { id: 52, nombre: 'Ale', puesto: 'Jefe', area: 'Operaciones', email: 'ale@cne.gob.mx', jefeId: 50, foto: '' },

            // Enlaces
            { id: 23, nombre: 'Juan', puesto: 'Enlace', area: 'Desarrollo', email: 'juan@cne.gob.mx', jefeId: 22, foto: '' },
            { id: 33, nombre: 'Fernando', puesto: 'Enlace', area: 'T', email: 'fernando@cne.gob.mx', jefeId: 34, foto: '' },
            { id: 53, nombre: 'Gus', puesto: 'Enlace', area: 'Operaciones', email: 'gus@cne.gob.mx', jefeId: 52, foto: '' },
            { id: 54, nombre: 'Clemente', puesto: 'Enlace', area: 'Operaciones', email: 'clemente@cne.gob.mx', jefeId: 52, foto: '' },
        ];

        // Exponer global 
        window.__NODOS__ = NODOS;