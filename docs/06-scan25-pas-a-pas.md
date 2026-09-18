# D4 — Afficher la carte IGN SCAN 25 : la marche à suivre

> Préparé le 18 septembre 2026, à partir des documents officiels de l'IGN (liens en fin de page).
> À suivre en parallèle du reste : la carte SCAN 25 ne servira pas avant la phase 3 (site public).

## Ce qui change par rapport à l'architecture

L'architecture supposait qu'une **clé personnelle** suffisait pour un site non commercial. **C'est
faux**, d'après la licence de l'IGN (publiée le 21 juillet 2021, modifiée le 26 mars 2026) :

- **Un site web ouvert au public relève de l'« Usage Numérique Grand Public »**, même gratuit et sans
  publicité. La licence le définit comme une offre de services numériques « gratuits ou payants
  (application, page Web…) destinés au marché grand public ».
- **La clé gratuite en ligne ne couvre pas ce cas.** Elle est réservée à un usage professionnel ou
  associatif, et demande un numéro **SIRET**. Les particuliers ne peuvent pas télécharger ces données
  « même à des fins personnelles ».
- **Il faut une licence spécifique**, « souscrite auprès des unités commerciales de l'IGN », d'un an,
  « moyennant le paiement d'une redevance ».
- **Le prix sera probablement nul.** D'après le barème de 2021 (décision 2021-295), le forfait
  « streaming seul » est gratuit sous **10 millions de transactions par an**. Une transaction vaut
  16 tuiles, soit environ 160 millions de tuiles par an, très loin du trafic d'un site personnel.
  **Montant à faire confirmer par l'IGN** : ce barème vient d'un PDF scanné que je n'ai pas pu
  relire moi-même.
- **La vraie charge est administrative** :
  - un **relevé de consommation chaque trimestre**, au plus tard le 20 du mois qui suit, avec une
    **pénalité de 40 € par jour de retard** ;
  - des mentions obligatoires sur le site ;
  - aucune mise en cache des tuiles ;
  - une interdiction d'extraction à faire respecter.

**D4 n'est donc plus une formalité** : elle engage 4 relevés par an, pour toujours. L'étape 0 sert à
décider si ça vaut le coup.

## Étape 0 — Décider si le SCAN 25 en vaut la peine

