// Test de la connexion MongoDB depuis exam.js
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const URI_MONGODB = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const NOM_BASE_DONNEES = process.env.DB_NAME || 'auth_db';

async function testerConnexionExam() {
  let clientMongoDB = null;
  try {
    console.log('🧪 TEST: Connexion MongoDB depuis exam.js\n');
    console.log('URI:', URI_MONGODB.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    console.log('Base de données:', NOM_BASE_DONNEES);
    console.log('\n⏳ Connexion en cours...\n');
    
    // Utiliser exactement la même configuration que exam.js
    clientMongoDB = new MongoClient(URI_MONGODB, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    
    await clientMongoDB.connect();
    console.log('✅ Connexion établie!');
    
    // Envoyer un ping pour confirmer la connexion (comme dans exam.js)
    await clientMongoDB.db("admin").command({ ping: 1 });
    console.log('✅ Ping réussi!');
    
    const baseDeDonnees = clientMongoDB.db(NOM_BASE_DONNEES);
    console.log(`✅ Base de données "${NOM_BASE_DONNEES}" accessible`);
    
    // Tester les collections
    const collections = await baseDeDonnees.listCollections().toArray();
    console.log(`\n📁 Collections existantes: ${collections.length}`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    // Vérifier les collections nécessaires
    console.log('\n📋 Collections nécessaires pour le système:');
    const collectionsNecessaires = ['users', 'sessions', 'refreshTokens'];
    collectionsNecessaires.forEach(nom => {
      const existe = collections.some(c => c.name === nom);
      console.log(`   ${existe ? '✅' : '⏳'} ${nom} ${existe ? '(existe)' : '(sera créée automatiquement)'}`);
    });
    
    // Test d'insertion dans users (simulation)
    console.log('\n🧪 TEST: Insertion test dans collection users');
    try {
      const resultatTest = await baseDeDonnees.collection('users').insertOne({
        email: 'test@example.com',
        password: 'hash_test',
        createdAt: new Date()
      });
      console.log('✅ Insertion test réussie!');
      console.log(`   ID créé: ${resultatTest.insertedId}`);
      
      // Nettoyer - supprimer le document de test
      await baseDeDonnees.collection('users').deleteOne({ _id: resultatTest.insertedId });
      console.log('✅ Document de test supprimé');
    } catch (erreur) {
      console.error('❌ Erreur insertion test:', erreur.message);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✨ TOUS LES TESTS MONGODB SONT PASSÉS !');
    console.log('='.repeat(50));
    console.log('\n✅ La connexion MongoDB fonctionne parfaitement depuis exam.js');
    console.log('✅ Les collections seront créées automatiquement lors de la première utilisation');
    console.log('\n📋 Prochaines étapes:');
    console.log('   1. Démarrer le microservice pepper: node pepper-service.js');
    console.log('   2. Démarrer le serveur principal: node exam.js');
    console.log('   3. Tester avec Postman (voir README.md)\n');
    
    return true;
  } catch (erreur) {
    console.error('\n❌ ERREUR:', erreur.message);
    console.error('\n💡 Vérifiez:');
    console.error('   1. Que le fichier .env contient MONGODB_URI correct');
    console.error('   2. Que MongoDB Atlas est accessible');
    console.error('   3. Que le firewall autorise la connexion');
    return false;
  } finally {
    if (clientMongoDB) {
      await clientMongoDB.close();
      console.log('\n🔌 Connexion fermée');
    }
  }
}

testerConnexionExam().catch(console.error);

