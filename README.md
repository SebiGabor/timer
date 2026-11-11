# Tact — Cronometru Silențios de Curs (PWA)

**Tact** este o aplicație web progresivă (PWA) gândită special pentru profesori și speakeri care vor să respecte bugetul de timp în sala de curs, fără alarme sonore și fără distrageri.

## Funcționalități cheie
- **100% Silențios:** zero sunete. Feedback vizual periferic (Verde → Galben → Portocaliu → Puls Roșu în depășire `+MM:SS`) și vibrații opționale (oprite implicit pentru catedrele de lemn).
- **Rețete de timp reutilizabile:** definești porțiuni consecutive cu titlu, categorie, durată exactă și memento discret (*cue note*), cu calcul live al duratei totale și al bugetului țintă.
- **Telemetrie anti-depășire în timpul cursului:**
  - Bară de progres pentru secțiunea curentă + **Timeline segmentat** pentru întreg cursul.
  - Card **„Urmează”** cu etapa următoare și durata ei.
  - **Ora estimată de final** + diferență față de plan (`+3m întârziere` / `-1m avans`).
  - **„Ajustează restul”:** comprimă proporțional secțiunile viitoare (doar în sesiunea curentă) pentru a termina la timp.
  - **Wake Lock** (ecran mereu treaz) + **Blocare tactică** (anti-atingere accidentală).
- **Local-First & Offline-Ready:** funcționează instant fără internet; sincronizare opțională multi-device cu **Turso (libSQL)** și deploy automat pe **GitHub Pages**.

## Pornire rapidă

```bash
npm install
npm run dev
```

Pentru instrucțiunile complete pas cu pas (local, Turso, GitHub Pages și instalare pe telefon), vezi **`GHID_CONFIGURARE.md`**.
