# Guide : Résoudre le Problème de Connexion MongoDB Atlas

## ✅ Diagnostic

- ✅ Cluster MongoDB Atlas : **ACTIF**
- ✅ Network Access : `0.0.0.0/0` **ACTIF**
- ✅ Résolution DNS SRV : **FONCTIONNE** (3 serveurs détectés)
- ❌ Connexion TCP : **BLOQUÉE** (`read ECONNRESET`)

**Conclusion** : Le problème vient probablement du **Firewall Windows** ou d'un **proxy/VPN**.

## 🔧 Solution 1 : Désactiver Temporairement le Firewall (TEST)

### Étape 1 : Désactiver le Firewall

1. Ouvrez **"Paramètres Windows"** (Windows + I)
2. Allez dans **"Sécurité Windows"**
3. Cliquez sur **"Pare-feu et protection réseau"**
4. Cliquez sur votre réseau actif (ex: "Réseau privé")
5. **Désactivez** temporairement le pare-feu
6. **⚠️ IMPORTANT** : Réactivez-le après le test !

### Étape 2 : Tester la Connexion

```bash
node test-connection-timeout.js
```

### Étape 3 : Si ça Fonctionne

1. **Réactivez le firewall**
2. Créez une règle pour autoriser Node.js :
   - Windows Security → Firewall → Paramètres avancés
   - Règles de trafic entrant → Nouvelle règle
   - Programme → Parcourir → Sélectionnez `node.exe` (généralement dans `C:\Program Files\nodejs\`)
   - Autoriser la connexion
   - Appliquez à tous les profils

## 🔧 Solution 2 : Tester depuis un Hotspot Mobile

1. Connectez votre ordinateur à un **hotspot mobile** (téléphone)
2. Testez : `node test-connection-timeout.js`
3. Si ça fonctionne → C'est un problème de réseau local/firewall

## 🔧 Solution 3 : Utiliser MongoDB Local (Solution de Contournement)

Si MongoDB Atlas ne fonctionne toujours pas, utilisez MongoDB local pour continuer le TP :

### Option A : MongoDB Atlas (Recommandé mais bloqué)
- Nécessite de résoudre le problème de firewall

### Option B : MongoDB Local (Fonctionne immédiatement)

1. **Installez MongoDB Community Server** :
   - Téléchargez : https://www.mongodb.com/try/download/community
   - Installez avec les options par défaut
   - MongoDB démarrera automatiquement comme service

2. **Mettez à jour le fichier `.env`** :
   ```env
   MONGODB_URI=mongodb://localhost:27017
   ```

3. **Testez** :
   ```bash
   node test-mongodb.js
   ```

4. **Démarrez le serveur** :
   ```bash
   node exam.js
   ```

## 📊 Collections MongoDB

**Bonne nouvelle** : Je vois dans MongoDB Atlas que :
- ✅ Base de données `auth_db` existe déjà
- ✅ Collection `examen` existe (ne gêne pas le système)

Les collections nécessaires seront créées automatiquement :
- `users` - lors de la première inscription
- `sessions` - lors de la première connexion réussie
- `refreshTokens` - lors de la première connexion réussie

## 🎯 Recommandation

Pour continuer le TP rapidement :
1. **Utilisez MongoDB local** (Solution 3 - Option B)
2. Une fois le TP terminé, résolvez le problème de firewall pour MongoDB Atlas

Pour le TP, MongoDB local fonctionne parfaitement et est même plus rapide.

## 🧪 Test Final

Après avoir configuré MongoDB local :

```bash
# Terminal 1
node pepper-service.js

# Terminal 2  
node exam.js
```

Vous devriez voir :
- ✅ "Connecté à MongoDB"
- ✅ "Pepper récupéré avec succès"
- ✅ "Serveur démarré sur le port 3006"

