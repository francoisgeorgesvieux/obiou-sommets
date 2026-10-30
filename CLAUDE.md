# obiou-sommets — contexte projet pour Claude

> Document de passation vivant. Dernière mise à jour : **2026-10-29**.

## Ce que c'est

Site public de cartographie des sommets (massif pilote : Dévoluy) : carte interactive, fiche
sommet, fiches itinéraires, téléchargement de traces (GPX/KML/GeoJSON/FIT). Admin sans code pour les
éditeurs. Accès MCP public (lecture seule) et admin (brouillons seulement).

Projet frère d'[obioucounting](../obioucounting) (même propriétaire, même domaine obiou.eu), mais
**totalement isolé** : projet Railway, base et secrets séparés.

## État

**Phase 1 (fondations) close le 2026-09-17.** Site Nuxt et Directus en ligne en **production et
staging** (admins créés, 2FA active, licence Open Innovation Grant reconnue, `ADMIN_PASSWORD` retirée
des deux). Domaines `sommets.obiou.eu` et `admin.sommets.obiou.eu` en HTTPS. Sauvegarde nocturne verte
depuis le 15 (36 tables), dump de production restauré par le propriétaire le 17 (36 tables, dont 33
`directus_*`). **Phase 2 (CMS et pipeline GPX) : en cours depuis le 2026-09-19** (schéma Directus
en production depuis le 2026-10-30 ; pipeline GPX commencé dans `packages/geo`).

Le 2026-10-29, la limite stricte d'usage Railway a arrêté tout le compte ; relevée par le
propriétaire le 2026-10-30 à 04:56 UTC, tout est reparti. Depuis, **tous les services sont en
veille** (voir *Infrastructure Railway*).

## Mode de travail (décidé par le propriétaire le 2026-10-29)

