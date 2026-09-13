# Avis critique — Obiou Sommets

> Écrit le 13 septembre 2026, avant la moindre ligne de code. Volontairement franc.

## Mise à jour après tes réponses (13 sept. 2026)

Tu as précisé que c'est un **site plaisir, non commercial**, qui rassemble **tes propres sorties dans
les Alpes et en Corée du Sud**. Ça change sensiblement l'analyse :

| Risque initial | Ce qui change |
|---|---|
| 2. Concurrence (Camptocamp, Visorando…) | **Presque hors sujet.** Un carnet personnel n'a pas à battre ces plateformes. Sa valeur, c'est ta voix, tes photos et le mélange Alpes et Corée, rare en français. |
| 1. Volume de contenu | **Allégé.** Les traces et les photos existent déjà ; il reste surtout la rédaction. Publier au fil de l'eau suffit, sans objectif de nombre. |
| 4. Droits sur les données | **Réglé** pour les traces et les photos, puisque ce sont les tiennes. Reste l'attribution des fonds de carte. |
| SCAN 25 payant | **Levé** : usage non commercial, avec clé personnelle. |
| 9. Charge de travail | **Encore plus d'arguments** pour un processus léger : c'est un loisir. |

Nouveaux points d'attention :

- **Fraîcheur** : une sortie de 2022 en Corée peut être périmée (sentier fermé, nouveau quota). La
  maquette affiche donc la **date de ta sortie** partout, avec un ton « récit » plutôt que « topo
  officiel ». C'est aussi ce qui protège le mieux sur le plan de la responsabilité.
- **Corée du Sud** : les parcs nationaux ferment certains sentiers pendant les saisons de risque
  d'incendie et imposent parfois une réservation (Hallasan, par exemple). Il faut un champ
  « réglementation » visible sur la fiche.
- **Cartographie hors de France** : l'IGN s'arrête à la frontière. Le fond outdoor gratuit
  (MapTiler) est suspendu au-delà de 5 000 sessions par mois : prévoir un repli dès le départ.
- **Vie privée** : tes GPX bruts contiennent horaires, fréquence cardiaque et parfois le point de
  départ réel (hôtel, domicile). Le pipeline les nettoie et propose une zone de confidentialité.

Le reste de l'analyse ci-dessous reste valable, en particulier la sécurité du MCP admin, la
gouvernance du schéma et les dépendances.

## En bref

**Le projet est faisable et la technique n'est pas le risque.** Avec Directus, Nuxt, PostGIS et
Railway, un MVP tient en 3 à 4 mois à temps partiel. Les vrais risques sont ailleurs :

1. **le contenu**, qui représente l'essentiel de la valeur et du travail ;
2. **la différenciation**, face à des acteurs installés et gratuits ;
3. **la responsabilité**, parce qu'on publie des itinéraires de montagne.

Si tu traites ces trois points dès le cadrage, c'est un bon projet. Sinon, tu construis une très
belle carte vide.

---

## Ce qui est solide

- **Un ancrage local crédible.** obiou.eu, le Dévoluy, une connaissance du terrain : c'est ce qui
  manque aux plateformes globales.
- **Le modèle « sommet → itinéraires » est le bon.** C'est comme ça qu'on pense une sortie en
  montagne : on veut un sommet, puis on choisit l'itinéraire selon son niveau.
- **Le MCP est un vrai différenciateur, et il ne coûte presque rien.** Demander à son assistant « une
  rando de moins de 1 200 m de D+ accessible en bus depuis Grenoble, pas trop exposée » et obtenir
  une réponse sourcée et datée, peu de sites le proposent aujourd'hui. Le MCP public en lecture seule
  représente environ 1 à 2 semaines de travail.
- **L'infra existe déjà** : Railway, DNS Hostinger, Resend, des pratiques de sauvegarde éprouvées sur
  obioucounting. Tu ne pars pas de zéro.

## Les risques, par ordre d'importance

### 1. Le produit, c'est le contenu, pas la carte

Un itinéraire utile demande une trace propre, des stats justes, un accès, un parking, des points
d'eau, des dangers, des photos créditées et une date de vérification. Compte **1 à 3 h de saisie
par itinéraire**, sans le terrain. Pour 100 itinéraires, ça fait **150 à 300 h**, soit plus que
tout le développement.

