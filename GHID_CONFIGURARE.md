# Ghid Complet de Configurare & Deploy — Tact PWA

Acest ghid acoperă tot procesul, de la rularea locală până la sincronizarea cu **Turso** și publicarea pe **GitHub Pages** ca PWA instalabil pe telefon.

---

## 1. Cerințe preliminare

- **Node.js** versiunea 18+ (recomandat **Node 20 LTS** sau **22 LTS**) și `npm`
- **Git** instalat local
- Cont gratuit pe **GitHub** (pentru găzduire statică GitHub Pages)
- *(Opțional)* Cont gratuit pe **Turso** (dacă vrei să creezi rețetele pe laptop și să le ai sincronizate pe telefon)

Verifică versiunea de Node în terminal:
```bash
node -v
npm -v
```

---

## 2. Rulare și testare locală (2 minute)

1. Dezarhivează proiectul și intră în folder:
   ```bash
   cd tact-curs-pwa
   ```
2. Instalează dependențele:
   ```bash
   npm install
   ```
3. Pornește serverul de dezvoltare:
   ```bash
   npm run dev
   ```
4. Deschide în browser URL-ul afișat (de obicei `http://localhost:5173`).
   - Aplicația vine pre-populată cu 3 rețete demo (*Curs Universitar 90m*, *Seminar 50m*, *Prezentare 15m*).
   - Pentru testare rapidă a tranzițiilor și depășirii de timp (`+MM:SS`), poți seta în editor secțiuni de `10s` sau `15s`.

### Testarea build-ului PWA de producție local (cu Service Worker activ)
În modul `dev`, Service Worker-ul este dezactivat intenționat pentru reîncărcare instantă. Ca să testezi versiunea exactă de producție și instalabilitatea PWA:
```bash
npm run build
npm run preview
```
Deschide link-ul afișat (`http://localhost:4173`) — în Chrome Desktop ar trebui să apară pictograma de instalare PWA în bara de adrese.

---

## 3. Configurare bază de date Turso (Opțional — Sincronizare Laptop ↔ Telefon)

### De ce stocăm cheile Turso în Setările aplicației și NU în codul de pe GitHub?
**GitHub Pages** servește fișiere statice publice (`index.html` și JavaScript). Orice variabilă `VITE_*` introdusă într-un build GitHub Actions devine vizibilă oricui inspectează codul sursă din browser.

De aceea, **Tact** folosește o arhitectură **Local-First + BYOK (Bring Your Own Key)**:
1. Rețetele și istoricul sunt salvate întâi local în browser (funcționează 100% offline în amfiteatre fără semnal).
2. URL-ul și Token-ul Turso se introduc o singură dată în aplicație (**Setări → Sincronizare Cloud Turso**) și rămân salvate **exclusiv în memoria locală (`localStorage`) a dispozitivelor tale**, fără a fi expuse vreodată pe GitHub.

### Pașii pentru crearea bazei de date în Turso

#### Varianta A — Prin Turso CLI (Linux / macOS / WSL2)
1. Instalează Turso CLI:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```
2. Autentifică-te:
   ```bash
   turso auth login
   ```
3. Creează baza de date:
   ```bash
   turso db create tact-curs
   ```
4. Obține URL-ul bazei de date (copiază rezultatul, ex: `libsql://tact-curs-utilizator.turso.io`):
   ```bash
   turso db show tact-curs --url
   ```
5. Generează un Auth Token (cu acces read/write):
   ```bash
   turso db tokens create tact-curs
   ```
   *(Sfat: dacă nu vrei să reîmprospătezi token-ul periodic, poți folosi `turso db tokens create tact-curs --expiration none`, sau o durată de 1 an.)*

#### Varianta B — Din interfața web Turso (`app.turso.tech`)
1. Creează o bază de date nouă numită `tact-curs`.
2. Copiază **Database URL** (`libsql://...`).
3. Apasă **Create Token** (Read & Write) și copiază token-ul generat.

