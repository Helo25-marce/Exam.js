const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

// Essayer différentes configurations
const configurations = [
  {
    name: 'Configuration standard avec TLS',
    uri: "mongodb+srv://etameeddy01_db_user:ZO15Z60kSXyoPvaH@projet.mwh5ufv.mongodb.net/auth_db?retryWrites=true&w=majority&appName=Projet",
    options: {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    }
  },
  {
    name: 'Configuration avec TLS explicite',
    uri: "mongodb+srv://etameeddy01_db_user:ZO15Z60kSXyoPvaH@projet.mwh5ufv.mongodb.net/auth_db?retryWrites=true&w=majority&appName=Projet&tls=true",
    options: {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      tls: true,
      tlsAllowInvalidCertificates: false,
    }
  }
];

async function testerConfiguration(config) {
  const client = new MongoClient(config.uri, config.options);
  try {
    console.log(`\n🔌 Test: ${config.name}`);
    console.log('URI:', config.uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    await client.connect();
    console.log('✅ Connexion établie!');
    
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Ping réussi!");
    
    const db = client.db("auth_db");
    const collections = await db.listCollections().toArray();
    console.log(`📁 Collections: ${collections.length}`);
    
    await client.close();
    return true;
  } catch (error) {
    console.log(`❌ Échec: ${error.message}`);
    await client.close().catch(() => {});
    return false;
  }
}

async function run() {
  console.log('🧪 Test de différentes configurations de connexion...\n');
  
  for (const config of configurations) {
    const success = await testerConfiguration(config);
    if (success) {
      console.log('\n✨ Connexion réussie avec cette configuration!');
      return;
    }
  }
  
  console.log('\n❌ Toutes les configurations ont échoué.');
  console.log('\n💡 Le problème est probablement:');
  console.log('   1. Firewall Windows bloque les connexions sortantes');
  console.log('   2. Proxy/VPN interfère avec la connexion');
  console.log('   3. Réseau d\'entreprise bloque MongoDB Atlas');
  console.log('\n🔧 Solutions:');
  console.log('   - Désactivez temporairement le firewall Windows');
  console.log('   - Testez depuis un hotspot mobile');
  console.log('   - Contactez votre administrateur réseau');
}

run().catch(console.dir);

