# Prompt Claude Design — Obiou Sommets

## Mode d'emploi

1. Ouvre un nouveau projet dans [Claude Design](https://www.anthropic.com/news/claude-design-anthropic-labs).
2. Colle le prompt ci-dessous **en entier** : il donne le contexte global.
3. Demande ensuite les écrans **par lots**, dans cet ordre, en validant chaque lot avant le suivant :
   - **Lot 1** : design system + P1 à P5 (le parcours principal, desktop et mobile) ;
   - **Lot 2** : P6 à P15 ;
   - **Lot 3** : A1 à A6 (admin, écrans clés) ;
   - **Lot 4** : A7 à A13.
4. Quand le lot 1 est validé, demande un **prototype cliquable** du parcours « carte → sommet →
   itinéraire → téléchargement » sur mobile.
5. Pour le passage au code, utilise le handoff vers Claude Code. Le site est en **Nuxt 4 / Vue 3** :
   les composants React de Claude Design ne sont pas réutilisables tels quels, **ce sont les tokens
   CSS et les mesures qui font contrat**.

> Les données d'exemple sont **fictives**. Les altitudes des sommets sont indicatives. Aucune
> information d'itinéraire de ces maquettes ne doit être reprise telle quelle dans le produit.

---

## Prompt à copier

````markdown
# Projet : Obiou Sommets — carte interactive des sommets et de leurs randonnées

## 1. Ton rôle
Tu es designer produit senior, spécialiste des interfaces cartographiques et outdoor. Tu conçois
l'ensemble des écrans d'un site web responsive et de son back-office. Tu produis des maquettes
haute fidélité cohérentes, un mini design system, et tous les états utiles (vide, chargement,
erreur). Langue de l'interface : français.

## 2. Le produit
Obiou Sommets est un site web personnel et non commercial (sommets.obiou.eu). C'est le carnet des
sommets gravis par son auteur dans les Alpes et en Corée du Sud, organisé autour d'une carte
interactive. Chaque itinéraire affiche la date et un court récit de la sortie de l'auteur. Un
sélecteur « Alpes · Corée du Sud » recentre la carte. Les noms coréens s'affichent aussi en hangeul.
- Le visiteur explore la carte, sélectionne un sommet et ouvre sa fiche.
- La fiche présente les différentes randonnées qui mènent au sommet.
- Chaque randonnée a sa fiche : trace sur la carte, profil altimétrique, infos pratiques (accès,
  parking, transports, eau, refuges), conseils, dangers, date de dernière vérification.
- Le visiteur télécharge la trace de son choix (GPX, KML, GeoJSON, FIT) pour l'importer sur son
  téléphone ou sa montre connectée.
- Les éditeurs (non-développeurs) gèrent tout le contenu dans un back-office.
- Les visiteurs et les éditeurs peuvent aussi passer par leur assistant IA (Claude, ChatGPT…) grâce
  à un accès MCP. Une page explique comment se connecter.
Pas de compte obligatoire pour les visiteurs. Les favoris sont stockés dans le navigateur.

## 3. Utilisateurs
- **Camille, randonneuse occasionnelle** (mobile, le jeudi soir) : cherche une belle sortie pour le
  week-end, a peur de se surestimer, veut savoir combien de temps, quel dénivelé, où se garer.
- **Karim, randonneur confirmé** (desktop puis montre Garmin) : sait où il va, veut comparer les
  variantes d'accès et récupérer une trace propre en deux clics.
- **Élise, éditrice bénévole** (desktop) : connaît le terrain, pas la technique. Elle dépose un GPX,
  complète les infos et publie. Elle doit se sentir guidée, jamais perdue.

## 4. Principes UX (non négociables)
1. **La carte d'abord** : la carte est la page d'accueil, et le contenu vient se poser dessus.
2. **Mobile-first** : tout le parcours principal se fait au pouce, d'une main. Cibles tactiles
   ≥ 44 px, bottom sheets plutôt que modales.
3. **Deux clics jusqu'à la trace** depuis une fiche itinéraire.
4. **Chiffres lisibles d'un coup d'œil** : distance, D+, durée, altitude max, cotation. Chiffres
   tabulaires, unités discrètes.
5. **Sécurité visible sans être anxiogène** : dangers et date de vérification toujours présents,
   dans un ton factuel. Jamais de rouge partout.
6. **Lisible dehors** : contraste AA minimum (AAA pour les chiffres clés), pas de gris clair sur
   blanc, mode sombre soigné.
7. **Sobre et rapide** : peu de décor, les photos portent l'émotion. Une fiche doit rester utile
   sans la carte (réseau faible).
8. **La couleur ne porte jamais seule une information** : chaque cotation a un libellé et une forme.

## 5. Direction artistique
Ambiance : le calcaire clair du Dévoluy, les cartes topographiques, la lumière rasante du matin.
Éditorial et précis, comme un bon topo-guide moderne. Ni « appli fitness », ni « station de ski ».

Palette de départ (à affiner, tokens nommés) :
- `--calcaire` #F6F3EC (fond clair)
- `--ardoise` #1F2A2E (texte principal)
- `--pierre` #5B6A70 (texte secondaire, contraste AA à vérifier)
- `--alpage` #2F6B4F (couleur principale, actions)
- `--lac` #2A6F97 (liens, eau, informations)
- `--aube` #D9622B (appel à l'action « Télécharger », à utiliser avec parcimonie)
- `--alerte` #B3261E (dangers)
- Courbes de niveau : un brun topo très léger, pour les motifs décoratifs.
Mode sombre : fond ardoise profond, texte calcaire, mêmes rôles.

Cotations : échelle de randonnée alpine T1 à T6. Propose des **badges inspirés du balisage** des
sentiers (T1 jaune ; T2–T3 blanc-rouge-blanc ; T4–T6 blanc-bleu-blanc), avec le code « T3 » écrit
dans le badge et un libellé en clair (« Randonnée en montagne »).

Typographie : une sans-serif humaniste très lisible pour l'interface (par exemple Public Sans ou
Source Sans 3) avec chiffres tabulaires, et une condensée affirmée pour les altitudes et les titres
de sommets (par exemple Barlow Condensed). Libre à toi de proposer mieux, avec justification.

