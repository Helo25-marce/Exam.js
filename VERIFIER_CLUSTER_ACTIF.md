# Comment Vérifier si le Cluster MongoDB Atlas est Actif

## ⚠️ Problème : `read ECONNRESET`

Cette erreur indique souvent que le cluster est **en pause**.

## ✅ Vérification Rapide

### Étape 1 : Vérifier l'État du Cluster

1. Dans MongoDB Atlas, allez dans **"Database"** (menu de gauche)
2. Regardez votre cluster **"Projet"**
3. **Cherchez ces indicateurs** :

#### ✅ Cluster ACTIF (Vert) :
- Vous voyez **"Data Size: 115.5 MB"** (comme dans votre capture)
- Les boutons **"Connect"** et **"Edit configuration"** sont visibles
- **MAIS** cela ne garantit pas qu'il soit actif !

#### ⏸️ Cluster EN PAUSE (Gris) :
- Vous voyez un message **"Cluster is paused"**
- Un bouton **"Resume"** est visible
- **Action** : Cliquez sur **"Resume"** et attendez 1-2 minutes

### Étape 2 : Vérifier dans "Monitoring"

1. Cliquez sur **"View monitoring"** (ou l'icône de graphique)
2. Si vous voyez des graphiques avec des données récentes → Cluster actif
3. Si vous voyez "No data" ou des graphiques vides → Cluster en pause

### Étape 3 : Vérifier l'État Exact

1. Cliquez sur les **3 points** (⋯) à côté de votre cluster
2. Regardez l'option **"Resume"** ou **"Pause"** :
   - Si vous voyez **"Resume"** → Le cluster est en pause → **Cliquez dessus**
   - Si vous voyez **"Pause"** → Le cluster est actif ✅

## 🔄 Après avoir Résumé le Cluster

1. **Attendez 1-2 minutes** pour que le cluster démarre complètement
2. **Testez la connexion** :
   ```bash
   node test-atlas-exact.js
   ```
3. Vous devriez voir : ✅ "Pinged your deployment. You successfully connected to MongoDB!"

## 📝 Note Importante

Même si vous voyez "Data Size: 115.5 MB", cela signifie seulement que vous avez des données. Le cluster peut toujours être en pause. Les clusters gratuits MongoDB Atlas se mettent automatiquement en pause après **1 heure d'inactivité**.

## 🆘 Si le Cluster est Déjà Actif

Si le cluster est actif mais que vous avez toujours l'erreur :

1. **Vérifiez Network Access** : `0.0.0.0/0` doit être "Active" (vert)
2. **Attendez 5-10 minutes** après avoir modifié Network Access
3. **Vérifiez le mot de passe** dans Database Access
4. **Essayez depuis un autre réseau** (hotspot mobile) pour exclure un problème de firewall local

