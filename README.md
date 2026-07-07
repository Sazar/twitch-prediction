# 🔮 Twitch Prediction Overlay

Widget overlay StreamElements qui affiche automatiquement les **prédictions Twitch** de ta chaîne en temps réel, avec un design inspiré du style officiel Twitch.

![Preview](preview.png)

## ✨ Fonctionnalités

- Affichage automatique dès qu'une prédiction démarre
- Barre de progression animée pour chaque choix
- Affichage du nombre de points et de participants par option
- Timer de compte à rebours
- Résultat mis en évidence (option gagnante / perdante)
- Disparition automatique après la résolution
- Design inspiré du style Twitch officiel avec des couleurs bleue/rose
- Entièrement personnalisable via les champs StreamElements

## 📋 Prérequis

- Un compte [StreamElements](https://streamelements.com)
- Un accès à l'**Overlay Editor** de StreamElements
- Les **Twitch Channel Points** activés sur ta chaîne
- Être affilié ou partenaire Twitch

## 🚀 Installation

### 1. Créer un overlay dans StreamElements

1. Va sur [StreamElements Overlay Editor](https://streamelements.com/overlay/)
2. Crée un nouveau overlay ou ouvre un existant
3. Clique sur **"Add Widget"** → **"Custom Widget"**

### 2. Ajouter les fichiers

Dans l'éditeur de widget personnalisé, colle le contenu de chaque fichier dans l'onglet correspondant :

| Onglet StreamElements | Fichier à utiliser |
|---|---|
| **HTML** | `widget.html` |
| **CSS** | `widget.css` |
| **JS** | `widget.js` |
| **Fields** | `fields.json` |

### 3. Configurer les champs

Une fois le widget ajouté, clique sur l'engrenage ⚙️ pour accéder aux options :

- **Position** : Ajuste la position X/Y du widget dans l'overlay
- **Durée d'affichage après résolution** : Temps en secondes avant que le widget disparaisse
- **Couleur Option 1** : Couleur de la première option (défaut : bleu Twitch)
- **Couleur Option 2** : Couleur de la deuxième option (défaut : rose/violet Twitch)
- **Afficher le timer** : Activer/désactiver le compte à rebours

### 4. Tester le widget

1. Lance une prédiction sur ta chaîne Twitch
2. Le widget doit apparaître automatiquement
3. Il se met à jour en temps réel avec les votes
4. À la résolution, l'option gagnante est mise en valeur
5. Le widget disparaît après le délai configuré

## 🎨 Structure des fichiers

```
twitch-prediction/
├── README.md          # Documentation
├── widget.html        # Structure HTML du widget
├── widget.css         # Styles et animations
├── widget.js          # Logique JavaScript + événements SE
└── fields.json        # Champs de configuration StreamElements
```

## ⚙️ Événements StreamElements utilisés

Le widget écoute les événements natifs de StreamElements :

- `event:test` – Pour tester le widget
- `prediction-begin` – Début d'une prédiction
- `prediction-progress` – Mise à jour des votes en cours
- `prediction-lock` – Prédiction verrouillée (fin de vote)
- `prediction-end` – Résultat de la prédiction

> **Note :** StreamElements reçoit ces événements via le EventSub Twitch. Assure-toi que ton compte StreamElements est bien lié à ta chaîne Twitch avec les bonnes permissions.

## 🖌️ Personnalisation avancée

Tu peux modifier `widget.css` pour ajuster :
- Les couleurs des options dans les variables CSS (`:root`)
- Les animations d'entrée/sortie
- La taille et la police du texte
- L'arrondi des coins et les effets de glassmorphism

## 📄 Licence

MIT License – Libre d'utilisation et de modification.

---

Fait avec ❤️ par [Swerkx](https://github.com/Sazar)