Iconographie : trait simple, 1,5 px, pictos outdoor cohérents (parking, bus, source, refuge,
cabane, point de vue, passage délicat, montre, téléphone).

## 6. Composants à définir dans le design system
Barre de recherche avec suggestions · Chips de filtres · Marqueur de sommet (normal, survol,
sélectionné) et cluster · Contrôles de carte (zoom, géolocalisation, fonds de carte, plein écran) ·
Bottom sheet mobile à 3 hauteurs (aperçu, moitié, plein écran) · Panneau latéral desktop · Carte
« itinéraire » (vignette + stats) · Bloc de stats clés · Badge de cotation · Profil altimétrique
interactif (curseur synchronisé avec la carte) · Bloc « infos pratiques » · Carte « conseil » ·
Encadré « danger » · Mention « Vérifié le … » · Sélecteur de format de téléchargement · QR code ·
Galerie photo avec crédits · Fil d'Ariane · Bandeau d'alerte saisonnière · Toasts · États vides,
de chargement (squelettes) et d'erreur · Pied de page.

## 7. Données d'exemple (fictives)
Massif du Dévoluy :
- **Obiou** — 2 789 m — 3 itinéraires
- **Grand Ferrand** — 2 758 m — 2 itinéraires
- **Pic de Bure** — 2 709 m — 2 itinéraires
Itinéraires fictifs pour l'Obiou :
- « Voie normale par le vallon » — aller-retour — 13,8 km — 1 520 m D+ — 7 h 30 — T3
- « Boucle par les crêtes » — boucle — 16,2 km — 1 650 m D+ — 8 h 15 — T4
- « Traversée depuis le col » — traversée — 18,5 km — 1 480 m D+ / 1 720 m D- — 8 h 45 — T4
Corée du Sud :
- **Hallasan (한라산)** — 1 947 m — Jeju — 2 itinéraires (Seongpanak 성판악, Gwaneumsa 관음사),
  réservation requise pour le sommet
