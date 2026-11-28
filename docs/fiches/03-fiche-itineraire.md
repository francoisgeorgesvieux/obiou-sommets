# Fiche : Afficher la fiche d'un itinéraire

> Statut : **à valider** · Rédigée le 2026-11-28 · Validée le <date> par le propriétaire

## Problème

Une sortie saisie et publiée dans l'admin n'est visible nulle part : `sommets.obiou.eu` n'affiche
qu'une carte vide. Le visiteur (toi d'abord, sur ton téléphone au parking ou la veille au soir) ne
peut pas répondre à la seule question qui compte : « est-ce que cette sortie est pour moi, et par où
on passe ? ». Le pipeline GPX calcule déjà la trace, le profil et les statistiques ; il ne manque
que la page qui les montre.

## Ce que voit l'utilisateur

Maquettes : `design/FicheItineraire.dc.html` (bureau), `FicheItineraireMobile` et
`FicheItineraireMobileSuite` (téléphone).

1. Il ouvre `/itineraires/voie-normale-par-le-vallon` (lien partagé, ou plus tard depuis la carte).
2. **En haut** : fil d'Ariane (région › sommet s'il y en a un), nom, cotation SAC avec son libellé,
   catégorie, type (aller-retour, boucle, traversée), date de la dernière sortie.
3. **Six chiffres** : distance, D+, D−, durée estimée, altitude min et max. Le kilomètre-effort à
   côté de la cotation (décision du 18 septembre).
4. **La carte** avec la trace, le départ (P), les sommets, les POI et les numéros d'étapes.
5. **Le profil altimétrique** sous la carte. Le survoler (ou le toucher) place un repère sur la
   carte et affiche « 2 240 m · km 5,1 ».
6. **Le texte** : chapeau, étapes (km et altitudes), points de vigilance, équipement, eau et abris,
   accès (parking, route, transports), ma sortie (date, conditions, récit), réglementation et mois
   praticables s'ils sont remplis.
7. **Télécharger la trace** : GPX, KML, GeoJSON, en un clic.
8. **Autres itinéraires** du même sommet, en bas.
9. La phrase « Récit d'une sortie personnelle, pas un topo officiel… » en pied de fiche.

Sur téléphone, même ordre en une colonne : carte, chiffres principaux, profil, bouton de
téléchargement, puis le texte.

## Périmètre

**On fait :**
- La page `/itineraires/[slug]`, rendue côté serveur (lisible sans JavaScript, sauf carte et profil).
- **Les vues SQL dont elle a besoin** (feature 2 réduite au nécessaire) : `public_itineraires`,
  `public_itineraires_sommets`, `public_etapes`, `public_itineraires_poi`, `public_points_depart`,
  `public_sorties`, `public_exports`, plus un rôle Postgres en lecture seule et les types dans
  `packages/domain`. Le site lit ces vues, jamais Directus.
- Une page 404 propre pour un slug inconnu ou un itinéraire non publié.
- Les liens de téléchargement directs vers les exports déjà produits par le pipeline.
- Titre, description et `noindex` tant que le site n'est pas ouvert.

**On ne fait pas (cette fois) :**
- La version anglaise `/en/routes/…` (feature 9) : la page est écrite pour la recevoir, sans plus.
- Le compteur de téléchargements et le guide d'import sur la montre (feature 4).
- Le fond MapTiler hors de France (feature 5), voir question 2.
- Favoris (15), signalement (14), coloration des pentes de plus de 30 % sur le profil, photos.
- La fiche sommet et la carte de toutes les sorties (feature 6).

## Choix de design

- **Profil sous la carte, jamais à côté**, et lié à elle par le survol : sur téléphone il n'y a pas
  la place pour deux colonnes, et le lien carte-profil est ce qui rend le profil utile.
- **Les chiffres viennent des vues, pas d'un recalcul dans la page** : la durée affichée est ta
  correction si tu l'as saisie, sinon le calcul DIN 33466, comme prévu dans docs/05.
- **Carte et profil chargés après le texte** : MapLibre pèse lourd ; le texte et les chiffres
  s'affichent d'abord, et la fiche reste lisible si WebGL manque (déjà le cas sur la page d'accueil).
- **Une section vide ne s'affiche pas** (pas de « Équipement : — ») : beaucoup de champs sont
  facultatifs et les premières fiches seront courtes.
- **Écarté : lire Directus directement** depuis le site, plus rapide à écrire mais contraire à
  l'invariant « le site ne dépend pas de Directus à l'exécution ».

## Comment on saura que c'est fini

- [ ] Un itinéraire de test (trace synthétique, aucune donnée réelle dans le dépôt) publié dans un
      Directus local s'affiche en entier ; repassé en brouillon, il donne une 404.
- [ ] Un itinéraire **sans sommet** (sentier côtier) s'affiche aussi, fil d'Ariane par la région.
- [ ] Les vues ne laissent sortir aucun champ privé (`gpx_source`, `anomalies`, options du
      pipeline) : test de contrat sur les colonnes, et le rôle lecture seule ne peut rien écrire.
- [ ] Playwright sur les cinq navigateurs : chiffres, étapes et liens de téléchargement présents ;
      carte dessinée (mesure des pixels) et trace visible ; survol du profil qui déplace le repère.
- [ ] Sans WebGL, la page reste servie avec texte, chiffres et téléchargement.
- [ ] Démo sur staging avec une de tes sorties, avant la production (changement visible du site).

## Questions ouvertes

1. **Vues SQL dans cette feature** : je propose de faire la feature 2 en même temps, limitée à ce
   que la fiche affiche, plutôt qu'une fiche et une livraison à part pour un socle invisible.
   D'accord ?
2. **Sorties en Corée avant la feature 5** : la carte IGN y est vide. Je propose un repli simple sur
   OpenTopoMap hors de France dès maintenant (déjà prévu comme repli en D9), MapTiler viendra avec la
   feature 5. Ou on attend la feature 5 et les fiches coréennes restent sans fond de carte ?
3. **Heure de départ de « Ma sortie »** : la maquette l'affiche (« départ 6 h 10 »). Les sorties
   publiques sont décidées, mais l'heure en dit un peu plus sur tes habitudes. Je propose de
   l'afficher ; dis-moi si tu préfères garder seulement la date et la durée.