| Fond | Coût et démarche | Ce qu'il apporte |
|---|---|---|
| **Plan IGN** (celui du site aujourd'hui) | gratuit, sans clé, rien à faire | fond clair et lisible |
| **Plan IGN HD** | gratuit, en licence ouverte **si** le test de l'IGN est concluant, annoncé « à partir de septembre » 2026 | ombrage du relief, végétation, bâti ; **pas de sentiers** |
| **Sentiers de randonnée balisés** (couche IGN) | annoncée pour fin 2026, sous **licence spécifique**, comme le SCAN 25 | les sentiers balisés |
| **SCAN 25** | licence grand public signée, 4 relevés par an | la carte topographique que les randonneurs connaissent |

**Ma recommandation** : lancer **sans** SCAN 25 (Plan IGN, plus le Plan IGN HD s'il ouvre), et
n'engager la démarche que si le SCAN 25 compte vraiment pour toi. Dans ce cas, commence tôt : les
demandes sont traitées à la main par l'IGN.

- [x] **Décidé le 18 sept. 2026 : sans SCAN 25 pour le moment.** Les étapes suivantes restent
  prêtes pour le jour où la question se reposera.

## Et avec une entreprise ?

Question posée le 18 sept. 2026 : ouvrir une entreprise, qui porterait ce site avec un projet
monétisé, permettrait-elle d'obtenir la licence ? **Non, pas à elle seule** :

- **Le SIRET ouvre la licence gratuite « usage final professionnel ou associatif »**, et celle-ci
  exclut expressément l'« Usage Numérique Grand Public ». Un site ouvert au public reste du grand
  public, qu'il soit publié par un particulier ou par une société. Il faudrait **la même licence
  grand public**, avec **les mêmes relevés trimestriels**.
- **Ce que l'entreprise pourrait changer** : la capacité à signer, si l'IGN refuse de contracter
  avec un particulier. L'étape 1 (un message, gratuit) répond à cette question.
- **Le risque inverse** : plusieurs services sont gratuits **parce que** le site est non
  commercial. C'est le cas de l'offre gratuite de MapTiler (D9) et d'Open-Meteo. Rattacher le site
  à une activité monétisée pourrait les rendre payants : relire leurs conditions avant.

L'entreprise se décide donc sur l'intérêt du projet monétisé, pas pour le SCAN 25.

## Étape 1 — Écrire à l'IGN pour lever les inconnues

Trois points ne sont pas tranchés par la documentation publique : l'accès d'un particulier sans
SIRET, le barème actuel, et la notion d'« offre similaire à celle de l'IGN », qui est interdite.
Sur ce dernier point, un site de randonnées avec traces téléchargeables ressemble-t-il à
IGNrando' ?

Passe par le **formulaire de contact de [cartes.gouv.fr](https://cartes.gouv.fr)**, ou par
`contact.geoservices@ign.fr`. Cette adresse est citée par la documentation, mais je n'ai pas pu
vérifier qu'elle mène aux unités commerciales.

- [ ] Message envoyé
- [ ] Réponse reçue, et conservée dans ton gestionnaire de documents

Modèle de message :

> Bonjour,
>
> Je souhaite afficher la carte SCAN 25 en fond de carte sur mon site personnel
> https://sommets.obiou.eu, un carnet de mes randonnées en montagne (Alpes françaises). Le site
> est non commercial, sans publicité ni collecte de données, et sans compte utilisateur.
>
> Usage prévu : consultation en ligne uniquement (streaming), dans une carte MapLibre, sans mise en
> cache ni téléchargement des tuiles, avec l'attribution IGN affichée en permanence. Audience
> attendue : quelques milliers de visites par an au lancement.
>
> Je comprends qu'il relève de la Licence Usage Numérique Grand Public. Pourriez-vous me confirmer :
>
> 1. qu'un particulier, sans numéro SIRET, peut souscrire cette licence, et comment ;
> 2. le barème applicable au forfait « streaming seul » pour un tel volume ;
> 3. les modalités des relevés trimestriels pour un usage aussi faible ;
> 4. qu'un site de récits de randonnée avec traces GPX téléchargeables n'est pas considéré comme
>    une « offre similaire à celle de l'IGN » ;
> 5. la couche à utiliser (GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR ?) et le délai de mise en place.
>
> Merci d'avance,
> [ton nom]

## Étape 2 — Compte cartes.gouv.fr

Le compte sert à la fois à gérer la clé et à envoyer les relevés trimestriels.

- [ ] Compte créé sur [cartes.gouv.fr](https://cartes.gouv.fr), avec **ton** adresse e-mail. Les
  avis de modification de la licence y arrivent : ils s'appliquent d'office si tu ne résilies pas.
- [ ] Profil complété selon ce que l'IGN t'a répondu à l'étape 1 (SIRET ou non).

## Étape 3 — Signer la licence

- [ ] Licence Usage Numérique Grand Public signée, forfait **« streaming seul »**. Les conditions
  particulières précisent ton identité, le type de licence, la date et le nombre de transactions
  autorisées.
- [ ] Date de signature notée : la licence dure **un an** à partir de cette date.
- [ ] Contrat rangé dans ton gestionnaire de documents.

## Étape 4 — Créer la clé et la restreindre

Dans cartes.gouv.fr : **Mes clés d'accès → Créer une clé d'accès → type HASH**.

La clé sera **visible** par tout visiteur qui inspecte la page : c'est normal pour une carte dans
un navigateur. On la restreint au domaine du site.

- [ ] Clé HASH créée.
- [ ] Filtre **Referer** posé. Dans ce filtre, les caractères `. - ( ) % + * ? [ ^ $` doivent être
  précédés d'un `%` :
  - production : `sommets%.obiou%.eu`
  - staging : `web%-staging%-6028%.up%.railway%.app`
- [ ] Vérification, **par moi** une fois la clé posée : une tuile demandée avec le bon Referer
  répond, une tuile demandée sans lui est refusée.

Le filtre Referer se contourne en dehors d'un navigateur. Il limite les abus, sans les empêcher.
Surveille donc la consommation (étape 7).

## Étape 5 — Poser la clé dans Railway, toi-même

Comme tous les secrets du projet, c'est **toi** qui la poses. Je ne la lis ni ne la saisis.

- [ ] Variable `NUXT_PUBLIC_IGN_SCAN25_KEY` posée sur le service `web`, en production et en staging.
  Je fournirai la commande exacte au moment de l'intégration (phase 3), sur le modèle de
  `infra/scripts/set-cms-secrets.sh`, et j'ajouterai la variable à `.railway/railway.ts` pour
  qu'un `config apply` ne la supprime pas.

Côté technique (pour moi, en phase 3) :
- flux WMTS : `https://data.geopf.fr/private/wmts?apikey=…` ;
- couche : `GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN25TOUR` ;
- jeu de tuiles : `PM_6_16` (zooms 6 à 16), images JPEG ;
- en France seulement, en fond au choix à côté du Plan IGN.

## Étape 6 — Les obligations sur le site (je m'en charge)

- [ ] Attribution sur la carte : « © IGN – [année d'édition] – Copie et reproduction interdite ».
- [ ] Dans les mentions légales : la mention prévue pour la licence grand public numérique
  (« L'offre intègre des Données Scan et/ou services pour lesquels… »).
- [ ] Dans la page de confidentialité : le paragraphe de l'IGN sur les données personnelles. Les
  navigateurs des visiteurs appellent directement les serveurs de l'IGN.
- [ ] Dans les conditions d'utilisation du site : interdiction d'extraire la carte.
- [ ] **Aucune mise en cache des tuiles SCAN 25**, service worker compris. Le mode hors ligne des
  maquettes n'affiche pas la carte : il est donc déjà compatible.
- [ ] **Pas de SCAN 25 dans une fiche PDF** ou un document téléchargeable : cela demande une autre
  licence, dite de reproduction graphique. L'impression sur papier, pour un usage privé, reste
  permise.

## Étape 7 — Les relevés trimestriels : le vrai engagement

À partir de la mise en ligne de la couche SCAN 25, envoie un relevé **chaque trimestre** depuis
cartes.gouv.fr, au plus tard le **20 avril, 20 juillet, 20 octobre et 20 janvier**. En cas de
retard, la pénalité est de **40 € par jour**.

- [ ] Quatre rappels créés dans ton agenda, quelques jours avant chaque échéance.
- [ ] Source des chiffres identifiée. L'API de statistiques de la Géoplateforme donne la
  consommation par clé : mensuelle, et par tranche de 5 minutes sur les 30 derniers jours.
  Je peux écrire un petit script qui prépare le relevé, ou planifier un rappel automatique.
- [ ] Prévenir l'IGN **un mois avant** tout pic de trafic prévisible (article dans la presse, par
  exemple).

## Étape 8 — Chaque année

- [ ] Renouveler la licence avant sa date anniversaire.
- [ ] Relire les avis de modification reçus par e-mail : ils s'appliquent d'office.

## Sources

- Licence SCAN 25, SCAN 100 et SCAN OACI (publiée le 21 juillet 2021, modifiée le 26 mars 2026) :
  https://data.geopf.fr/annexes/ressources/documentation/conditions-de-licence.pdf
- Barème de 2021, décision 2021-295 (PDF scanné, non relu directement) :
  https://www.ign.fr/publications-de-l-ign/institut/informations_legales_administratives/Decision_2021-295_tarification.pdf
- Accès aux données SCAN par clé (SIRET, particuliers) :
  https://cartes.gouv.fr/aide/fr/partenaires/ign/representations-cartographiques-souveraines/creation-cles-donnees-scan/introduction/
- Filtrage des clés (Referer, IP) :
  https://cartes.gouv.fr/aide/fr/guides-utilisateur/creation-des-cles-et-integration-sig/options-de-filtrage/
- Plan IGN HD et sentiers balisés (actualité du 9 juillet 2026) :
  https://cartes.gouv.fr/aide/fr/partenaires/ign/generalites-ign/actualites/2026-07-plan-ign-hd-et-sentiers/
- Conditions générales d'utilisation de cartes.gouv.fr : https://cartes.gouv.fr/cgu/
