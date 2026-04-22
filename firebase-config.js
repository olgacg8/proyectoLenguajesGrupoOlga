// ====================================================================
// CONFIGURACIÓ ONLINE — Firebase Realtime Database
// ====================================================================
//
// Per activar el mode ONLINE (partits simultanis entre dispositius):
//
//  1. Ves a https://console.firebase.google.com
//  2. Crea un projecte nou → Realtime Database → Crear base de dades
//  3. Tria "Iniciar en mode de prova" (regles obertes)
//  4. Copia la URL (semblant a: https://NOM-PROJECTE-default-rtdb.firebaseio.com)
//  5. Enganxa-la tot seguit a FIREBASE_URL
//
//  Regles recomanades (Realtime Database → Regles):
//  { "rules": { ".read": true, ".write": true } }
//
//  Si FIREBASE_URL és buit → mode LOCAL (localStorage, un sol dispositiu)
// ====================================================================

window.FIREBASE_URL = ''; // ← Posa aquí la URL del teu projecte Firebase

window.ONLINE_MODE = window.FIREBASE_URL.length > 5;
