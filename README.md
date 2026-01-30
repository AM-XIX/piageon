# 🐦 Piageon : L'Île aux Pigeons

**Thème : Autres Mondes** | *Une simulation de survie politique aviaire.*

> Les pigeons comme vous n'en avez jamais vu ! Entre IA et loi de la nature : plongez au cœur de l'Île aux Pigeons, un lieu de non-droit où chacun veut imposer son régime politique, mais où cette recherche absolue pourrait bien mener à leur perte...

## Le Projet
**Piageon** est un monde virtuel conçu pour explorer l'interaction entre plusieurs modèles algorithmiques. Le projet propose une exploration libre d'une île où des pigeons autonomes évoluent, s'organisent et s'affrontent sur le terrain politique.<br>
[Présentation](https://www.figma.com/deck/DUGsyRDwxaQwB1xq0HdGjF/PIAGEON?node-id=1-42&t=nFXCsQVsOrCzKDZA-1) et lien du projet à venir.

### Direction Artistique
* **Style** : Low-poly (formes simples, géométrie apparente).
* **Rendu** : Stylisé et explicite, mettant l'accent sur la compréhension des flux de population.
* **Animations** : Rig complet (Idle, Fly, Attacks, Converts, Dies).

## Architecture Algorithmique
Le projet repose sur l'imbrication de modèles mathématiques pour simuler la vie et l'organisation sociale.

### Systèmes de Population
| Modèle | Rôle |
| :--- | :--- |
| **Automates Cellulaires** | Une double couche (Life-like et Politique) qui gère l'apparition/disparition des groupes et les états idéologiques. |
| **Boids** | Gère les déplacements continus via les règles de *séparation*, *alignement* et *cohésion*. |
| **Algorithmes Génétiques** | Gère l'évolution. À chaque mort, les gènes (comportement, vol, survie) sont transmis par croisement et mutation. |
| **Réseaux de Neurones** | Une heuristique décisionnelle basée sur des vecteurs d'attraction pour choisir entre allié et proie. |


## Génération Procédurale du Monde

L'île est générée procéduralement pour offrir un terrain complexe et organique.

### Géométrie et Relief
* **Fractales de Mandelbrot** : Génération d'une carte de densité structurant le relief et les motifs au sol.
* **Bruit Simplex** : Casse la forme cubique initiale pour créer des parois rocheuses et des strates géologiques.
* **Bruit de Perlin** : Ajoute des micro-variations au vol des pigeons et sculpte les détails de l'herbe.

### Végétation (L-System)
Les buissons sont générés par une **grammaire de réécriture**.
* Chaque itération développe des branches et bifurcations.
* L'ajout d'aléas sur les angles et échelles garantit une végétation variée sans répétition parfaite.

## Logique Politique
Les pigeons ne se contentent pas de voler : ils cherchent à dominer.
* **Conversion** : Capacité à transformer les individus neutres ou opposés à leur propre idéologie.
* **Attaque** : Conflits physiques lorsque la diplomatie algorithmique échoue.
* **Pression Évolutive** : Les partis les plus instables disparaissent, laissant place à de nouvelles dynamiques génétiques.
