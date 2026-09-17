# obiou-sommets — contexte projet pour Claude

> Document de passation vivant. Dernière mise à jour : **2026-09-17**.

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
`directus_*`). **Phase 2 (CMS et pipeline GPX) : pas commencée.**

## ▶ Prochaine session : reprendre ici

**Démarrer la phase 2 (CMS et pipeline GPX)**, voir la roadmap
- Décisions encore ouvertes à trancher d'abord : D2 cotation (SAC T1–T6 recommandée), D5 FIT au
  lancement, D7 comptes utilisateurs, D9 fond de carte hors France. D6 est tranchée : dépôt **public**.
- Modéliser les collections dans Directus **staging** (sommets, itinéraires, sorties, régions…),
  puis `directus schema snapshot` → `apps/cms/snapshots/schema.yaml` → PR.
- Demander au propriétaire un export de quelques GPX réels (Alpes + Corée) pour le corpus de tests de
  `packages/geo`.
- `packages/domain` et `db/views` n'existent pas encore (prévus en phase 1, reportés) : les créer
  avec les collections.

**Déjà vérifié, inutile de refaire** : le 2026-09-14, Directus en prod + staging (2FA, licence Open
Innovation Grant), domaines HTTPS, plan IaC vide sur les deux environnements, carte IGN affichée ;
le 2026-09-17, sauvegardes des 15, 16 et 17 vertes et restauration réelle réussie.

**Rappels de méthode** : secrets posés par le propriétaire uniquement (script `set-cms-secrets.sh`),
jamais lus par Claude ; toujours `railway config plan` avant `apply` ; pousser sur `main` **et**
`staging` (`git push origin main && git push origin main:staging`) tant qu'il n'y a pas de PR.

## Décisions

- **Décidé par le propriétaire (2026-09-13)** : sous-domaine `sommets.obiou.eu` ; site personnel
  **non commercial, sans publicité** ; contenu = ses propres sorties, **Alpes + Corée du Sud**.
- **Encore ouvert** : D2, D5, D6, D7, D9 de
  [l'architecture](docs/01-architecture-technique.md#14-décisions-ouvertes).
- **Maquettes** publiées (45 écrans, lots 1 à 4) : https://claude.ai/code/artifact/bb79abd1-e08c-4cf9-834a-017c95d230ec.
  Les artboards sources sont dans `design/*.dc.html`. Si le canvas a été modifié en ligne, la
  version en ligne fait foi : la relire avant de régénérer. Données et fonds de carte fictifs.

## Commandes

pnpm arrive par corepack (`corepack enable` une fois, ou préfixer par `corepack pnpm`).

- `pnpm install` · `pnpm dev` (Nuxt) · `docker compose up -d` (Postgres PostGIS + Directus locaux)
- `pnpm check` = lint + typecheck + tests, comme la CI ; `pnpm build` construit le site
- TypeScript est **épinglé en 6.x** : TS 7 casse `vue-tsc` et `typescript-eslint` (mesuré le 2026-09-13)
- pnpm 12 bloque les scripts d'installation des dépendances : les autorisations sont dans
  `allowBuilds` de `pnpm-workspace.yaml`. Une dépendance non décidée ne fait échouer l'install
  **que sous Linux** (Railway, CI), pas en local sur macOS
- **Carte MapLibre 6**, deux pièges mesurés le 2026-09-13, tous deux silencieux (aucune erreur
  console, carte simplement vide) :
  1. le worker est chargé par une URL calculée à l'exécution, donc jamais émis par Vite → 404.
     Correctif : `import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'` puis
     `setWorkerUrl(workerUrl)`, avec `vite.worker.format: 'es'` ;
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

Staging (`2ee34906-8acc-4538-a3f8-8789f4a1d7ef`) : copie de la production, branche `staging`, `web` et
`cms` en veille quand inactifs, **pas de service `backup`**. Domaines :
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
