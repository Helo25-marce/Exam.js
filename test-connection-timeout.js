const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const uri = "mongodb+srv://etameeddy01_db_user:ZO15Z60kSXyoPvaH@projet.mwh5ufv.mongodb.net/auth_db?retryWrites=true&w=majority&appName=Projet";

// Create a MongoClient with extended timeout options
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  serverSelectionTimeoutMS: 30000, // 30 secondes
  connectTimeoutMS: 30000, // 30 secondes
  socketTimeoutMS: 30000, // 30 secondes
});

async function run() {
  try {
    console.log('🔌 Connexion à MongoDB Atlas avec timeout étendu...');
    console.log('URI:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    console.log('⏳ Timeout: 30 secondes...\n');
    
    // Connect the client to the server
    await client.connect();
    console.log('✅ Connexion établie!');
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Ping réussi! Connexion MongoDB confirmée!");
    
    // Tester la base de données auth_db
    const db = client.db("auth_db");
    const collections = await db.listCollections().toArray();
    console.log(`\n📊 Base de données: auth_db`);
    console.log(`📁 Collections existantes: ${collections.length}`);
    if (collections.length > 0) {
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    }
    
    // Vérifier les collections nécessaires
    const collectionsNecessaires = ['users', 'sessions', 'refreshTokens'];
    console.log(`\n📋 Collections nécessaires pour le système:`);
    collectionsNecessaires.forEach(nom => {
      const existe = collections.some(c => c.name === nom);
      console.log(`   ${existe ? '✅' : '⏳'} ${nom} ${existe ? '(existe)' : '(sera créée automatiquement)'}`);
    });
    
    console.log('\n✨ MongoDB est prêt à être utilisé!');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error('Code:', error.code);
    
    if (error.message.includes('ECONNRESET')) {
      console.error('\n💡 Solutions possibles:');
      console.error('   1. Vérifiez votre connexion internet');
      console.error('   2. Désactivez temporairement le firewall Windows');
      console.error('   3. Vérifiez si vous êtes derrière un proxy/VPN');
      console.error('   4. Essayez depuis un autre réseau (hotspot mobile)');
    }
  } finally {
    await client.close();
    console.log('\n🔌 Connexion fermée');
  }
}

run().catch(console.dir);