**À faire** : fixer un objectif de contenu **avant** de coder (30 sommets et 60 itinéraires au
lancement), chronométrer la saisie dès la phase 2 et optimiser l'admin sur ce chiffre. Mieux vaut
un massif couvert à fond que 200 sommets à moitié renseignés.

### 2. La concurrence existe, et elle est gratuite

- **Camptocamp.org** fait *exactement* ce modèle : sommets → itinéraires → sorties, communautaire,
  gratuit, très complet en Alpes, avec une API.
- **Visorando**, **Komoot**, **AllTrails**, **IGNrando'** couvrent la randonnée grand public avec
  des applis mobiles et des millions de traces.
- **Altituderando**, les offices de tourisme et les topos locaux couvrent déjà le Dévoluy.

Sans différence claire, pourquoi venir ici ? Pistes réalistes, à choisir **explicitement** :

- **La curation plutôt que la quantité** : peu d'itinéraires, tous vérifiés et datés, rédigés pour
  quelqu'un qui ne connaît pas le coin.
- **Accessible aux débutants** : lisibilité, conseils concrets, transports en commun, sans jargon
  alpin.
- **Nativement pensé pour l'IA** : le MCP comme canal principal, pas comme gadget.
- **Un partenariat local** : une commune, un office de tourisme ou une section CAF qui co-produit ou
  finance le contenu.

### 3. Responsabilité juridique et sécurité

Publier « par ici pour monter à 2 789 m » engage. Si une information est périmée (éboulement,
passage équipé retiré, sentier fermé) et qu'un accident arrive, la question se posera.

- Avertissement clair, **date de vérification visible**, signalements traités vite.
- **Saisonnalité** : de novembre à mai, un sommet à 2 700 m relève de l'alpinisme hivernal. Le site
  doit afficher les mois praticables et un bandeau hors saison, sans jamais laisser croire qu'une
  trace d'été vaut en hiver.
- Se renseigner sur une **assurance responsabilité civile** adaptée à l'éditeur du site.

### 4. Les droits sur les données

