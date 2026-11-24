'use strict';
/**
 * Carga los proyectos iniciales en la cuenta de un correo.
 *   node scripts/sembrar.js tu@correo.com
 * Si la cuenta no existe la crea sin contraseña: se entra con Google (mismo correo) o
 * eligiendo contraseña desde "Olvidé mi contraseña". No duplica: salta los nombres que ya estén.
 */
try { process.loadEnvFile(); } catch (_) { /* variables desde el entorno */ }

const authDb = require('../shared/auth/db');
const proyectos = require('../proyectos');
const iniciales = require('./proyectos-iniciales');

async function main() {
  const correo = String(process.argv[2] || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
    console.error('Uso: node scripts/sembrar.js tu@correo.com');
    process.exit(1);
  }
  await authDb.init();
  let user = await authDb.findByEmail(correo);
  if (!user) {
    user = await authDb.createUser({ email: correo });
    console.log(`Cuenta creada para ${correo} (entra con Google o recupera la contraseña).`);
  }
  const ya = new Set((await proyectos.listar(user.id)).map((p) => p.nombre.toLowerCase()));
  let nuevos = 0;
  for (const p of iniciales) {
    if (ya.has(p.nombre.toLowerCase())) continue;
    const { datos, error } = proyectos.validar({ enlace: '', repo: '', ...p });
    if (error) throw new Error(`${p.nombre}: ${error}`);
    await proyectos.crear(user.id, datos);
    nuevos += 1;
  }
  console.log(`Listo: ${nuevos} proyectos nuevos, ${iniciales.length - nuevos} ya estaban.`);
  await proyectos.cerrar();
  process.exit(0);
}

main().catch((e) => { console.error('Error:', e.message); process.exit(1); });