**Claude avance seul et se teste lui-même.** Le propriétaire n'est plus sollicité pour les petites
vérifications (relire un schéma dans l'admin, cliquer une page) : ça faisait attendre Claude pour
peu. Il fait de **gros lots de tests avant chaque passage en production** d'un ensemble de
fonctionnalités. Avec lui, on travaille le **design produit, la vision et les méthodes de gestion de
produit** (brainstorming, priorisation). Le site n'a qu'un utilisateur pour l'instant.

Concrètement :
- **Claude vérifie lui-même** : tests unitaires et `pnpm check`, Playwright (`pnpm e2e`) en local,
  Directus local pour tout changement de schéma (voir *Tester Directus en local* plus bas).
- **Claude fusionne lui-même vers `main`** (= production) une fois la CI verte, et le dit au
  propriétaire en une ligne (règle du 2026-10-30, qui remplace « le propriétaire fusionne »).
  **Exception** : quand Claude juge qu'un changement est assez important pour mériter un lot de
  tests du propriétaire avant la production (refonte d'un parcours, migration de données
  irréversible, sécurité), il le lui dit, attend ses tests, puis fusionne. `staging` reçoit les
  branches de travail librement.
- **Restent au propriétaire** : les secrets, la facturation, les choix produit, tout ce qui part
  hors du projet, et les données personnelles (GPX réels publiés dans un dépôt public).
- La session cloud de Claude **ne joint pas** `*.up.railway.app` ni `sommets.obiou.eu` (proxy
  réseau, 403 mesuré le 2026-10-29) : l'état en ligne se lit par le MCP Railway
  (`environment-status`, `get-logs`), pas par HTTP. Ouvrir ces domaines dans la politique réseau de
  l'environnement cloud permettrait les sondes et les tests e2e contre staging.

## ▶ Prochaine session : reprendre ici

**Démarrer la phase 2 (CMS et pipeline GPX)**, voir la roadmap
- **Modèle de données validé le 2026-09-18**, langues comprises :
  [docs/05-modele-de-donnees.md](docs/05-modele-de-donnees.md), qui fait foi.
- **Schéma Directus complet écrit le 2026-09-19** : le propriétaire a créé `languages` et
  `regions` à la main (guide [docs/07](docs/07-directus-premieres-collections.md)), Claude a écrit
  le reste dans `apps/cms/snapshots/schema.yaml`. 30 collections, 259 champs, 66 relations. Testé
  le 19 sept. sur un Directus 12.3.1 local (appliqué par moitiés, idempotent, données gardées) et
  **revérifié par Claude le 2026-10-29** à la place de la relecture prévue dans l'admin : sur une
  base neuve, `schema apply --dry-run` planifie 33 collections (30 + 3 dossiers), 358 créations,
  aucune suppression. Déployé sur `staging` le 19 sept., fusionné vers `main` par Claude le
  2026-10-30 (PR #1 : ajout pur), appliqué en production le jour même (`[obiou] schema apply` puis
  serveur démarré). Reste à faire : `obligatoire` vrai pour `fr` et `en` dans `languages` (une
  donnée, pas le schéma) ; Claude n'a pas d'accès à l'admin, le hook de publication le posera.
- **Pièges Directus 12 mesurés le 2026-09-19** :
  - **licence** : 25 collections maximum en « Core » (sans clé), tables de traduction et de liaison
    comprises (dossiers exclus). Le schéma en a 30 : il faut la licence Innovation Grant, que
    staging et production ont. Vérifier la limite de la clé : `GET /license` (admin), qui renvoie
    limites et usage, jamais la clé. En local sans clé, tester par moitiés de 25 au plus ;
  - **`schema apply` à chaque démarrage** de `cms` (`entrypoint.cjs`) : la base devient identique au
    fichier, donc tout ce qui a été créé dans l'admin sans être exporté est **supprimé avec ses
    données** au déploiement suivant. Exporter et commiter avant tout redéploiement de `cms` ;
  - un `schema apply` en échec **n'est pas atomique** ;
  - appliqué en ligne de commande pendant que le serveur tourne, le schéma n'est vu qu'après
    redémarrage du serveur (cache). Sans conséquence sur Railway : l'image l'applique avant de
    démarrer ;
  - `railway ssh` demande une clé SSH enregistrée chez Railway (aucune ici) ; l'export passe par
    `/schema/snapshot?export=yaml` dans le navigateur du propriétaire.
- **`packages/geo`** (depuis le 2026-10-29) : `parseGpx` (refus DOCTYPE/ENTITY, plus de 10 Mo, XML
  mal formé, coordonnées invalides ; entités prédéfinies décodées à la main, le parseur n'en traite
  aucune), `trackStats`, `din33466Hours`, `sanitizeSegments` (heures retirées, zone de
  confidentialité `trimM` mesurée le long de la marche) et `toGpx` (GPX 1.1 sans heure, extension ni
  appareil). Corpus synthétique seulement. Suite : simplification et profil, exports KML/GeoJSON,
  puis le hook Directus qui enchaîne le tout au dépôt d'un GPX.
- Demander au propriétaire un export de quelques GPX réels (Alpes + Corée) pour le corpus de tests de
  `packages/geo`. ⚠️ Le dépôt est **public** : un GPX commité en fixture est publié. Décider avec lui
  du nettoyage avant commit (horodatages décalés, cardio et appareil retirés, départs sensibles).
- `packages/domain` et `db/views` n'existent pas encore (prévus en phase 1, reportés) : les créer
  avec les collections.

**Déjà vérifié, inutile de refaire** : le 2026-09-14, Directus en prod + staging (2FA, licence Open
Innovation Grant), domaines HTTPS, plan IaC vide sur les deux environnements, carte IGN affichée ;
le 2026-09-17, sauvegardes des 15, 16 et 17 vertes et restauration réelle réussie.

**Rappels de méthode** : secrets posés par le propriétaire uniquement (script `set-cms-secrets.sh`),
jamais lus par Claude ; toujours `railway config plan` avant `apply`. **Branches** : une branche de
travail par sujet, poussée sur `staging` pour l'essayer en ligne, puis PR vers `main`, fusionnée
par Claude une fois verte (sauf exception ci-dessus). Ne plus pousser `main:staging` tant que `staging` a de l'avance (refusé).

## Décisions

- **Décidé par le propriétaire (2026-09-13)** : sous-domaine `sommets.obiou.eu` ; site personnel
  **non commercial, sans publicité** ; contenu = ses propres sorties, **Alpes + Corée du Sud**.
- **Décidé par le propriétaire (2026-09-18)**, sur recommandation : cotation **SAC T1–T6** complétée
  par l'effort calculé (D2) ; **FIT** au lancement s'il passe les tests sur 3 montres réelles, sinon
  v1.1 (D5) ; **pas de compte utilisateur** au lancement, favoris dans le navigateur (D7) ; hors de
  France, **MapTiler gratuit** avec repli OpenTopoMap, PMTiles si le quota ne suffit plus (D9).
  Dépôt **public** (D6).
- **D4 décidée (2026-09-18) : sans SCAN 25 pour le moment**, sur Plan IGN. Vérifié sur la licence
  IGN : une clé personnelle **ne suffit pas**, un site public relève de la licence « Usage Numérique
  Grand Public » (contrat avec l'IGN, relevé trimestriel, pénalité de 40 €/jour de retard, pas de
  cache). Une entreprise n'y change rien à elle seule, et un rattachement à une activité monétisée
  menacerait les offres gratuites non commerciales (MapTiler, Open-Meteo). Démarche prête :
  [docs/06-scan25-pas-a-pas.md](docs/06-scan25-pas-a-pas.md). Le propriétaire écrit à l'IGN
  (étape 1) et tiendra Claude au courant.
- **Langues (décidées le 2026-09-18)** : français (source) et anglais, **tous deux obligatoires
  pour publier**, coréen à prévoir plus tard (facultatif au début). Tables `…_translations` de
  Directus, collection `languages` avec un champ `obligatoire`. Directus ne sait pas exiger une
  langue : un hook de la phase 2 bloquera la publication s'il manque une traduction obligatoire.
  Noms propres non traduits, adresses anglaises sous `/en`. Rôle Contributeur : plus tard.
- **Maquettes** publiées (45 écrans, lots 1 à 4) : https://claude.ai/code/artifact/bb79abd1-e08c-4cf9-834a-017c95d230ec.
  Les artboards sources sont dans `design/*.dc.html`. Si le canvas a été modifié en ligne, la
  version en ligne fait foi : la relire avant de régénérer. Données et fonds de carte fictifs.

## Commandes

pnpm arrive par corepack (`corepack enable` une fois, ou préfixer par `corepack pnpm`). Dans une
session cloud, corepack échoue (`pnpm.cjs` introuvable, 2026-10-29) : `npx -y pnpm@12.4.1 <commande>`.

- `pnpm install` · `pnpm dev` (Nuxt) · `docker compose up -d` (Postgres PostGIS + Directus locaux)
- **Tester Directus en local, dans une session cloud** (mesuré le 2026-10-29) : le démon Docker n'y
  tourne pas d'office (`dockerd &` le lance) et Docker Hub y répond **429** pour
  `directus/directus` (l'image PostGIS passe). Voie qui marche : Postgres dans Docker
  (`docker run -d -p 5440:5432 … postgis/postgis:17-3.5-alpine`) et Directus **depuis npm** dans un
  dossier de travail (`npm i directus@~12.3 pg`, un `.env` avec `DB_CONNECTION_STRING`, `SECRET`,
  `ADMIN_*`), puis `npx directus bootstrap` et
  `npx directus schema apply --dry-run <chemin>/schema.yaml`. Sans licence, l'application réelle
  plafonne à 25 collections : appliquer par moitiés.
- `pnpm check` = lint + typecheck + tests + contrôle des lignes modifiées, comme la CI ; `pnpm build`
  construit le site. **À lancer avant chaque commit.**
- **Couverture de tests, deux règles en CI** (mécanique reprise d'obioucounting) :
  1. **plancher par package** (`coverage.thresholds` dans `vitest.config.ts`) : un test qui fait
     baisser la couverture sous le plancher échoue. Le plancher **remonte tout seul** quand la
     couverture progresse (`autoUpdate`, arrondi à l'entier inférieur) : `pnpm check` modifie alors
     `vitest.config.ts`, **committer ce changement avec le code**. Ne jamais baisser un plancher à la
     main. `packages/geo` est à 100 % : chaque nouvelle ligne y demande un test ;
  2. **lignes modifiées couvertes à 85 % minimum** (`scripts/patch-coverage.mjs`). Base : le commit
     d'avant le push (`github.event.before`) ou la base de la PR ; en local, `origin/main`.
  Un package n'est contrôlé que s'il a `@vitest/coverage-v8` et un `vitest.config.ts` avec
  `coverage.include` (sans `include`, un fichier que rien n'importe est invisible) : copier celui de
  `packages/geo`. Les deux packages actuels sont contrôlés ; le script signale ceux qui ne le sont pas.
- **Tests de `apps/web`**, deux projets Vitest (`apps/web/vitest.config.ts`) :
  - `test/unit/` (Node) : routes Nitro et `server/utils`, servies par une **vraie app h3**
    (`fetchRoute`). Hors build, les auto-imports de Nitro n'existent pas : `test/unit/nitro.ts` les
    pose en globales (h3, `useRuntimeConfig` lu dans `runtimeConfig`, exports de `server/utils`).
    **Un nouveau fichier de `server/utils` s'ajoute à la liste `serverUtils`**, sinon
    `<nom> is not defined`. Un test remplace une dépendance par `vi.stubGlobal('useDb', …)` ;
  - `test/nuxt/` (app Nuxt dans happy-dom) : pages et composants avec `mountSuspended`,
    `registerEndpoint` pour les appels `/api`, `mockComponent('CarteIgn', …)` et `vi.mock('maplibre-gl')`
    (pas de WebGL). Pièges mesurés le 2026-09-17 : `await useFetch(…, { server: false })` **bloque**
    le montage côté client jusqu'à la réponse (l'état « en attente » n'existe qu'au rendu serveur :
    le tester avec `mockNuxtImport('useFetch', …)` dans un fichier à part) ; `mockNuxtImport` vaut
    pour tout le fichier ; vider `clearNuxtData()` entre deux tests d'un même `useFetch`.
  `test/unit` est rattaché au tsconfig serveur (`nitro.typescript.tsConfig` dans `nuxt.config.ts`),
  `test/nuxt` au tsconfig app par Nuxt : `pnpm typecheck` vérifie aussi les tests.
- **Tests de bout en bout (Playwright)** : `pnpm e2e` (build de production servi en local, port 3100)
  ou `E2E_BASE_URL=https://… pnpm e2e` pour un site déployé. Cinq projets, les trois moteurs sur
  bureau et téléphone : `chrome`, `chrome-mobile`, `firefox`, `safari`, `safari-mobile` (les tests
  purement HTTP ne tournent que sur `chrome`).
  **Pas dans la CI de chaque push** : workflow `e2e.yml`, chaque nuit à 04:30 UTC sur les trois
  cibles (local, staging, production) et à la demande. Points mesurés le 2026-09-17 :
  - **la carte est vérifiée sur les pixels** : Chromium headless rend le WebGL en logiciel
    (SwiftShader) et dessine vraiment le plan IGN. Une carte vide compte 360 à 560 couleurs (les
    seuls contrôles), une carte dessinée plus de 16 000 ; seuil du test : 3 000. Les deux pièges
    MapLibre sont silencieux, d'où la mesure sur l'image plutôt que sur la console ;
  - **l'IGN bride les rafales** : une salve de chargements de carte (calibrage) a fait échouer le
    lancement suivant, carte vide et aucune erreur côté site. D'où : les tests de page servent un
    style vide au lieu d'appeler l'IGN (`withoutMapTiles`), une tentative de plus en CI, et les
    requêtes IGN refusées jointes au rapport d'échec. Un échec de la carte seule, avec `ign.txt`
    rempli, se lit comme un incident IGN, pas comme une régression ;
  - **refuser une requête IGN fait journaliser une `AJAXError` par MapLibre**, et chaque test échoue
    sur toute erreur console ou exception ;
  - **Firefox sans interface sous Linux n'a pas WebGL** (mesuré en CI le 2026-09-17) : les tests de
    carte s'y ignorent explicitement, Chromium et WebKit restent stricts. Ne pas tenter de forcer
    WebGL par les préférences Firefox (`webgl.force-enabled`, `gfx.webrender.software`) : ça le
    **casse** là où il marchait (macOS, 2026-09-18). C'est ce cas qui a révélé que la page entière
    tombait en erreur 500 quand MapLibre échoue ; la carte attrape maintenant l'échec et le dit.
    `test/e2e/sans-webgl.spec.ts` désactive vraiment WebGL et vérifie que le site reste servi ;
  - **détecter une capacité du navigateur sur `about:blank`**, jamais en chargeant la page deux
    fois : le second chargement interrompt les requêtes de MapLibre, qui journalise une erreur ;
  - **un serveur déjà en écoute sur le port 3100 est réutilisé** (`reuseExistingServer` en local) :
    après un `rm -rf .output`, un vieux serveur sert des fichiers disparus et **tout** échoue en 500.
    Le tuer avant de relancer ;
  - **la base attendue ne se lit jamais sur le site** : `target.database` vaut « oui » pour un site
    déployé, sinon `NUXT_DATABASE_URL`. `E2E_DATABASE=0` le force à « non » (serveur `pnpm dev` visé
    par `E2E_BASE_URL`, par exemple). Un staging qui répondrait « pas de base » doit échouer ;
  - le réveil attend une réponse de `robots.txt`, pas de `/api/health` : un problème de base doit
    faire échouer un test, pas la préparation.
- TypeScript est **épinglé en 6.x** : TS 7 casse `vue-tsc` et `typescript-eslint` (mesuré le 2026-09-13)
- pnpm 12 bloque les scripts d'installation des dépendances : les autorisations sont dans
  `allowBuilds` de `pnpm-workspace.yaml`. Une dépendance non décidée ne fait échouer l'install
  **que sous Linux** (Railway, CI), pas en local sur macOS
- **Carte MapLibre 6**, deux pièges mesurés le 2026-09-13, tous deux silencieux (aucune erreur
  console, carte simplement vide) :
  1. le worker est chargé par une URL calculée à l'exécution, donc jamais émis par Vite → 404.
     Correctif : `import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'` puis
     `setWorkerUrl(workerUrl)`. Le `vite.worker.format: 'es'` qui l'accompagnait a été **retiré le
     2026-09-17** : avec Vite 8, le worker sort en **un seul fichier autonome** (507 ko, aucun
     import), donc le format ne change rien. Vérifié sans lui, carte dessinée : build de production
     et `pnpm dev`, en bureau et en mobile. L'IIFE par défaut est même le plus sûr pour un worker
     classique ;
  2. dans un composant `*.client.vue`, la référence de template restait `null` au montage.
     Utiliser un composant normal dans `<ClientOnly>` avec `useTemplateRef`.
  Vérifier une carte dans un vrai navigateur : jsdom n'a pas WebGL, un test unitaire ne verra rien.

## Infrastructure Railway (créée le 2026-09-13)

Projet `obiou-sommets` (`0081f1e1-c1bc-4fb5-9f4f-8b599e56aba4`), offre Hobby.

| Élément | Production (`298b2eb8-4c02-4d16-b6d0-a8c0847f97ee`) |
|---|---|
| `TimescaleDB` (`c4740fd6…`) | Postgres 17 + PostGIS 3.5, image `timescale-postgis-ssl:pg17-ts2.17`, volume, **aucun proxy TCP public** |
| `web` (`d8e1e7b6…`) | `apps/web/Dockerfile`, healthcheck `/api/health`, **https://sommets.obiou.eu** (+ `web-production-3283c.up.railway.app`) |
| `cms` (`fa57adf1…`) | racine `/apps/cms`, healthcheck `/server/ping`, **https://admin.sommets.obiou.eu** (`PUBLIC_URL`) (+ `cms-production-02a9.up.railway.app`) |
| `backup` (`7c632da2…`) | racine `/infra/backup`, cron `0 3 * * *`, redémarrage `NEVER` |
| buckets | `obiou-sommets-files` (uploads Directus) et `obiou-sommets-backups`, région `ams` |

Staging (`2ee34906-8acc-4538-a3f8-8789f4a1d7ef`) : copie de la production, branche `staging`,
**pas de service `backup`**.

**Veille (Serverless) sur tous les services sauf `backup`, production comprise** (décision du
propriétaire, 2026-10-29) : le 29 octobre, une limite stricte d'usage (environ 10 $) a arrêté tout le
compte Railway, pour un usage mesuré d'environ 11 $/mois sur les deux projets. Premier appel après
la veille : quelques secondes, parfois un 502. À revoir quand le site public aura du trafic. Domaines :
`web-staging-6028.up.railway.app`, `cms-staging-5f20.up.railway.app`.
⚠️ La copie d'environnement a repris la même valeur de `POSTGRES_PASSWORD` que la production (bases
distinctes, aucune exposée publiquement). Changer ce mot de passe demande un `ALTER USER` dans la
base, pas seulement la variable : le volume est déjà initialisé.

**La source de vérité de la config est `.railway/railway.ts`.** ⚠️ Toute variable absente du fichier est
**supprimée** par `apply` : une variable posée dans le dashboard ou par script doit y être ajoutée en
`preserve()` dans le même commit (mesuré le 2026-09-14 : le plan voulait supprimer `SECRET` et `LICENSE_KEY`). Toujours `railway environment <env>`
puis `railway config plan` (lecture seule) avant tout `apply`. Un plan propre dit
« already up to date » sur les deux environnements.

- **Régions** : chaque service doit être en `europe-west4-drams3a` et seulement là. La région par
  défaut du workspace est `sfo` : tout nouveau service y atterrit. **L'offre Hobby refuse plusieurs
  régions** et le déploiement échoue en moins d'une seconde, sans aucun log. Correctif mesuré :
  `railway scale --environment <env> --service <nom> sfo=0 eu-west=1`.
- **Config** : les `railway.json` sont abandonnés par Railway (lus jusqu'au 2026-12-01 pour les
  anciens services seulement) ; les réglages sont posés via l'API, à versionner dans
  `.railway/railway.ts` (`railway config pull`).
- **Domaines personnalisés** (actifs le 2026-09-14, certificats Let's Encrypt renouvelés par Railway) :
  il faut **un CNAME et un TXT `_railway-verify.<sous-domaine>`** chez Hostinger pour chaque domaine.
  L'outil MCP `generate-domain` n'affiche que le CNAME : sans le TXT, le certificat reste bloqué en
  `VALIDATING_OWNERSHIP`. Valeurs exactes : `railway domain status <domaine> --service <svc> --json`.
  L'IaC ne sait pas créer un domaine (le déclarer via l'API, puis le décrire dans `railway.ts`).
  Railway redirige lui-même `http://` vers `https://`.
- **Watch patterns** : un commit hors du périmètre d'un service donne un déploiement `SKIPPED`, c'est
  normal.
- **Secrets posés par le propriétaire uniquement** (jamais par Claude) : `cms` → `SECRET`,
  `ADMIN_EMAIL`, `ADMIN_PASSWORD` (premier démarrage seulement, puis supprimé), `LICENSE_KEY`. Sans `SECRET`,
  ou sur une base vide sans compte admin, le conteneur refuse de démarrer (voir
  `apps/cms/obiou/entrypoint.cjs`).
- **Pas d'e-mail sortant par SMTP** : Railway bloque le SMTP sortant sur l'offre Hobby (réservé à Pro,
  [doc](https://docs.railway.com/networking/outbound-networking#email-delivery)). Mesuré le
  2026-09-14 : `Connection timeout` vers Resend, alors qu'une mauvaise clé aurait donné une erreur
  d'authentification. Directus ne gère que `smtp`, `sendmail`, `mailgun` et `ses` : Resend
  (SMTP uniquement côté Directus) ne peut donc pas servir. **Décision du propriétaire (2026-09-14) : pas
  d'e-mail.** Comptes créés à la main ; mot de passe perdu → réinitialisation par l'admin ou en CLI.
  Variables `EMAIL_*` retirées. Si besoin plus tard : transport `mailgun` (API HTTPS, autorisée sur Hobby).
- **`SECRET` ne se change jamais** (vérifié dans le code de Directus 12.3, `services/payload.js` et
  `services/mcp-oauth`) : il signe les sessions **et chiffre les champs marqués `encrypt`** (clés
  stockées dans les paramètres, consentements OAuth MCP). Un autre `SECRET` → ces champs deviennent
  illisibles (`null`). Une sauvegarde de base n'est donc restaurable qu'**avec** son `SECRET` : il doit
  être dans le gestionnaire du propriétaire, pour chaque environnement.
- **Secrets** : les poser avec `infra/scripts/set-cms-secrets.sh <env>`, pas avec le formulaire du
  dashboard, qui a produit deux fois des variables vides (invisibles une fois scellées).
- **Licence Directus** : sans clé, le niveau Core ignore les règles de permission personnalisées.
  Le rôle « Agent IA » (MCP admin) **ne doit pas être activé** avant une licence Innovation Grant active.
- **Sauvegardes** : chiffrées vers la clé publique age dans `AGE_RECIPIENT`. La clé privée est chez le
  propriétaire (`~/.config/obiou-sommets/backup-age.key`), jamais sur Railway. Restauration :
  `infra/backup/restore.md`. Test de restauration **par le propriétaire** :
  `infra/backup/restore-test.sh` (tout dans Docker, rien à installer, environ 10 s). Les runs se
  lisent avec `get-logs` sur le déploiement actif du service `backup` : un cron ne crée pas de
  nouveau déploiement, tous les runs sont dans les logs du même. Les lignes rouges
  `pg_dump: warning … hypertable/chunk/continuous_agg` sont normales (catalogue TimescaleDB).
- **La base contient TimescaleDB** (image `timescale-postgis-ssl`), pas seulement PostGIS : un dump
  ne se restaure que sur un serveur qui a les deux. L'image PostGIS du `docker-compose.yml` local
  échoue sur `extension "timescaledb" is not available` (mesuré le 2026-09-17). L'image de
  production n'existe qu'en amd64 : émulée sur Mac Apple Silicon, ça fonctionne.

## Invariants proposés (à confirmer en phase 0)

- **Écriture via Directus, lecture publique via vues SQL** (`db/views`). Le site public et le MCP
  public ne dépendent pas de Directus à l'exécution.
- **Le rôle MCP « Agent IA » ne publie jamais et ne supprime jamais** : brouillons seulement.
- **Schéma Directus modifié en staging uniquement**, versionné dans `apps/cms/snapshots/`.
- **Aucune métadonnée personnelle** (horodatages, cardio, appareil) dans un GPX publié.
- **Région EU vérifiée** sur chaque service Railway et le bucket, pas seulement choisie.

## Documents

- [docs/01-architecture-technique.md](docs/01-architecture-technique.md)
- [docs/02-roadmap-deploiement.md](docs/02-roadmap-deploiement.md)
- [docs/03-prompt-claude-design.md](docs/03-prompt-claude-design.md)
- [docs/04-avis-critique.md](docs/04-avis-critique.md)
- [docs/05-modele-de-donnees.md](docs/05-modele-de-donnees.md)
- [docs/06-scan25-pas-a-pas.md](docs/06-scan25-pas-a-pas.md)
- [docs/07-directus-premieres-collections.md](docs/07-directus-premieres-collections.md)
