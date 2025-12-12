// Script pour calculer la preuve de travail (PoW)
// Utilisez ce script pour obtenir la valeur X-PoW-Proof

const crypto = require('crypto');

function calculerPoW(ip, seed, difficulte = 4) {
  let preuve = 0;
  const prefixe = '0'.repeat(difficulte);
  const debut = Date.now();
  
  console.log(`🔍 Calcul de la preuve de travail...`);
  console.log(`   IP: ${ip}`);
  console.log(`   Seed: ${seed}`);
  console.log(`   Difficulté: ${difficulte} zéros`);
  console.log(`   Recherche en cours...\n`);
  
  while (true) {
    const chaine = ip + seed + preuve.toString();
    const hash = crypto.createHash('sha256').update(chaine).digest('hex');
    
    if (hash.startsWith(prefixe)) {
      const duree = Date.now() - debut;
      console.log(`✅ Preuve trouvée en ${duree}ms !`);
      console.log(`   Preuve: ${preuve}`);
      console.log(`   Hash: ${hash.substring(0, 20)}...`);
      console.log(`\n📋 Utilisez cette valeur dans l'en-tête X-PoW-Proof: ${preuve}\n`);
      return preuve.toString();
    }
    
    preuve++;
    
    // Afficher la progression toutes les 10000 tentatives
    if (preuve % 10000 === 0) {
      process.stdout.write(`\r   Tentatives: ${preuve}...`);
    }
    
    // Sécurité : limiter les tentatives
    if (preuve > 10000000) {
      throw new Error('Preuve de travail trop difficile - augmentez le timeout ou réduisez la difficulté');
    }
  }
}

// Obtenir les paramètres
const ipClient = process.argv[2] || '127.0.0.1';
const difficulte = parseInt(process.argv[3]) || 4;

// Calculer la seed (change toutes les 10 minutes)
const maintenant = new Date();
const minutes = maintenant.getMinutes();
const minutesArrondies = Math.floor(minutes / 10) * 10;
const dateArrondie = new Date(maintenant);
dateArrondie.setMinutes(minutesArrondies, 0, 0);
const seed = Math.floor(dateArrondie.getTime() / 1000).toString();

console.log('🧮 CALCULATEUR DE PREUVE DE TRAVAIL (PoW)\n');
console.log('='.repeat(50));
console.log(`Timestamp actuel: ${maintenant.toISOString()}`);
console.log(`Tranche de 10 minutes: ${dateArrondie.toISOString()}`);
console.log('='.repeat(50) + '\n');

try {
  const preuve = calculerPoW(ipClient, seed, difficulte);
  console.log(`\n💡 Pour utiliser dans Postman:`);
  console.log(`   En-tête: X-PoW-Proof`);
  console.log(`   Valeur: ${preuve}`);
  console.log(`\n⚠️  Note: Cette preuve est valide pour les 10 prochaines minutes`);
  console.log(`   Après cela, vous devrez recalculer avec une nouvelle seed\n`);
} catch (erreur) {
  console.error('\n❌ Erreur:', erreur.message);
  process.exit(1);
}

