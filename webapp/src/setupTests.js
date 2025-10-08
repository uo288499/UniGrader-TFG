// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Almacena las implementaciones originales de console.error y console.warn
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Antes de cada prueba (o antes de que se ejecuten todas las pruebas),
// reemplaza console.error y console.warn con funciones que espían pero no imprimen.
beforeAll(() => {
  // Jest.spyOn permite espiar la función para hacerle un 'expect',
  // pero mockImplementation la reemplaza con una función vacía que no imprime en la consola.
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    // Si quieres silenciar solo los errores específicos de 'act', puedes añadir una condición:
    // if (typeof args[0] === 'string' && args[0].includes('not wrapped in act')) return;

    // Si quieres silenciar TODOS, simplemente devuelve:
    // return;
    
    // Si quieres ver los console.error durante el desarrollo, pero no en el CI, puedes usar:
    if (process.env.NODE_ENV !== 'test' || process.env.CI) {
        return; // Silenciar solo en CI/test
    }
    
    // De lo contrario, imprime el error original:
    originalConsoleError.apply(console, args);
  });
  
  // Puedes hacer lo mismo para console.warn (para los errores de MUI/i18next):
  jest.spyOn(console, 'warn').mockImplementation(() => {}); 
});

// Después de que todas las pruebas se hayan ejecutado, restaura las implementaciones originales.
afterAll(() => {
  console.error.mockRestore();
  console.warn.mockRestore();
});