### Conectarea în aplicație (fără SQL manual!)
1. Deschide aplicația Tact (pe laptop și/sau telefon).
2. Intră la **Setări** (rotița din dreapta sus) → secțiunea **Sincronizare Cloud Turso**.
3. Introdu **Turso Database URL** și **Turso Auth Token**.
4. Apasă **„Testează & Sincronizează DB”**.
   - Aplicația convertește automat `libsql://` în `https://` (pentru a funcționa peste HTTPS chiar și pe Wi-Fi universitar restrictiv), creează automat tabelele `recipes` și `session_logs` (vezi `db/schema.sql`) și sincronizează bidirecțional rețetele și istoricul.

*(Opțional pentru dezvoltare strict locală)*: poți copia `.env.example` în `.env.local` și completa cheile acolo. Fișierul `.env.local` este inclus în `.gitignore` și nu va fi urcat pe GitHub.

---

## 4. Urcare pe GitHub și Deploy automat pe GitHub Pages

Proiectul conține deja workflow-ul `.github/workflows/deploy.yml`, care configurează automat `VITE_BASE_PATH` în funcție de numele repository-ului tău.

### Pasul 1: Creează repository pe GitHub
1. Mergi pe [github.com/new](https://github.com/new).
2. Numește repository-ul, de exemplu `tact-curs` (poate fi Public sau Private dacă ai GitHub Pro; pentru GitHub Pages gratuit, repository-ul trebuie să fie Public — codul nu conține niciun secret!).
3. **Nu** bifa `Add a README` sau `.gitignore` (le avem deja pregătite).

### Pasul 2: Trimite codul pe GitHub
Din folderul `tact-curs-pwa`, rulează:
```bash
git init
git add .
git commit -m "feat: Tact silent course timer PWA"
git branch -M main
git remote add origin https://github.com/<USERUL-TAU>/tact-curs.git
git push -u origin main
```

### Pasul 3: Activează GitHub Pages cu GitHub Actions (PAS ESENȚIAL!)
1. Pe pagina repository-ului de pe GitHub, intră în **Settings** → **Pages** (meniul din stânga).
2. La **Build and deployment → Source**, schimbă din *Deploy from a branch* în **`GitHub Actions`**.
3. Mergi la tab-ul **Actions** al repository-ului. Dacă workflow-ul nu a pornit deja, poți apăsa *Run workflow* sau aștepta ~60 de secunde până când job-ul **build** și **deploy** devin verzi.
4. Vei primi URL-ul tău live, de forma:
   `https://<USERUL-TAU>.github.io/tact-curs/`

---

## 5. Instalarea PWA pe telefon și sfaturi pentru sala de curs

### Android (Chrome / Brave / Edge)
1. Deschide link-ul de GitHub Pages în Chrome pe telefon.
2. Apasă meniul `⋮` (dreapta sus) → **„Instalează aplicația”** sau **„Adaugă pe ecranul de pornire”**.
3. Aplicația va apărea ca o aplicație nativă, full-screen, fără bară de browser, și va funcționa și **fără internet**.

### iPhone / iPad (Safari)
1. Deschide link-ul de GitHub Pages în **Safari**.
2. Apasă butonul **Share** (pătratul cu săgeată în sus) → **„Add to Home Screen” (Adaugă la ecranul principal)**.

### Checklist rapid înainte de curs
- Pune telefonul pe **Mod Silențios / Nu deranja** (aplicația Tact nu emite niciun sunet, dar notificările altor aplicații te pot întrerupe).
- Lasă **Vibrațiile oprite** în Tact dacă pui telefonul pe catedră (pe lemn se aud); pornește-le din iconița de telefon din ecranul de curs doar dacă îl ții în buzunar.
- Dacă ai trecut de timp pe o secțiune și rămâi în urmă, folosește butonul **„Ajustează restul”** din bara galbenă — acesta recalculează doar sesiunea curentă fără să strice rețeta salvată!
