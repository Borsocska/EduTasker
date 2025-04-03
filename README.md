Telepítési és Indítási Lépések
Előfeltételek
Az oldal megjelenítéséhez, és a legfontosabb, a működéséhez el kell végeznünk pár alaplépést. El kell indítani a szervert, és magát az oldalt
Node.js és npm: Telepítsd a Node.js‑t (ajánlott legalább 14-es verzió, de 16+ jobb) és az npm‑t. Ezeket megtehetjük az npm i paranccsal.
MySQL: Győződj meg róla, hogy a MySQL szerver fut és hozzáférhető, mivel az adatbázis ezt fogja használni.
Kódszerkesztő: Ajánlott VS Code vagy hasonló modern szerkesztő használata a fejlesztéshez.

 Lépések:
Nyisd meg a MySQL adatbázis kezelőt, és a projekt mappából a “db” almappából importáld a szükséges adatbázist.
A frontend mappából, cmd-vel el kell indítani magát az oldalt, ehhez a parancs:
npm run dev
A backend mappában pedig a szervert kell:
 npm i, npm start
