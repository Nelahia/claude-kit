---
name: session-handoff
description: Prépare et exporte le contexte technique de la session en cours dans un fichier handoff.md à la racine du projet, pour reprise par une session B. À utiliser quand l'utilisateur demande "le handoff", "active le skill de transition", ou invoque /session-handoff.
---

# Session Handoff

Exécuter de manière autonome, sans demander confirmation :

1. Analyser l'historique récent de la session, les fichiers modifiés et l'état des tests.
2. Créer (ou écraser) `handoff.md` à la racine du projet en suivant **scrupuleusement** le
   modèle ci-dessous.
3. Remplir de manière hyper-concise (bullet points, pas de phrases d'introduction).

## Modèle de `handoff.md`

```markdown
# 🔄 CLAUDE CODE - SESSION HANDOFF

## 🎯 Objectif Principal
- [But final de la tâche en cours]

## 🛠️ État Actuel & Fichiers Modifiés
- **Fichiers touchés :** `chemin/fichier1.ext`, `chemin/fichier2.ext`
- **Modifications récentes :** [Ce qui vient d'être fait]
- **Statut des tests :** [🟢 Validés / 🔴 En échec (Préciser le message d'erreur) / 🟡 Non testés]

## 🚧 Blocages & Points d'Attention
- [Bug en cours, comportement étrange ou contrainte technique à garder en tête]

## ⏭️ Prochaines Étapes Immédiates
1. [Action EXACTE à faire en ouvrant la Session B et fichier cible]
2. [Étape suivante]

---
*Fichier de transition de session. Session B : Exécutez le travail puis supprimez ce fichier une fois assimilé.*
```
