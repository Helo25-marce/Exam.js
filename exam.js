const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const crypto = require('crypto');
const http = require('http');
require('dotenv').config();

const app = express();
app.use(express.json());

// Phase 6: Configurer Express pour obtenir l'IP réelle
app.set('trust proxy', true);

// ============================================
// CONFIGURATION
// ============================================
const PORT = process.env.PORT || 3006;
const URI_MONGODB = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const NOM_BASE_DONNEES = process.env.DB_NAME || 'auth_db';
const URL_SERVICE_PEPPER = process.env.PEPPER_SERVICE_URL || 'http://localhost:3007';

// Phase 9: Pepper - récupéré depuis le microservice, mis en cache
let PEPPER = null;
let expirationCachePepper = null;
const DUREE_CACHE_PEPPER = 60 * 60 * 1000; // 1 heure en cache

let baseDeDonnees;
let clientMongoDB;

// ============================================
// PHASE 1 & 2: CONNEXION MONGODB ET HACHAGE SHA256
// ============================================

// Connexion à MongoDB avec ServerApiVersion (comme recommandé par MongoDB Atlas)
async function connecterBaseDeDonnees() {
  try {
    clientMongoDB = new MongoClient(URI_MONGODB, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    await clientMongoDB.connect();
    
    // Envoyer un ping pour confirmer la connexion
    await clientMongoDB.db("admin").command({ ping: 1 });
    
    baseDeDonnees = clientMongoDB.db(NOM_BASE_DONNEES);
    console.log('✅ Connecté à MongoDB Atlas avec succès!');
  } catch (erreur) {
    console.error('❌ Erreur de connexion MongoDB:', erreur.message);
    console.error('💡 Vérifiez que:');
    console.error('   1. Le cluster MongoDB Atlas est ACTIF (pas en pause)');
    console.error('   2. Votre IP est autorisée dans Network Access');
    console.error('   3. Le mot de passe dans MONGODB_URI est correct');
    process.exit(1);
  }
}

// Phase 2: Fonction hacherMotDePasse utilisant SHA256
// Note: SHA256 seul est insuffisant car:
// 1. Attaques par dictionnaire: Les attaquants peuvent pré-calculer les hashs de mots de passe courants
// 2. Tables arc-en-ciel: Tables de hash pré-calculées permettant la recherche rapide de mots de passe
// 3. Mots de passe identiques produisent des hashs identiques: Deux utilisateurs avec "password123" auront des hashs identiques
// 4. Aucune protection contre la force brute: Le hachage rapide permet des millions de tentatives par seconde
function hacherMotDePasse(motDePasseClair) {
  return crypto.createHash('sha256').update(motDePasseClair).digest('hex');
}

// ============================================
// PHASE 3: SALT UNIQUE PAR UTILISATEUR
// ============================================

// Phase 3: Fonction genererSalt - Génère un salt unique aléatoire
function genererSalt() {
  return crypto.randomBytes(32).toString('hex');
}

// Phase 3: Fonction hacherMotDePasseAvecSalt
// hash = sha256(password + salt)
function hacherMotDePasseAvecSalt(motDePasseClair, salt) {
  return crypto.createHash('sha256').update(motDePasseClair + salt).digest('hex');
}

// ============================================
// PHASE 4: PEPPER
// ============================================

// Phase 4: Fonction hacherMotDePasseAvecSaltEtPepper
// hash = sha256(password + salt + pepper)
// Phase 9: Utilise le pepper récupéré depuis le microservice
function hacherMotDePasseAvecSaltEtPepper(motDePasseClair, salt) {
  if (!PEPPER) {
    throw new Error('Pepper non disponible - le serveur n\'est pas initialisé');
  }
  return crypto.createHash('sha256').update(motDePasseClair + salt + PEPPER).digest('hex');
}

// ============================================
// PHASE 5: COMPARAISON SÉCURISÉE TIMING SAFE
// ============================================

// Phase 5: Fonction comparerSecurisee - Comparaison sécurisée contre les attaques temporelles
// Temps de comparaison constant pour éviter les attaques par timing
// Seuil minimal: 50ms (rejeter si plus rapide)
const SEUIL_MINIMAL_COMPARAISON = 50; // millisecondes

async function comparerSecurisee(a, b) {
  const debut = Date.now();
  
  // Normaliser les longueurs pour comparaison constante
  const longueurMax = Math.max(a.length, b.length);
  const aRempli = a.padEnd(longueurMax, '\0');
  const bRempli = b.padEnd(longueurMax, '\0');
  
  let resultat = 0;
  // Comparaison byte par byte avec temps constant
  for (let i = 0; i < longueurMax; i++) {
    resultat |= aRempli.charCodeAt(i) ^ bRempli.charCodeAt(i);
  }
  
  const duree = Date.now() - debut;
  
  // Si la comparaison est trop rapide, ajouter un délai pour atteindre le seuil minimal
  if (duree < SEUIL_MINIMAL_COMPARAISON) {
    const delai = SEUIL_MINIMAL_COMPARAISON - duree;
    await new Promise(resolve => setTimeout(resolve, delai));
  }
  
  return resultat === 0;
}

// ============================================
// PHASE 6: MIDDLEWARE PROOF OF WORK
// ============================================

// Phase 6: Fonction pour obtenir la seed basée sur la date (change toutes les 10 minutes)
function obtenirSeedTemps() {
  const maintenant = new Date();
  // Arrondir à la tranche de 10 minutes
  const minutes = maintenant.getMinutes();
  const minutesArrondies = Math.floor(minutes / 10) * 10;
  const dateArrondie = new Date(maintenant);
  dateArrondie.setMinutes(minutesArrondies, 0, 0);
  // Retourner un timestamp en secondes
  return Math.floor(dateArrondie.getTime() / 1000).toString();
}

// Phase 6: Middleware Proof of Work
// Le client doit fournir l'en-tête X-PoW-Proof
// Le serveur calcule sha256(IP + seed + preuve)
// La difficulté impose que ce hash commence par un certain nombre de zéros
function middlewarePreuveDeTravail(difficulte = 4) {
  return async (req, res, next) => {
    try {
      // Obtenir l'IP du client
      const ipClient = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
      
      // Obtenir la seed basée sur le temps (change toutes les 10 minutes)
      const seed = obtenirSeedTemps();
      
      // Obtenir la preuve PoW depuis l'en-tête
      const preuvePoW = req.headers['x-pow-proof'];
      
      if (!preuvePoW) {
        return res.status(400).json({ error: 'En-tête X-PoW-Proof requis' });
      }
      
      // Construire la chaîne à hasher: IP + seed + preuve
      const chainePoW = ipClient + seed + preuvePoW;
      
      // Calculer le hash
      const hashPoW = crypto.createHash('sha256').update(chainePoW).digest('hex');
      
      // Vérifier que le hash commence par le nombre requis de zéros
      const prefixeRequis = '0'.repeat(difficulte);
      if (!hashPoW.startsWith(prefixeRequis)) {
        return res.status(403).json({ 
          error: 'Preuve de travail invalide',
          message: `Le hash doit commencer par ${difficulte} zéros`
        });
      }
      
      // PoW valide, continuer
      next();
    } catch (erreur) {
      console.error('Erreur PoW middleware:', erreur);
      res.status(500).json({ error: 'Erreur de vérification PoW' });
    }
  };
}

// Phase 6: Appliquer le middleware PoW à toutes les routes
app.use(middlewarePreuveDeTravail(4)); // Difficulté de 4 zéros

// ============================================
// PHASE 7: TOKENS DE SESSION
// ============================================

// Phase 7: Fonction pour générer un token de session
// token = randomBytes(32).toString('hex')
function genererTokenSession() {
  return crypto.randomBytes(32).toString('hex');
}

// Phase 7: Fonction pour hasher le fingerprint (user agent)
function hasherFingerprint(userAgent) {
  return crypto.createHash('sha256').update(userAgent || '').digest('hex');
}

// Phase 7: Fonction pour parser les cookies manuellement (sans cookie-parser)
function parserCookies(enTeteCookie) {
  const cookies = {};
  if (!enTeteCookie) return cookies;
  
  enTeteCookie.split(';').forEach(cookie => {
    const [nom, valeur] = cookie.trim().split('=');
    if (nom && valeur) {
      cookies[nom] = decodeURIComponent(valeur);
    }
  });
  
  return cookies;
}

// Phase 7: Fonction pour définir un cookie manuellement (sans cookie-parser)
function definirCookie(res, nom, valeur, options = {}) {
  const {
    httpOnly = false,
    secure = false,
    sameSite = 'Lax',
    maxAge = null,
    expires = null
  } = options;
  
  let chaineCookie = `${nom}=${encodeURIComponent(valeur)}`;
  
  if (maxAge !== null) {
    chaineCookie += `; Max-Age=${maxAge}`;
  }
  
  if (expires) {
    chaineCookie += `; Expires=${expires.toUTCString()}`;
  }
  
  if (httpOnly) {
    chaineCookie += '; HttpOnly';
  }
  
  if (secure) {
    chaineCookie += '; Secure';
  }
  
  if (sameSite) {
    chaineCookie += `; SameSite=${sameSite}`;
  }
  
  // Ajouter le cookie aux en-têtes
  const cookiesExistants = res.getHeader('Set-Cookie') || [];
  const tableauCookies = Array.isArray(cookiesExistants) ? cookiesExistants : [cookiesExistants];
  tableauCookies.push(chaineCookie);
  res.setHeader('Set-Cookie', tableauCookies);
}

// Phase 7: Middleware d'authentification pour vérifier le token de session
async function middlewareAuthentification(req, res, next) {
  try {
    // Récupérer le token depuis les cookies (parser manuellement)
    const enTeteCookie = req.headers.cookie;
    const cookies = parserCookies(enTeteCookie);
    const token = cookies.sessionToken;
    
    if (!token) {
      return res.status(401).json({ error: 'Token de session manquant' });
    }
    
    // Trouver la session en base
    const session = await baseDeDonnees.collection('sessions').findOne({ token });
    
    if (!session) {
      return res.status(401).json({ error: 'Session invalide' });
    }
    
    // Vérifier l'expiration
    if (new Date() > session.expiration) {
      // Supprimer la session expirée
      await baseDeDonnees.collection('sessions').deleteOne({ token });
      return res.status(401).json({ error: 'Session expirée' });
    }
    
    // Vérifier le fingerprint (user agent)
    const userAgent = req.headers['user-agent'] || '';
    const hashFingerprint = hasherFingerprint(userAgent);
    
    if (session.fingerprint !== hashFingerprint) {
      return res.status(401).json({ error: 'Fingerprint invalide' });
    }
    
    // Récupérer l'utilisateur
    const utilisateur = await baseDeDonnees.collection('users').findOne({ _id: session.userId });
    
    if (!utilisateur) {
      return res.status(401).json({ error: 'Utilisateur introuvable' });
    }
    
    // Ajouter l'utilisateur à la requête
    req.user = utilisateur;
    req.session = session;
    
    next();
  } catch (erreur) {
    console.error('Erreur middleware authentification:', erreur);
    res.status(500).json({ error: 'Erreur d\'authentification' });
  }
}

// ============================================
// PHASE 8: REFRESH TOKENS
// ============================================

// Phase 8: Fonction pour invalider toute la chaîne de refresh tokens d'un utilisateur
async function invaliderChaineRefreshTokens(idUtilisateur) {
  // Invalider tous les refresh tokens de l'utilisateur
  await baseDeDonnees.collection('refreshTokens').updateMany(
    { userId: idUtilisateur },
    { $set: { invalidated: true } }
  );
  
  // Supprimer toutes les sessions de l'utilisateur
  await baseDeDonnees.collection('sessions').deleteMany({ userId: idUtilisateur });
}

// ============================================
// PHASE 9: MICROSERVICE PEPPER
// ============================================

// Phase 9: Fonction pour récupérer le pepper depuis le microservice avec retry
async function recupererPepper(tentatives = 5, delai = 1000) {
  for (let i = 0; i < tentatives; i++) {
    try {
      const url = new URL(`${URL_SERVICE_PEPPER}/pepper`);
      
      const donnees = await new Promise((resolve, reject) => {
        const options = {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname,
          method: 'GET'
        };
        
        const requete = http.request(options, (reponse) => {
          let corps = '';
          
          reponse.on('data', (morceau) => {
            corps += morceau;
          });
          
          reponse.on('end', () => {
            if (reponse.statusCode !== 200) {
              reject(new Error(`HTTP ${reponse.statusCode}`));
              return;
            }
            
            try {
              const parse = JSON.parse(corps);
              resolve(parse);
            } catch (e) {
              reject(new Error('Réponse JSON invalide'));
            }
          });
        });
        
        requete.on('error', (erreur) => {
          reject(erreur);
        });
        
        requete.setTimeout(5000, () => {
          requete.destroy();
          reject(new Error('Timeout'));
        });
        
        requete.end();
      });
      
      if (!donnees.pepper) {
        throw new Error('Pepper non reçu du microservice');
      }
      
      // Mettre en cache le pepper
      PEPPER = donnees.pepper;
      expirationCachePepper = Date.now() + DUREE_CACHE_PEPPER;
      
      console.log('Pepper récupéré avec succès depuis le microservice');
      return donnees.pepper;
    } catch (erreur) {
      console.error(`Tentative ${i + 1}/${tentatives} échouée:`, erreur.message);
      
      if (i < tentatives - 1) {
        // Attendre avant de réessayer
        await new Promise(resolve => setTimeout(resolve, delai));
        delai *= 2; // Backoff exponentiel
      } else {
        console.error('ERREUR CRITIQUE: Impossible de récupérer le pepper après', tentatives, 'tentatives');
        console.error('Le serveur ne peut pas démarrer sans le pepper');
        process.exit(1);
      }
    }
  }
}

// Phase 9: Fonction pour rafraîchir le pepper manuellement
async function rafraichirPepper() {
  try {
    await recupererPepper(3, 500);
    console.log('Pepper rafraîchi avec succès');
    return true;
  } catch (erreur) {
    console.error('Erreur lors du rafraîchissement du pepper:', erreur);
    return false;
  }
}

// Phase 9: Fonction pour obtenir le pepper (utilise le cache si disponible)
async function obtenirPepper() {
  // Vérifier si le cache est valide
  if (PEPPER && expirationCachePepper && Date.now() < expirationCachePepper) {
    return PEPPER;
  }
  
  // Cache expiré ou inexistant, récupérer depuis le microservice
  await recupererPepper();
  return PEPPER;
}

// ============================================
// ROUTES - PHASE 1 & 2: INSCRIPTION ET CONNEXION SIMPLES
// ============================================

// Phase 1 & 2: POST /register - Stocker email et mot de passe haché
app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    // Vérifier si l'utilisateur existe déjà
    const utilisateurExistant = await baseDeDonnees.collection('users').findOne({ email });
    if (utilisateurExistant) {
      return res.status(400).json({ error: 'Utilisateur déjà existant' });
    }

    // Phase 2: Hacher le mot de passe avec SHA256
    const hashMotDePasse = hacherMotDePasse(password);

    const utilisateur = {
      email,
      password: hashMotDePasse, // Mot de passe haché
      createdAt: new Date()
    };

    await baseDeDonnees.collection('users').insertOne(utilisateur);

    res.status(201).json({ message: 'Utilisateur enregistré avec succès' });
  } catch (erreur) {
    console.error('Erreur d\'enregistrement:', erreur);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Phase 1 & 2: POST /login - Vérifier email et mot de passe haché
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    // Trouver l'utilisateur par email
    const utilisateur = await baseDeDonnees.collection('users').findOne({ email });

    if (!utilisateur) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    // Phase 2: Hacher le mot de passe fourni et comparer avec le hash stocké
    const hashMotDePasse = hacherMotDePasse(password);
    if (utilisateur.password !== hashMotDePasse) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    res.status(200).json({ message: 'Connexion réussie' });
  } catch (erreur) {
    console.error('Erreur de connexion:', erreur);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// ============================================
// ROUTES - PHASE 3: SALT UNIQUE
// ============================================

// Phase 3: POST /beginRegistration - Inscription avec salt unique
app.post('/beginRegistration', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    // Vérifier si l'utilisateur existe déjà
    const utilisateurExistant = await baseDeDonnees.collection('users').findOne({ email });
    if (utilisateurExistant) {
      return res.status(400).json({ error: 'Utilisateur déjà existant' });
    }

    // Phase 3: Générer un salt unique
    const salt = genererSalt();
    
    // Phase 4: Hacher avec password + salt + pepper
    // hash = sha256(password + salt + pepper)
    const hashMotDePasse = hacherMotDePasseAvecSaltEtPepper(password, salt);

    const utilisateur = {
      email,
      password: hashMotDePasse, // Hash avec salt
      salt: salt, // Stocker le salt en base
      createdAt: new Date()
    };

    await baseDeDonnees.collection('users').insertOne(utilisateur);

    res.status(201).json({ message: 'Utilisateur enregistré avec succès' });
  } catch (erreur) {
    console.error('Erreur d\'enregistrement:', erreur);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Phase 3: GET /getSalt - Obtenir le salt pour le login
app.get('/getSalt', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email requis' });
    }

    // Trouver l'utilisateur par email
    const utilisateur = await baseDeDonnees.collection('users').findOne({ email });

    // Ne jamais révéler si l'utilisateur existe ou non (sécurité)
    // Retourner toujours un salt (même si l'utilisateur n'existe pas)
    if (!utilisateur || !utilisateur.salt) {
      // Retourner un salt factice pour masquer l'existence de l'utilisateur
      const saltFactice = genererSalt();
      return res.status(200).json({ salt: saltFactice });
    }

    res.status(200).json({ salt: utilisateur.salt });
  } catch (erreur) {
    console.error('Erreur getSalt:', erreur);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// ============================================
// ROUTES - PHASE 5: CONNEXION SÉCURISÉE
// ============================================

// Phase 5: POST /loginWithSalt - Connexion avec salt, pepper et comparerSecurisee
app.post('/loginWithSalt', async (req, res) => {
  const debutRequete = Date.now();
  const TEMPS_REPONSE_UNIFORME = 200; // millisecondes
  
  try {
    const { email, password, salt } = req.body;

    if (!email || !password || !salt) {
      return res.status(400).json({ error: 'Email, mot de passe et salt requis' });
    }

    // Phase 5: Toujours faire les mêmes opérations pour uniformiser les temps de réponse
    // Ne jamais révéler si l'utilisateur existe ou non
    const utilisateur = await baseDeDonnees.collection('users').findOne({ email });
    
    // Créer des valeurs par défaut si l'utilisateur n'existe pas
    const saltUtilisateur = utilisateur?.salt || genererSalt(); // Salt factice si utilisateur inexistant
    const hashMotDePasseUtilisateur = utilisateur?.password || hacherMotDePasseAvecSaltEtPepper('dummy', saltUtilisateur);
    
    // Phase 5: Vérifier le salt avec comparerSecurisee
    const saltValide = await comparerSecurisee(saltUtilisateur, salt);
    
    // Phase 4: Hacher avec password + salt + pepper
    const hashMotDePasse = hacherMotDePasseAvecSaltEtPepper(password, salt);
    
    // Phase 5: Comparer les hashs avec comparerSecurisee
    const motDePasseValide = await comparerSecurisee(hashMotDePasseUtilisateur, hashMotDePasse);
    
    // Phase 5: Vérifier que l'utilisateur existe ET que les identifiants sont valides
    const authentificationReussie = utilisateur && saltValide && motDePasseValide;
    
    // Phase 5: Uniformiser le temps de réponse
    const dureeRequete = Date.now() - debutRequete;
    if (dureeRequete < TEMPS_REPONSE_UNIFORME) {
      const delai = TEMPS_REPONSE_UNIFORME - dureeRequete;
      await new Promise(resolve => setTimeout(resolve, delai));
    }
    
    if (!authentificationReussie) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    // Phase 7: Générer un token de session
    const token = genererTokenSession();
    
    // Phase 8: Générer un refresh token (différent du token de session)
    const refreshToken = genererTokenSession();
    
    // Phase 7: Calculer le fingerprint (user agent haché)
    const userAgent = req.headers['user-agent'] || '';
    const fingerprint = hasherFingerprint(userAgent);
    
    // Phase 7: Définir l'expiration du token de session (1 heure)
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1);
    
    // Phase 8: Définir l'expiration du refresh token (7 jours)
    const expirationRefresh = new Date();
    expirationRefresh.setDate(expirationRefresh.getDate() + 7);
    
    // Phase 7: Stocker la session en base
    const session = {
      userId: utilisateur._id,
      token: token,
      expiration: expiration,
      fingerprint: fingerprint,
      createdAt: new Date()
    };
    
    await baseDeDonnees.collection('sessions').insertOne(session);
    
    // Phase 8: Stocker le refresh token en base
    const documentRefreshToken = {
      userId: utilisateur._id,
      token: refreshToken,
      expiration: expirationRefresh,
      fingerprint: fingerprint,
      invalidated: false, // Champ invalidated obligatoire
      parentToken: null, // Pour suivre la chaîne d'invalidation
      createdAt: new Date()
    };
    
    await baseDeDonnees.collection('refreshTokens').insertOne(documentRefreshToken);
    
    // Phase 7: Envoyer le token dans un cookie HttpOnly Secure SameSite strict
    definirCookie(res, 'sessionToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Secure seulement en production (HTTPS)
      sameSite: 'strict',
      maxAge: 60 * 60 // 1 heure en secondes
    });
    
    // Phase 8: Envoyer le refresh token dans un cookie séparé
    definirCookie(res, 'refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 jours en secondes
    });

    res.status(200).json({ message: 'Connexion réussie' });
  } catch (erreur) {
    console.error('Erreur de connexion:', erreur);
    
    // Phase 5: Uniformiser le temps de réponse même en cas d'erreur
    const dureeRequete = Date.now() - debutRequete;
    if (dureeRequete < TEMPS_REPONSE_UNIFORME) {
      const delai = TEMPS_REPONSE_UNIFORME - dureeRequete;
      await new Promise(resolve => setTimeout(resolve, delai));
    }
    
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// ============================================
// ROUTES - PHASE 7: ROUTE PROTÉGÉE
// ============================================

// Phase 7: GET /me - Route protégée pour obtenir le profil utilisateur
// Vérifie: présence du token, expiration, fingerprint, preuve de PoW (via middleware global)
app.get('/me', middlewareAuthentification, async (req, res) => {
  try {
    // req.user est défini par le middleware d'authentification
    const utilisateur = req.user;
    
    // Renvoyer les informations du profil sans le mot de passe
    const profil = {
      email: utilisateur.email,
      createdAt: utilisateur.createdAt,
      // Exclure: password, salt, et autres données sensibles
    };
    
    res.status(200).json(profil);
  } catch (erreur) {
    console.error('Erreur GET /me:', erreur);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// ============================================
// ROUTES - PHASE 8: REFRESH TOKENS
// ============================================

// Phase 8: POST /refresh - Obtenir un nouveau token d'accès avec un refresh token
app.post('/refresh', async (req, res) => {
  try {
    // Récupérer le refresh token depuis les cookies
    const enTeteCookie = req.headers.cookie;
    const cookies = parserCookies(enTeteCookie);
    const refreshToken = cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token manquant' });
    }
    
    // Trouver le refresh token en base
    const documentRefreshToken = await baseDeDonnees.collection('refreshTokens').findOne({ token: refreshToken });
    
    if (!documentRefreshToken) {
      return res.status(401).json({ error: 'Refresh token invalide' });
    }
    
    // Vérifier si le refresh token est invalidé
    if (documentRefreshToken.invalidated) {
      // Phase 8: Refresh token volé → invalider toute la chaîne
      await invaliderChaineRefreshTokens(documentRefreshToken.userId);
      return res.status(401).json({ error: 'Refresh token invalide - reconnexion requise' });
    }
    
    // Vérifier l'expiration
    if (new Date() > documentRefreshToken.expiration) {
      // Phase 8: Refresh token expiré → imposer une reconnexion complète
      await baseDeDonnees.collection('refreshTokens').deleteOne({ token: refreshToken });
      return res.status(401).json({ error: 'Refresh token expiré - reconnexion requise' });
    }
    
    // Vérifier le fingerprint
    const userAgent = req.headers['user-agent'] || '';
    const fingerprint = hasherFingerprint(userAgent);
    
    if (documentRefreshToken.fingerprint !== fingerprint) {
      // Phase 8: Fingerprint différent → possible vol, invalider toute la chaîne
      await invaliderChaineRefreshTokens(documentRefreshToken.userId);
      return res.status(401).json({ error: 'Fingerprint invalide - reconnexion requise' });
    }
    
    // Phase 8: Rotation - Invalider l'ancien refresh token
    await baseDeDonnees.collection('refreshTokens').updateOne(
      { token: refreshToken },
      { $set: { invalidated: true } }
    );
    
    // Phase 8: Générer un nouveau token d'accès
    const nouveauToken = genererTokenSession();
    const nouvelleExpiration = new Date();
    nouvelleExpiration.setHours(nouvelleExpiration.getHours() + 1);
    
    // Phase 8: Générer un nouveau refresh token
    const nouveauRefreshToken = genererTokenSession();
    const nouvelleExpirationRefresh = new Date();
    nouvelleExpirationRefresh.setDate(nouvelleExpirationRefresh.getDate() + 7);
    
    // Phase 8: Stocker le nouveau token de session
    const nouvelleSession = {
      userId: documentRefreshToken.userId,
      token: nouveauToken,
      expiration: nouvelleExpiration,
      fingerprint: fingerprint,
      createdAt: new Date()
    };
    
    await baseDeDonnees.collection('sessions').insertOne(nouvelleSession);
    
    // Phase 8: Stocker le nouveau refresh token avec référence au parent
    const nouveauDocumentRefreshToken = {
      userId: documentRefreshToken.userId,
      token: nouveauRefreshToken,
      expiration: nouvelleExpirationRefresh,
      fingerprint: fingerprint,
      invalidated: false,
      parentToken: refreshToken, // Suivre la chaîne
      createdAt: new Date()
    };
    
    await baseDeDonnees.collection('refreshTokens').insertOne(nouveauDocumentRefreshToken);
    
    // Envoyer les nouveaux tokens dans les cookies
    definirCookie(res, 'sessionToken', nouveauToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 // 1 heure en secondes
    });
    
    definirCookie(res, 'refreshToken', nouveauRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 jours en secondes
    });
    
    res.status(200).json({ message: 'Tokens rafraîchis avec succès' });
  } catch (erreur) {
    console.error('Erreur refresh:', erreur);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// ============================================
// ROUTES - PHASE 9: ADMIN PEPPER
// ============================================

// Phase 9: Route pour rafraîchir le pepper manuellement (commande interne optionnelle)
app.post('/admin/refresh-pepper', async (req, res) => {
  try {
    const succes = await rafraichirPepper();
    if (succes) {
      res.status(200).json({ message: 'Pepper rafraîchi avec succès' });
    } else {
      res.status(500).json({ error: 'Erreur lors du rafraîchissement du pepper' });
    }
  } catch (erreur) {
    console.error('Erreur refresh pepper:', erreur);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// ============================================
// INITIALISATION ET DÉMARRAGE
// ============================================

// Initialiser la connexion à la base de données et récupérer le pepper
async function initialiserServeur() {
  await connecterBaseDeDonnees();
  await recupererPepper();
  console.log('Serveur initialisé avec succès');
}

// Démarrer le serveur après initialisation
// Le serveur ne démarre que si le pepper a été récupéré avec succès
async function demarrerServeur() {
  try {
    // Attendre que le pepper soit disponible
    await obtenirPepper();
    
    app.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  } catch (erreur) {
    console.error('ERREUR: Impossible de démarrer le serveur sans pepper');
    process.exit(1);
  }
}

// Initialiser le serveur
initialiserServeur();

// Démarrer le serveur
demarrerServeur();

// Arrêt gracieux
process.on('SIGINT', async () => {
  if (clientMongoDB) {
    await clientMongoDB.close();
    console.log('Connexion MongoDB fermée');
  }
  process.exit(0);
});
