const { MongoClient, ServerApiVersion } = require('mongodb');
const http = require('http');
require('dotenv').config();

async function testerServeurComplet() {
  console.log('🧪 TEST COMPLET DU SYSTÈME\n');
  console.log('='.repeat(50));
  
  // Test 1: Connexion MongoDB
  console.log('\n📊 TEST 1: Connexion MongoDB Atlas');
  console.log('-'.repeat(50));
  let clientMongoDB = null;
  try {
    const uri = process.env.MONGODB_URI;
    console.log('URI:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    clientMongoDB = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    
    await clientMongoDB.connect();
    await clientMongoDB.db("admin").command({ ping: 1 });
    console.log('✅ Connexion MongoDB réussie!');
    
    const db = clientMongoDB.db(process.env.DB_NAME || 'auth_db');
    const collections = await db.listCollections().toArray();
    console.log(`✅ Base de données "${process.env.DB_NAME || 'auth_db'}" accessible`);
    console.log(`📁 Collections existantes: ${collections.length}`);
    
    // Vérifier les collections nécessaires
    const collectionsNecessaires = ['users', 'sessions', 'refreshTokens'];
    let toutesPresentes = true;
    collectionsNecessaires.forEach(nom => {
      const existe = collections.some(c => c.name === nom);
      if (!existe) toutesPresentes = false;
      console.log(`   ${existe ? '✅' : '⏳'} ${nom} ${existe ? '(existe)' : '(sera créée automatiquement)'}`);
    });
    
    if (!toutesPresentes) {
      console.log('   ℹ️  Les collections manquantes seront créées lors de la première utilisation');
    }
    
  } catch (erreur) {
    console.error('❌ Erreur MongoDB:', erreur.message);
    await clientMongoDB?.close();
    return false;
  } finally {
    await clientMongoDB?.close();
  }
  
  // Test 2: Microservice Pepper
  console.log('\n📊 TEST 2: Microservice Pepper');
  console.log('-'.repeat(50));
  try {
    const urlPepper = new URL(process.env.PEPPER_SERVICE_URL || 'http://localhost:3007');
    const pepperData = await new Promise((resolve, reject) => {
      const options = {
        hostname: urlPepper.hostname,
        port: urlPepper.port || 3007,
        path: '/pepper',
        method: 'GET',
        timeout: 5000
      };
      
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(new Error('Réponse JSON invalide'));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      
      req.end();
    });
    
    if (pepperData.pepper) {
      console.log('✅ Microservice pepper accessible');
      console.log(`✅ Pepper récupéré: ${pepperData.pepper.substring(0, 20)}...`);
    } else {
      console.error('❌ Pepper non reçu');
      return false;
    }
  } catch (erreur) {
    console.error('❌ Erreur microservice pepper:', erreur.message);
    console.error('   💡 Assurez-vous que le microservice est démarré: node pepper-service.js');
    return false;
  }
  
  // Test 3: Vérification des variables d'environnement
  console.log('\n📊 TEST 3: Variables d\'environnement');
  console.log('-'.repeat(50));
  const varsRequises = ['PORT', 'MONGODB_URI', 'DB_NAME', 'PEPPER_SERVICE_URL', 'PEPPER_SERVICE_PORT'];
  let toutesVarsOk = true;
  varsRequises.forEach(varName => {
    const valeur = process.env[varName];
    if (valeur) {
      if (varName === 'MONGODB_URI') {
        console.log(`✅ ${varName}: ${valeur.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
      } else {
        console.log(`✅ ${varName}: ${valeur}`);
      }
    } else {
      console.log(`❌ ${varName}: MANQUANT`);
      toutesVarsOk = false;
    }
  });
  
  if (!toutesVarsOk) {
    console.error('\n❌ Certaines variables d\'environnement sont manquantes');
    return false;
  }
  
  // Résumé final
  console.log('\n' + '='.repeat(50));
  console.log('✨ TOUS LES TESTS SONT PASSÉS !');
  console.log('='.repeat(50));
  console.log('\n📋 Le système est prêt à être démarré :');
  console.log('   1. Terminal 1: node pepper-service.js');
  console.log('   2. Terminal 2: node exam.js');
  console.log('\n🔗 Ports pour Postman :');
  console.log('   - Port 3007: Microservice Pepper');
  console.log('   - Port 3006: Serveur Principal');
  console.log('\n⚠️  IMPORTANT: Toutes les requêtes nécessitent l\'en-tête X-PoW-Proof');
  console.log('   (Preuve de travail - voir README.md pour le calcul)\n');
  
  return true;
}

testerServeurComplet().catch(console.error);

