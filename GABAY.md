# BloodConnect ZC (Firebase version): Setup at Edit Guide

## Mga file

| File | Para saan |
| --- | --- |
| `index.html` | Ang buong app (itsura + logic) |
| `config.js` | Dito ilalagay ang Firebase keys niyo |
| `firestore.rules` | Security rules. Ito ang nagtatago ng pangalan at number sa hindi staff |
| `GABAY.md` | Itong gabay |

---

## A. Unang setup (isang beses lang)

### 1. Ilagay ang Firebase keys
1. Buksan ang `config.js`.
2. Palitan ang bawat `"PASTE_HERE"` ng galing sa Firebase console (Project settings → Your apps → Web app → **Config**).
3. I-save.

### 2. I-publish ang security rules
1. Firebase console → **Firestore Database → Rules**.
2. Burahin lahat ng nandoon, tapos i-paste ang buong laman ng `firestore.rules`.
3. Pindutin ang **Publish**.

> Mahalaga ito. Kung hindi niyo ito gagawin, hindi gagana ang app, dahil naka-"production mode" ang database at walang makakabasa o makaka-save.

### 3. I-upload sa GitHub
1. Buksan ang repo niyo (`bloodconnect-zc`) sa github.com.
2. Pindutin ang **Add file → Upload files**.
3. I-drag ang 4 na file: `index.html`, `config.js`, `firestore.rules`, `GABAY.md`.
4. Pindutin ang **Commit changes**.

### 4. Ikonekta ang GitHub sa Netlify
1. app.netlify.com → **Add new site → Import an existing project → GitHub**.
2. Piliin ang `bloodconnect-zc`. Iwanang **blangko** ang build command at publish directory, tapos **Deploy**.
3. **Site configuration → Change site name**, at ilagay ang pangalang gusto niyo.
   - Kung gusto niyong `bloodconnect-uz` pa rin, palitan muna ang pangalan ng lumang site (halimbawa, `bloodconnect-uz-prototype`) para mabakante ang pangalan.
4. Siguraduhing nasa **Firebase → Authentication → Settings → Authorized domains** ang link ng site niyo.

### 5. Gumawa ng staff account
1. Buksan ang site, pindutin ang **Sign in → Create one**, at gumawa ng account (halimbawa, ang email ng gf mo o ng staff).
2. Firebase console → **Firestore Database → Data → users**, tapos hanapin ang account (makikita ang email).
3. Palitan ang `role` mula `user` papuntang `staff`.
4. I-refresh ang site. Lalabas na ang "Staff", at kita na ang pangalan, number, at screening.

> Pagbukas ng unang staff account, kusang ilalagay ng app ang listahan ng hospitals.

---

## B. Paano mag-edit (kapag may revision)

**Sa GitHub (pinakamadali, pwede sa phone):**
1. Buksan ang repo, pindutin ang `index.html`, tapos ang **pencil icon ✏️** (Edit).
2. Gamitin ang **Ctrl + F** para hanapin ang `EDIT HERE`.
3. Baguhin ang kailangan, tapos pindutin ang **Commit changes**.
4. Kusang mag-a-update ang site sa loob ng mga 1 minuto.

### Mga madalas palitan (hanapin ang `EDIT HERE` sa index.html)

| Gusto mong palitan | Hanapin | Halimbawa |
| --- | --- | --- |
| Edad, timbang, ilang araw bago makapag-donate ulit | `const RULES` | `minWeight:50` → `minWeight:45` |
| BP, pulse, temperature ranges | `const VITALS` | `pulse:[50,100]` |
| Listahan ng barangay | `const BARANGAYS` | Idagdag ang `'Ayala'` |
| Default na hospitals | `const DEFAULT_HOSPITALS` | (Mas madali: i-edit sa app, sa Hospitals tab bilang staff) |
| Text ng SMS | `const SMS_TEXT` | Palitan ang mensahe |
| Mga infection test | `const TTI` | |
| Pangalan ng mga tab | `const TABS` | |
| Terms and Conditions | `function termsBox` | Nandoon ang listahan ng terms |
| Text sa Home | `function viewHome` | |
| Kulay | `--blood:#AE0F2A` sa taas ng file | Palitan ang hex color |

**Tips:**
- Huwag burahin ang mga `'` (quote), `,` (comma), at `` ` `` (backtick). Kadalasan, dahil sa mga ito kaya nasisira ang app.
- Kapag nasira ang site pagkatapos ng edit, pumunta sa GitHub → `index.html` → **History**. Makikita doon ang dating version, at pwede niyong kopyahin ulit.
- Para makita ang error: buksan ang site, pindutin ang **F12**, tapos tingnan ang **Console**.

---

## C. Paano gumagana (para sa defense o tanong)

- **Firebase Authentication:** may sariling account (email at password) ang bawat user.
- **Firestore:** iisang online database, kaya kita ng lahat ang parehong data.
- **Dalawang bahagi ang bawat donor at request:**
  - **Public** (`donors`, `requests`): ID, blood type, at status lang. Kita ng lahat ng naka-sign in.
  - **Private** (`donorsPrivate`, `requestsPrivate`): pangalan, number, at birthdate. **Staff at ang may-ari lang** ang makakabasa, dahil ito ang ipinapatupad ng `firestore.rules`.
- **Roles:**
  - `user`: pwedeng mag-request at mag-register bilang donor (may "Viewing as: Requester / My donor account").
  - `staff`: screening, confirm ng blood type, record ng donation, edit ng hospitals.
- **Unique IDs:** bago i-save, chine-check ng app sa database na wala pang ganoong ID.
- **SMS:** naka-record sa SMS log (Donor ID lang). Para maging totoong text, kailangan ng **Firebase Blaze plan + Cloud Function + SMS gateway** (hal. Semaphore), na may bayad.

## D. Limitasyon pa rin

- Simulated pa rin ang SMS (log lang).
- Manual ang pag-assign ng staff role sa Firebase console.
- Sa browser tumatakbo ang matching, kaya kahit sinong naka-sign in ay pwedeng magdagdag sa listahan ng na-alert na donor. Sa susunod na version, pwede itong ilipat sa Cloud Function.
