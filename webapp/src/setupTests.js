// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Declara las variables para los espías fuera de los bloques de prueba
let consoleErrorSpy;
let consoleWarnSpy;

// Almacena las implementaciones originales (ya no son estrictamente necesarias con mockRestore, pero no estorban)
// const originalConsoleError = console.error; // Ya no es necesario si usas mockRestore

beforeAll(() => {
  // 1. Guarda la referencia del espía en la variable 'consoleErrorSpy'
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => {
    // Si quieres silenciar solo en CI/test, puedes usar esta lógica:
    if (process.env.NODE_ENV !== 'test' || process.env.CI) {
        return; // Silenciar el error en la consola
    }
    // Si quieres que se imprima fuera del entorno de prueba, usa la implementación original:
    // originalConsoleError.apply(console, args);
  });
  
  // 2. Guarda la referencia del espía para 'console.warn'
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}); 
});

afterAll(() => {
  // 3. Llama a mockRestore() en las variables que contienen los espías
  consoleErrorSpy.mockRestore();
  consoleWarnSpy.mockRestore();
});