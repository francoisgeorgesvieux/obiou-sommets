# Fiche : Publier aussi les sorties sans sommet

> Statut : **validée** · Rédigée le 2026-11-25 · Validée le 2026-11-26 par le propriétaire

## Problème

Le site est construit autour d'un modèle « sommet → itinéraires » : d'après docs/05, un itinéraire
doit avoir au moins un sommet, et la région, le pays et le fond de carte viennent du sommet.
Le schéma Directus n'impose pas le sommet (le champ est facultatif, vérifié le 2026-11-25), mais un
itinéraire sans sommet n'aurait aujourd'hui ni région, ni pays, ni fond de carte. Une partie des sorties que le propriétaire veut publier n'ont pas de sommet :
sentiers côtiers coréens (Jeju Olle, Haeparang-gil), calanques, balades vers un site naturel. Avec le
modèle actuel, on ne peut pas les saisir correctement. Il vaut mieux trancher maintenant, avant
la saisie du contenu et avant d'écrire les pages publiques, qui dépendent toutes du modèle.

## Ce que voit l'utilisateur

1. **Visiteur** : la carte montre **toutes les sorties** et plus seulement les sommets. Un sommet
   s'affiche comme un repère qui regroupe ses itinéraires. Une sortie sans sommet s'affiche par son
   point de départ (ou par sa trace quand on zoome).
2. Il filtre par type (sommet, sentier côtier, balade…), puis par cotation, durée et D+.
3. Il ouvre une fiche itinéraire, qui a la même forme avec ou sans sommet : trace, profil,
   statistiques, téléchargement.
4. **Éditeur** : dans l'admin, le champ « Sommets » de l'itinéraire devient facultatif. S'il est
   vide, la région (et donc le pays et le fond de carte) se renseigne sur l'itinéraire.

## Périmètre

**On fait :**
- Itinéraire **sans sommet** possible : `sommets` devient facultatif, et l'itinéraire reçoit
  `region` (obligatoire si aucun sommet) et `fond_carte`.
- Un champ **`categorie`** sur l'itinéraire : `sommet` · `cotier` · `balade` · `itinerance`. Liste
  courte, extensible plus tard.
- Adresse canonique **`/itineraires/[slug]`** pour toute fiche itinéraire (`/en/routes/[slug]`). La
  fiche sommet liste les siens. On ne fait plus d'adresse imbriquée `/sommets/x/y`, qui n'a pas de
  sens sans sommet.
- Mise à jour de docs/05, du schéma Directus et des vues prévues. Le hook de publication n'exige
  déjà aucun sommet.

**On ne fait pas (cette fois) :**
- **Les grands sentiers en étapes** (Haeparang-gil : 50 tronçons, Jeju Olle : 27) comme objet à
  part entière. Chaque tronçon parcouru est un itinéraire `itinerance` dont le nom porte le numéro
  (« Jeju Olle 15 : Hallim → Gonae »). Une collection `sentiers` qui regroupe les étapes dans
  l'ordre viendra si la page « tout le sentier » devient utile.
- Les autres sports (course, vélo) : la cotation SAC et la durée DIN 33466 sont faites pour la
  marche.
- Les contributions d'autres personnes (voir question 3).

## Choix de design

- **L'itinéraire devient l'objet central, et le sommet un regroupement facultatif.** On écarte un
  objet générique « lieu » qui remplacerait le sommet : il compliquerait la fiche sommet, qui reste
  le bon point d'entrée en montagne, pour un gain faible.
- **La cotation SAC reste la même pour tout.** Un sentier côtier est en T1 ou T2. On écarte une
  deuxième échelle « facile, moyen, difficile » : deux échelles sur un même site se comparent mal.
- **Le nom du site ne change pas pour l'instant** (Obiou Sommets, `sommets.obiou.eu`). Les sommets
  restent le cœur du contenu, et changer de domaine coûte cher (certificats, DNS, SEO). C'est à
  revoir si les sorties sans sommet deviennent majoritaires.

## Comment on saura que c'est fini

- [ ] Dans un Directus local, on enregistre et publie un itinéraire sans sommet en FR et EN, et le
      pipeline GPX calcule ses champs.
- [ ] Un itinéraire avec sommet garde exactement le comportement actuel.
- [ ] `schema apply --dry-run` sur la base de production (copie locale) ne prévoit **aucune
      suppression** de données.
- [ ] docs/05 et `CLAUDE.md` décrivent le nouveau modèle.

## Décisions du propriétaire (2026-11-26)

1. **Catégories** `sommet` · `cotier` · `balade` · `itinerance` : d'accord pour l'instant, à revoir
   s'il en voit une autre.
2. **Grands sentiers en étapes** : on attend. D'abord soigner la carte et les informations, la page
   « tout le sentier » viendra ensuite.
3. **Ouvert à tous en lecture et en téléchargement**, sans contributions d'autres personnes : il
   faudrait les gérer, et ce n'est pas prêt. D7 inchangée.
4. **Le nom « Sommets » reste** : il couvre les vrais sommets et les sommets personnels, ce qu'on
   accomplit.
