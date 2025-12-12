# Solution : Problème de Connexion MongoDB Atlas

## ✅ Ce qui est Configuré Correctement

- ✅ Cluster MongoDB Atlas : **ACTIF**
- ✅ Network Access : `0.0.0.0/0` est **ACTIF**
- ✅ Fichier `.env` : URI correcte
- ✅ Code : Utilise `ServerApiVersion.v1`

## ❌ Problème : `read ECONNRESET`

Cette erreur avec un cluster actif indique généralement un **problème de réseau local** :
- Firewall Windows bloque la connexion
- Proxy/VPN interfère
- Problème de DNS
- Connexion internet instable

## 🔧 Solutions à Essayer

### Solution 1 : Vérifier le Firewall Windows

1. Ouvrez **"Pare-feu Windows Defender"** (Windows Security → Firewall)
2. Cliquez sur **"Paramètres avancés"**
3. Vérifiez les règles de pare-feu pour Node.js
4. **Temporairement**, désactivez le pare-feu pour tester :
   - Windows Security → Firewall & network protection
   - Désactivez temporairement le firewall
   - Testez : `node test-connection-timeout.js`
   - **Réactivez le firewall après le test**

### Solution 2 : Tester depuis un Autre Réseau

1. Connectez-vous à un **hotspot mobile** (téléphone)
2. Testez : `node test-connection-timeout.js`
3. Si ça fonctionne → C'est un problème de réseau local/firewall

### Solution 3 : Vérifier le Proxy/VPN

1. Si vous utilisez un **VPN**, déconnectez-le temporairement
2. Si vous êtes sur un **réseau d'entreprise**, vérifiez les paramètres de proxy
3. Testez : `node test-connection-timeout.js`

### Solution 4 : Utiliser MongoDB Local (Temporaire)

Si MongoDB Atlas ne fonctionne toujours pas, vous pouvez temporairement utiliser MongoDB local :

1. Installez MongoDB localement (voir `INSTALLATION_MONGODB.md`)
2. Changez dans `.env` :
   ```
   MONGODB_URI=mongodb://localhost:27017
   ```
3. Testez : `node test-mongodb.js`

**Note** : Pour le TP, MongoDB Atlas est préférable, mais MongoDB local fonctionne aussi.

### Solution 5 : Vérifier la Résolution DNS

Testez si le DNS fonctionne :
```powershell
nslookup projet.mwh5ufv.mongodb.net
```

Si cela échoue, essayez de changer votre DNS (8.8.8.8 pour Google DNS).

## 🧪 Test Rapide

Après avoir essayé une solution, testez :
```bash
node test-connection-timeout.js
```

## 📊 Collections MongoDB

**Bonne nouvelle** : Je vois dans MongoDB Atlas que la base de données `auth_db` existe déjà avec une collection `examen`.

Les collections nécessaires pour le système seront créées automatiquement :
- `users` - lors de la première inscription
- `sessions` - lors de la première connexion réussie  
- `refreshTokens` - lors de la première connexion réussie

La collection `examen` existante n'interfère pas avec le système.

## 🎯 Action Immédiate Recommandée

1. **Désactivez temporairement le firewall Windows** (juste pour tester)
2. Testez : `node test-connection-timeout.js`
3. Si ça fonctionne → Le problème vient du firewall
4. **Réactivez le firewall** et créez une règle pour autoriser Node.js

