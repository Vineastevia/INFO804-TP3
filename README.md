# Shader Gallery

**Author:** Taina Duquenoy

Galerie interactive en 3D explorant des shaders GLSL.
Le projet prend la forme d'une galerie virtuelle dans laquelle chaque tableau est un shader animé, réactif à la souris.

L'inspiration du projet est la suivante : [Etienne Pharabot - Shader Gallery](https://shader-gallery.etiennepharabot.fr/#)

---

## Présentation

L'application propose quatre tableaux :

| Titre | Description                                                      |
|-|------------------------------------------------------------------|
| **Ondulation** | Marbrage procédural déformé par la position de la souris         |
| **Attraction/Répulsion** | Système de particules avec inversion de force au clic            |
| **Kaleidoscope** | Symétrie radiale animée, rotation pilotée par la souris          |
| **Fractal** | Tunnel fractal IFS en raymarching, caméra orientée par la souris |

Certains tableaux ont des paramètres directement modifiables dans l'application.
Le paramétrage n'est cependant pas sauvegardé entre l'ouverture-fermeture. 

---

## Installation et lancement

### Prérequis

- [Node.js](https://nodejs.org/) v18 ou supérieur
- npm

### Lancement local

```bash
# Cloner le dépôt
git clone https://github.com/Vineastevia/INFO804-TP3.git
cd INFO804-TP3

# Installer les dépendances
npm install

# Démarrer le serveur
node server.js
```

L'application est accessible sur [Render.com : info804-tp3](https://info804-tp3.onrender.com/).

---

## Commentaires

### Récursion non supportée en GLSL

GLSL n'autorise pas la récursion, les fonctions ne peuvent pas s'appeler elles-mêmes. Les structures fractales qui semblent récursives sont donc implémentées comme des boucles itératives avec un nombre fixe de passes. Cela implique de choisir à l'avance une profondeur maximale et d'accepter que les détails fins au-delà de cette profondeur ne soient pas rendus.


### Raymarching (œuvre Fractal)

L'œuvre Fractal ne repose pas sur de la géométrie traditionnelle mais sur du **raymarching** : pour chaque pixel, un rayon est lancé depuis la caméra et avancé pas à pas jusqu'à ce qu'il intersecte une surface définie implicitement par une *distance estimator* (DE). La structure fractale est obtenue par un IFS (*Iterated Function System*),  une suite de transformations (repliement de boîte, inversion sphérique, rotation) appliquée itérativement.

Le coût de cette technique est directement proportionnel au nombre de **steps** (itérations du raymarching) et au nombre d'**itérations IFS** par évaluation de la DE.
Ces deux paramètres ont été réduits (48 steps, 5 itérations) pour maintenir des performances acceptables sur machine standard, au prix d'un niveau de détail légèrement inférieur.

### Gestion des performances - previews

Afficher quatre shaders animés simultanément en arrière-plan de la scène Three.js représentait une charge trop importante avec beaucoup de ralentissement/latence. La solution que j'ai utilisée : chaque shader est instancié une seule fois sur un canvas offscreen, cinq frames sont rendues pour éviter un canva vide/noir, le canvas est capturé en `THREE.CanvasTexture` et appliqué sur le mesh du cadre, puis l'instance WebGL est immédiatement libérée.

### Musique d'ambiance

La musique utilisée est libre de droit trouvée sur [Pixabay.com](https://pixabay.com/).