- **Traces et descriptions d'autres sites** : les bases de données sont protégées (droit *sui
  generis*). Reprendre les GPX de Visorando ou les textes de Camptocamp (CC BY-SA, qui impose
  attribution et partage à l'identique) n'est pas neutre. **Uniquement tes propres traces**, ou avec
  une licence compatible et une attribution.
- **Fonds IGN SCAN 25** : clé personnelle, et payant pour une offre commerciale grand public. Le
  Plan IGN et les photos aériennes restent libres.
- **OpenStreetMap** (si utilisé) : licence ODbL, attribution et partage à l'identique des données
  dérivées.
- **Photos** : crédit et licence pour chacune.

### 5. Le MCP admin en écriture est une surface d'attaque

Un assistant qui peut écrire dans le CMS et qui lit des contenus rédigés par des inconnus
(signalements) peut être manipulé par **injection de prompt**. D'où le choix structurant de
l'architecture : le rôle IA **ne peut que créer ou modifier des brouillons**, jamais publier ni
supprimer, et chaque brouillon IA passe devant un humain. **Ne lâche pas ce garde-fou pour gagner
du temps.**

Autre point : claude.ai privilégie OAuth pour les connecteurs personnalisés (les jetons statiques
arrivent en bêta). Directus gère les deux, mais il faut tester chaque client visé.

### 6. « Sans coder » : vrai pour le contenu, faux pour le schéma

Directus permet de modifier le modèle de données en quelques clics, **y compris en production**.
C'est un piège : un champ renommé casse le site public, le MCP et les exports. Règle posée dans
l'architecture : **schéma modifié en staging, snapshot versionné, application au déploiement**. Les
éditeurs n'ont pas accès au schéma.

### 7. Montres connectées : le GPX suffit, le reste est un gouffre

- Le **GPX** s'importe presque partout : Garmin Connect, Suunto, Coros, Komoot, OsmAnd, IGNrando'.
- L'**envoi direct vers la montre** (« Envoyer vers Garmin ») passe par des programmes partenaires
  (Garmin Connect Developer Program, Suunto API) avec validation par la marque. **Pas au MVP.**
- L'**Apple Watch** passe généralement par une app tierce pour les traces GPX. À documenter dans le
  guide, pas à résoudre.
- Le **FIT** est faisable avec le SDK Garmin, mais à valider sur de vraies montres avant de le
  promettre.

### 8. Sur-fréquentation et environnement

Rendre un itinéraire très visible, c'est aussi remplir un petit parking de col et déranger la faune
(tétras-lyre, zones de quiétude). Prévois un champ « zone sensible / réglementation » et un ton qui
invite au respect. C'est aussi un argument pour les partenaires locaux.

### 9. Ta charge de travail

Obiou Sommets est un **site de contenu public** et un loisir : une erreur coûte une correction, pas
une fuite de données sensibles. Le processus n'a pas à être aussi lourd que pour une application qui
manipule des données privées.

**Je te recommande un processus proportionné** : PRD d'une ou deux pages, une revue par PR, releases
groupées par fonctionnalité. Garde la rigueur maximale pour trois zones seulement : les permissions
du rôle IA, le pipeline GPX (les chiffres affichés) et les sauvegardes. Sinon, deux projets exigeants
en parallèle risquent d'en ralentir un, voire les deux.

### 10. Dépendances et hébergement

- **Directus a changé de licence deux fois** (BSL en 2023, MSCL en 2026). C'est gratuit pour ce
  projet, mais pas éternellement garanti. Mitigation intégrée : le site public lit Postgres via des
  vues SQL, donc l'admin est remplaçable (Payload, par exemple) sans toucher au front.
- **Facture Railway** : ajouter web, cms, PostGIS et un bucket peut faire passer la facture totale
  d'environ 5 € à 20–35 €/mois, **ce qui touche le seuil fixé dans ta décision d'hébergement** (VPS
  envisageable au-delà d'environ 34 € avec 3 apps). À mesurer après un mois, pas à anticiper.
- **Minutes GitHub Actions** : obioucounting a déjà épuisé le quota mensuel. Un dépôt **public**
  pour ce projet règle la question et ajoute la protection de branche.
- **Sous-domaine d'obiou.eu** : bien pour démarrer. Deux effets à connaître : pour Google, un
  sous-domaine est quasiment un site distinct (peu de bénéfice SEO de l'apex), et la marque
  « obiou.eu » porte aussi une autre application. Si le projet prend, un domaine dédié sera plus
  lisible.

---

## Ce que je changerais par rapport à la demande initiale

| Demande | Recommandation | Pourquoi |
|---|---|---|
| Interface utilisateur (comptes ?) | **Pas de comptes au lancement**, favoris locaux | Zéro RGPD de comptes, zéro friction. Comptes si la demande apparaît |
| Télécharger « le chemin de son choix » | Itinéraires **prédéfinis** au MVP | Composer montée A + descente B demande un graphe de segments : v2 |
| MCP pour les deux types d'utilisateurs | **Oui**, public en lecture seule, admin en brouillons seulement | Valeur forte, risque maîtrisé |
| Admin sans code | **Oui** pour le contenu, **non** pour le schéma | Évite de casser la prod en renommant un champ |
| Montres connectées | **GPX + guide d'import**, FIT si validé, pas d'envoi direct | Les intégrations directes demandent des partenariats |
| Tous les sommets | **Un massif pilote** complet au lancement | La qualité perçue vient de la complétude |

## Questions à trancher avant de coder

1. **Pourquoi quelqu'un choisirait ce site plutôt que Camptocamp ou Visorando ?** En une phrase.
2. **Qui produit le contenu**, à quel rythme, et d'où viennent les traces (droits) ?
3. **Modèle économique** : bénévole, partenariat local, publicité, affiliation ? Ça conditionne
   SCAN 25, Open-Meteo et le ton du site.
4. **Nom et domaine** : `sommets.obiou.eu`, ou autre chose ?
5. **Échelle de cotation** : SAC T1–T6 (recommandée) ou la cotation FFRandonnée ?

## Verdict

**Vas-y, mais dans cet ordre : positionnement et contenu d'abord, technique ensuite.** Commence par
un massif, 30 sommets vérifiés, GPX propres, zéro compte, MCP public dès le lancement et MCP admin
bridé aux brouillons. Lance en avril 2027, avant la saison. Si les téléchargements et les usages
MCP décollent pendant l'été, tu auras les données pour décider de la suite : comptes, FIT, autres
massifs, domaine dédié.