Photos : utilise des placeholders de paysages (calcaire alpin, forêts coréennes d'automne), avec un
crédit fictif.

## 8. Pages de l'interface publique
Pour chaque page : maquette **desktop 1440 px** et **mobile 390 px**, sauf mention contraire.

### P1 — Accueil : carte exploratoire
- Carte plein écran (fond topographique IGN) avec marqueurs de sommets et clusters.
- En haut : logo, barre de recherche (sommet, massif, commune), bouton filtres, accès Favoris.
- Filtres : altitude, cotation, durée, dénivelé, type (aller-retour, boucle, traversée), accès en
  transport en commun, mois praticables.
- Bouton « Liste » pour passer en vue liste. Sur mobile, bottom sheet « 42 sommets dans cette zone ».
- Sélecteur de fonds : Plan IGN, Carte topo, Photos aériennes. Attribution IGN visible.
- Bandeau saisonnier facultatif (« Neige possible au-dessus de 2 000 m jusqu'en juin »).
- États : premier chargement, aucun résultat avec ces filtres, géolocalisation refusée.

### P2 — Aperçu d'un sommet sur la carte
- Desktop : panneau latéral gauche (environ 420 px) sans quitter la carte. Mobile : bottom sheet.
- Photo, nom, altitude, massif, nombre d'itinéraires, fourchettes (durée, D+), cotations présentes.
- Liste compacte des itinéraires. Au survol ou au tap, la trace s'affiche sur la carte.
- Actions : « Voir la fiche complète », ajouter aux favoris, partager.

### P3 — Fiche sommet (page complète, indexable)
- Hero photo avec nom, altitude, massif et coordonnées.
- Résumé en chiffres, description, meilleure période (frise des 12 mois).
- **Comparateur d'itinéraires** : cartes ou tableau (départ, type, distance, D+, durée, cotation,
  date de vérification) et mini-carte avec toutes les traces colorées.
- Météo des prochains jours au sommet et au départ.
- Conseils liés au sommet, galerie avec crédits, sommets proches.
- Fil d'Ariane : Accueil › Dévoluy › Obiou.

### P4 — Fiche itinéraire (écran le plus important)
- En-tête : nom, sommet(s), type, badge de cotation, « Vérifié le 12 août 2026 ».
- Stats clés : distance, D+, D-, durée estimée, altitude min et max.
- Carte avec trace, départ, POI (sources, refuges, passages délicats) et étapes numérotées.
- **Profil altimétrique interactif** : le survol ou le glissement déplace un point sur la carte.
  Pentes fortes signalées.
- CTA principal **« Télécharger la trace »**, sticky en bas sur mobile.
- Accès : route, parking (capacité, payant ou non), transports en commun avec lien.
- Description étape par étape (photos facultatives).
- Encadré « Points de vigilance » (exposition, passages délicats, orage, neige tardive).
- Équipement conseillé, points d'eau, refuges et cabanes.
- Conseils (sécurité, logistique, saison, faune-flore).
- « Signaler une erreur » et avertissement de responsabilité discret mais présent.
- Autres itinéraires vers ce sommet.

### P5 — Téléchargement de la trace (bottom sheet mobile, modale desktop)
- Choix du format avec explication courte : GPX (« compatible avec presque tout »), KML (Google
  Earth), GeoJSON (cartographie), FIT (montres Garmin).
- Choix de l'appareil (Garmin, Suunto, Coros, Apple Watch, Komoot, OsmAnd, IGNrando', autre) : le
  format recommandé se présélectionne et un mini-guide d'import en 3 étapes s'affiche.
