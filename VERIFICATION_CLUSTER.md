# Vérification et Résolution du Problème de Connexion MongoDB Atlas

## Problème : `read ECONNRESET`

Cette erreur peut avoir plusieurs causes. Vérifiez dans l'ordre :

## ✅ Étape 1 : Vérifier que le Cluster est Actif

1. Dans MongoDB Atlas, allez dans **"Database"** (menu de gauche)
2. Regardez votre cluster `Projet`
3. **Vérifiez l'état du cluster** :
   - ✅ **"Active"** (vert) = Le cluster fonctionne
   - ⏸️ **"Paused"** (gris) = Le cluster est en pause → **Cliquez sur "Resume"** pour le démarrer
   - ⚠️ **"Resuming"** = Le cluster est en train de démarrer (attendez 1-2 minutes)

**Si le cluster est en pause**, c'est probablement la cause du problème. Les clusters gratuits se mettent automatiquement en pause après 1 heure d'inactivité.

## ✅ Étape 2 : Vérifier Network Access (Encore une fois)

1. Allez dans **"Network Access"** (menu de gauche)
2. Vérifiez que vous voyez bien :
   - `0.0.0.0/0` avec statut **"Active"** (vert)
   - OU votre IP spécifique avec statut **"Active"** (vert)
3. Si ce n'est pas "Active", attendez 2-3 minutes

## ✅ Étape 3 : Vérifier le Mot de Passe

1. Allez dans **"Database Access"** (menu de gauche)
2. Trouvez l'utilisateur `etameeddy01_db_user`
3. Cliquez sur les **3 points** → **"Edit"**
4. Vérifiez ou réinitialisez le mot de passe si nécessaire

## ✅ Étape 4 : Tester avec une Connexion Directe

Essayez de vous connecter directement depuis MongoDB Atlas :

1. Dans MongoDB Atlas, allez dans **"Database"**
2. Cliquez sur **"Connect"** sur votre cluster
3. Choisissez **"MongoDB Shell"** (ou **"Shell"**)
4. Copiez la commande et exécutez-la dans votre terminal

Si cela fonctionne depuis MongoDB Atlas mais pas depuis votre code, c'est un problème de configuration locale.

## ✅ Étape 5 : Vérifier le Firewall/Proxy

Si vous êtes sur un réseau d'entreprise ou avec un VPN :
- Désactivez temporairement le VPN
- Vérifiez les paramètres du firewall Windows
- Essayez depuis un autre réseau (hotspot mobile)

## ✅ Étape 6 : Attendre et Réessayer

Parfois, les changements dans MongoDB Atlas prennent 5-10 minutes pour se propager. Attendez quelques minutes et réessayez.

## Test Rapide

Après avoir vérifié le cluster, testez à nouveau :

```bash
node test-mongodb.js
```

---

## Solution Alternative : Utiliser MongoDB Local (Temporaire)

Si MongoDB Atlas continue de poser problème, vous pouvez temporairement utiliser MongoDB local pour tester :

1. Installez MongoDB localement (voir `INSTALLATION_MONGODB.md`)
2. Changez dans `.env` :
   ```
   MONGODB_URI=mongodb://localhost:27017
   ```

Mais pour la production, MongoDB Atlas est recommandé.

