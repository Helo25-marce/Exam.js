# Créer une Règle de Firewall pour Node.js

## Pourquoi ?

Maintenant que la connexion fonctionne avec le firewall désactivé, vous devez créer une règle pour autoriser Node.js à se connecter à MongoDB Atlas **sans désactiver complètement le firewall**.

## Étapes pour Créer la Règle

### 1. Ouvrir le Pare-feu Windows avec Paramètres Avancés

1. Appuyez sur **Windows + R**
2. Tapez : `wf.msc` et appuyez sur Entrée
3. Ou : Windows Security → Firewall → Paramètres avancés

### 2. Créer une Règle de Trafic Sortant

1. Dans le panneau de gauche, cliquez sur **"Règles de trafic sortant"**
2. Cliquez sur **"Nouvelle règle..."** dans le panneau de droite

### 3. Configurer la Règle

**Étape 1 - Type de règle :**
- Sélectionnez **"Programme"** → Suivant

**Étape 2 - Programme :**
- Sélectionnez **"Ce chemin d'accès au programme"**
- Cliquez sur **"Parcourir"**
- Naviguez vers : `C:\Program Files\nodejs\node.exe`
- (Ou trouvez node.exe avec : `where.exe node`)
- Suivant

**Étape 3 - Action :**
- Sélectionnez **"Autoriser la connexion"** → Suivant

**Étape 4 - Profil :**
- Cochez **tous les profils** (Domaine, Privé, Public) → Suivant

**Étape 5 - Nom :**
- Nom : `Node.js - MongoDB Atlas`
- Description : `Autorise Node.js à se connecter à MongoDB Atlas`
- Terminer

### 4. Vérifier la Règle

1. Dans "Règles de trafic sortant", cherchez **"Node.js - MongoDB Atlas"**
2. Vérifiez qu'elle est **Activée** (colonne "État")

### 5. Réactiver le Firewall

1. Windows Security → Firewall & network protection
2. Réactivez le firewall pour votre réseau

### 6. Tester

```bash
node test-atlas-exact.js
```

Vous devriez toujours voir : ✅ "Pinged your deployment. You successfully connected to MongoDB!"

## Alternative : Trouver le Chemin de Node.js

Si vous ne trouvez pas node.exe, exécutez dans PowerShell :

```powershell
where.exe node
```

Cela vous donnera le chemin exact de node.exe.

