

        const NODOS = [
            // Director General
            { id: 1, nombre: 'Jorge Recillas', puesto: 'Director General', area: 'TI', email: 'jorge@cn.mx', jefeId: null, foto: '' },

            // Directores
            { id: 10, nombre: 'Jeronimo', puesto: 'Director', area: 'Base de datos', email: 'jeronimo@cn.mx', jefeId: 1, foto: '' },
            { id: 20, nombre: 'Paco', puesto: 'Director', area: 'Desarrollo', email: 'paco@cn.mx', jefeId: 1, foto: '' },
            { id: 30, nombre: 'Talia', puesto: 'Director', area: 'T', email: 'talia@cn.mx', jefeId: 1, foto: '' },
            { id: 40, nombre: 'Dani', puesto: 'Director', area: 'Infraestructura', email: 'dani@cn.mx', jefeId: 1, foto: '' },
            { id: 50, nombre: 'Hector', puesto: 'Director', area: 'Operaciones', email: 'hector@cn.mx', jefeId: 1, foto: '' },

            // Subdirectores
            { id: 11, nombre: 'Uriel', puesto: 'Subdirector', area: 'Base de datos', email: 'uriel@cn.mx', jefeId: 10, foto: '' },
            { id: 21, nombre: 'Hernan', puesto: 'Subdirector', area: 'Desarrollo', email: 'hernan@cn.mx', jefeId: 20, foto: '' },
            { id: 31, nombre: 'Antonio', puesto: 'Subdirector', area: 'T', email: 'antonio@cn.mx', jefeId: 30, foto: '' },
            { id: 34, nombre: 'Alfredo', puesto: 'Subdirector', area: 'T', email: 'alfredo@cn.mx', jefeId: 30, foto: '' },
            { id: 41, nombre: 'Vite', puesto: 'Subdirector', area: 'Infraestructura', email: 'vite@cn.mx', jefeId: 40, foto: '' },
            { id: 51, nombre: 'Marlene', puesto: 'Subdirector', area: 'T', email: 'marlene@cn.mx', jefeId: 30, foto: '' },

            // Jefaturas
            { id: 12, nombre: 'Fani', puesto: 'Jefe', area: 'Base de datos', email: 'fani@cn.mx', jefeId: 11, foto: '' },
            { id: 22, nombre: 'Jose', puesto: 'Jefe', area: 'Desarrollo', email: 'jose@cn.mx', jefeId: 21, foto: '' },
            { id: 32, nombre: 'Gabo', puesto: 'Jefe', area: 'T', email: 'gabo@cn.mx', jefeId: 31, foto: '' },
            { id: 35, nombre: 'Jefatura TI 2', puesto: 'Jefe', area: 'T', email: 'jti2@cn.mx', jefeId: 34, foto: '' },
            { id: 42, nombre: 'Juanjo', puesto: 'Jefe', area: 'Infraestructura', email: 'juanjo@cn.mx', jefeId: 41, foto: '' },
            { id: 52, nombre: 'Ale', puesto: 'Jefe', area: 'Operaciones', email: 'ale@cn.mx', jefeId: 50, foto: '' },

            // Enlaces
            { id: 13, nombre: 'Enlace BD', puesto: 'Enlace', area: 'Base de datos', email: 'enlace.bd@cn.mx', jefeId: 12, foto: '' },
            { id: 23, nombre: 'Juan', puesto: 'Enlace', area: 'Desarrollo', email: 'juan@cn.mx', jefeId: 22, foto: '' },
            { id: 33, nombre: 'Fernando', puesto: 'Enlace', area: 'T', email: 'fernando@cn.mx', jefeId: 32, foto: '' },
            { id: 36, nombre: 'Enlace TI 2', puesto: 'Enlace', area: 'T', email: 'enlace.ti2@cn.mx', jefeId: 35, foto: '' },
            { id: 43, nombre: 'Enlace Infra', puesto: 'Enlace', area: 'Infraestructura', email: 'enlace.infra@cn.mx', jefeId: 42, foto: '' },
            { id: 53, nombre: 'Gus', puesto: 'Enlace', area: 'Operaciones', email: 'gus@cn.mx', jefeId: 52, foto: '' },
            { id: 54, nombre: 'Clemente', puesto: 'Enlace', area: 'Operaciones', email: 'clemente@cn.mx', jefeId: 52, foto: '' },
        ];

        // Exponer global 
        window.__NODOS__ = NODOS;