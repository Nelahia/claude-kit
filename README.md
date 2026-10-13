# usage-bars

Des barres de progression arrondies, sobres et en dégradé, au-dessus du prompt de **Claude Code Desktop** : contexte, fenêtre de 5 h, fenêtre de 7 jours, et la dépense de la session.

![usage-bars au-dessus du prompt de Claude Code Desktop](docs/screenshot.png)

## Installation

Dans un terminal Claude Code :

```
/plugin install usage-bars --marketplace Nelahia/claude-usage-bars
```

Réponds `y` pour ajouter la marketplace, puis choisis le scope `user`. Le mod est actif tout de suite, et dans chaque session lancée ensuite, y compris dans l'app desktop.

> Le repo est privé : sur une autre machine, lance d'abord `gh auth login`.

## Ce qui s'affiche

| Élément | Source | Détail |
| --- | --- | --- |
| `context` | fenêtre de contexte du modèle | Avec une clé API, les tokens s'affichent aussi (`42k/200k`). |
| `5h` / `7d` | limites d'usage de l'abonnement | Le `↻` indique le temps avant le reset. |
| `spend` | plafond de dépense d'une gateway | Seulement si le compte en a un. |
| `spent` | coût de la session, comme `/cost` | Ne couvre pas le mois entier. |

Une barre passe du dégradé normal à une teinte chaude (terre cuite vers rouge brique) au-delà de 85 %.

## Personnalisation

Tout est dans `hooks/` :

- `register.tsx` : `BAR_WIDTH` et `BAR_HEIGHT` règlent la taille des barres, `TRACK` la couleur de la piste.
- `gauge.ts` : `PALETTES` et `HOT` contiennent les dégradés de chaque jauge. Les seuils et le format du reset sont aussi là.

La mise en page compte en cases de caractères (environ 8 px). Si tu allonges les barres, vérifie que le bloc ne déborde pas.

## Limites

- Rendu prévu pour l'**app desktop** : les barres sont des `Svg`. Dans un terminal classique, le mod ne dessine rien.
- Les fenêtres 5 h / 7 j n'apparaissent qu'avec un abonnement, et seulement après la première réponse de l'API.

## Structure

```
.claude-plugin/   plugin.json + marketplace.json
hooks/            gauge.ts (logique pure) · register.tsx (affichage)
types/            contrat d'état du mod
```

## Licence

Usage personnel. Aucune licence n'est précisée pour l'instant.