- Desktop : QR code « Scannez pour ouvrir la trace sur votre téléphone ».
- Confirmation après téléchargement, avec lien vers le guide détaillé.

### P6 — Explorer : liste des sommets
- Vue liste ou grille avec les mêmes filtres que la carte, tri (altitude, nom, proximité, nombre
  d'itinéraires), pagination ou chargement progressif, bascule vers la carte.

### P7 — Page massif
- Présentation du massif, carte du massif, liste de ses sommets, accès et bases de départ,
  conseils généraux.

### P8 — Recherche
- Superposition de résultats instantanés groupés (Sommets, Itinéraires, Massifs, Communes),
  recherches récentes, aucun résultat avec suggestions.

### P9 — Mes favoris (sans compte)
- Sommets et itinéraires enregistrés dans ce navigateur, listes « À faire » et « Fait »,
  explication que c'est local à l'appareil, état vide engageant.

### P10 — Connecter votre assistant IA (MCP)
- Explication simple de ce qu'on peut demander (exemples de prompts en cartes).
- URL du serveur à copier, avec instructions par client (Claude, ChatGPT, Cursor, autres) en onglets.
- Liste des outils disponibles, en langage clair.
- Encart : « L'IA peut se tromper : vérifiez toujours la fiche et les conditions ».
- Section séparée pour les éditeurs (accès admin, lien vers la documentation).

### P11 — Guides
Un gabarit de page guide et trois exemples : « Importer une trace sur sa montre ou son téléphone »
(sommaire par appareil), « Comprendre les cotations T1 à T6 » (tableau illustré), « Sécurité et
préparation » (checklist, numéro d'urgence 112, météo, horaires).

### P12 — Signaler une erreur
- Formulaire court : fiche concernée (pré-remplie), type de problème, message, photo facultative,
  e-mail facultatif. Confirmation et état d'erreur.

### P13 — À propos et méthodologie
- Qui fait le site, comment les itinéraires sont vérifiés, d'où viennent les données (IGN, terrain),
  crédits et licences.

### P14 — Pages légales
- Gabarit texte long, lisible, avec sommaire : mentions légales, confidentialité, avertissement de
  responsabilité montagne.

### P15 — États système
- 404 (sommet introuvable, avec une illustration topo), erreur serveur, hors ligne, maintenance,
  squelettes de chargement de P3 et P4.

## 9. Back-office (éditeurs et administrateurs)
Desktop 1440 px uniquement, plus une vue tablette pour A6. Le back-office sera construit sur le
CMS **Directus** : respecte ses grands patterns (navigation par modules à gauche, liste des
collections, tables filtrables, formulaire en colonne, tiroirs latéraux pour les relations,
barre d'actions en haut à droite). **Concentre l'effort créatif sur les écrans spécifiques**
(A2, A4, A6, A10, A12). Les autres restent des variantes propres de liste et de formulaire aux
couleurs du produit.

### A1 — Connexion
E-mail, mot de passe, double authentification (code TOTP), mot de passe oublié.

### A2 — Tableau de bord
- Tuiles : téléchargements des 30 derniers jours, top 5 des itinéraires, signalements ouverts,
  brouillons en attente, **itinéraires non vérifiés depuis plus de 12 mois**, **brouillons créés par
  l'assistant IA à relire**.
- Fil d'activité récente (qui a modifié quoi).
- Raccourcis : « Nouveau sommet », « Importer un GPX ».

### A3 — Liste des sommets
Table (photo, nom, altitude, massif, nombre d'itinéraires, statut, dernière modification), filtres,
recherche, actions groupées (changer de statut, archiver), bascule vers une vue carte.

### A4 — Édition d'un sommet
- Formulaire en sections : identité (nom, slug auto), **position sur carte IGN** (clic ou recherche,
  altitude proposée automatiquement et modifiable), massif, description (éditeur riche), photos
  (glisser-déposer, crédits obligatoires), période conseillée, conseils liés.
- Colonne de droite : statut (Brouillon, En relecture, Publié, Archivé), aperçu public, historique
  des révisions, itinéraires liés.
- Validation inline claire (champs manquants pour publier).

### A5 — Liste des itinéraires
Table (nom, sommet, cotation, distance, D+, statut, **fraîcheur de vérification** avec code
visuel), filtres par sommet, statut et ancienneté.

### A6 — Édition d'un itinéraire, avec import GPX (écran clé)
Parcours guidé en étapes :
1. **Dépôt du GPX** : grande zone de glisser-déposer, formats acceptés, taille maximale.
2. **Analyse** : progression (lecture, nettoyage, altitudes IGN, calculs, exports).
3. **Résultat** : carte de la trace, profil, stats calculées (modifiables avec mention « calculé /
   modifié à la main »), **anomalies** en langage clair (« 3 sauts de plus de 500 m détectés »,
   « la trace sort du massif »), traces personnelles supprimées (horodatages, cardio).
4. **Informations pratiques** : sommet(s), point de départ (sélection ou création rapide sur
   carte), type, cotation (aide visuelle T1–T6), mois praticables, accès, eau, refuges, dangers,
   équipement.
5. **Étapes** : liste ordonnable, chaque étape pouvant être placée sur la carte.
6. **Conseils et médias**.
7. **Checklist de publication** : champs obligatoires, photos créditées, date de vérification,
   aperçu desktop et mobile, bouton « Envoyer en relecture » ou « Publier » selon le rôle.
États : GPX invalide, fichier trop lourd, plusieurs traces dans le fichier (choisir laquelle),
remplacement d'un GPX existant (comparaison avant/après).

### A7 — Points de départ et POI
Vue partagée carte + liste, création au clic sur la carte, types de POI avec pictos.

### A8 — Bibliothèque de conseils
Liste par catégorie, éditeur simple, rattachement à plusieurs sommets ou itinéraires.

### A9 — Médiathèque
Grille de photos et fichiers, crédits et licences, filtres « sans crédit », « non utilisée ».

### A10 — Signalements
Boîte de réception : liste (type, fiche, date, statut), détail avec lien vers la fiche, actions
« Créer un brouillon de correction », « Répondre » (si e-mail), « Clore ». Mise en avant des
signalements « danger ».

### A11 — Utilisateurs et rôles
Liste des membres, invitation par e-mail, rôles (Administrateur, Éditeur, Contributeur, Agent IA)
avec résumé lisible de ce que chacun peut faire, statut 2FA.

### A12 — Accès IA (MCP)
- Explication : ce que l'assistant IA peut faire (lire, créer des brouillons) et **ne peut pas faire**
  (publier, supprimer, gérer les utilisateurs).
- Jetons d'accès : créer (nom, expiration), copier une seule fois, révoquer.
- Clients OAuth connectés : nom du client, utilisateur, dernière utilisation, révoquer.
- **Journal des actions de l'IA** : horodatage, outil, élément touché, lien vers le brouillon.
- File « Brouillons créés par l'IA » avec actions Relire, Publier, Rejeter.

### A13 — Paramètres du site
Bandeau d'alerte saisonnière (texte, période, niveau), fond de carte par défaut, pages éditoriales
(à propos, guides, légal) éditables, réseaux sociaux.

## 10. Livrables attendus
1. Page **design system** : couleurs (clair et sombre), typographie, espacements, rayons, ombres,
   icônes, badges de cotation, composants de la section 6 avec leurs états.
2. Maquettes haute fidélité de toutes les pages ci-dessus (desktop et mobile pour le public, desktop
   pour l'admin).
3. **Prototype cliquable mobile** du parcours : carte → sommet → itinéraire → téléchargement GPX.
4. Tokens exportables en variables CSS (`--calcaire`, `--alpage`…) pour une implémentation Vue/Nuxt.
5. Une courte note de justification des choix (typo, palette, hiérarchie de la fiche itinéraire).

Commence par le design system et P1 à P5, desktop et mobile, puis attends mes retours.
````
