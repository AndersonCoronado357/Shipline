'use strict';
/**
 * Proyectos con los que arranca la cuenta de Ander en Shipline (inventario del PC, GitHub, acmsy y el
 * portafolio, revisado el 2026-11-24). Lo carga scripts/sembrar.js; no se usa en la app.
 */
const gh = (repo) => `https://github.com/AndersonCoronado357/${repo}`;
const sitio = (sub) => `https://${sub}.acmsy.com`;

module.exports = [
  // ---- Lista "Web Angular" ----
  { nombre: 'Huely', color: '#B31CFF', estado: 'desarrollo', descripcion: 'Generador de paletas de colores en OKLCH: armonías, chequeo de accesibilidad (WCAG, APCA y daltonismo) y exportación lista para CSS y Tailwind.' },
  { nombre: 'Gambit', color: '#20A123', estado: 'idea', descripcion: 'Tablero de ajedrez con análisis: jugadas válidas, evaluación del motor e historial de la partida.' },
  { nombre: 'Convertly', color: '#2081A1', estado: 'idea', descripcion: 'Conversor de unidades universal con tasas de moneda en vivo, favoritos e historial.' },
  { nombre: 'Coboard', color: '#5100FF', estado: 'idea', descripcion: 'Pizarra colaborativa en tiempo real: dibujo, salas y cursores en vivo.' },
  { nombre: 'Curriq', color: '#006AFF', estado: 'idea', descripcion: 'Generador de hojas de vida con plantillas, vista previa y exportación a PDF.' },
  { nombre: 'Codeglass', color: '#1CF7FF', estado: 'idea', descripcion: 'Editor de código con vista previa en vivo dentro de un iframe aislado y consola de errores.' },
  { nombre: 'Qraft', color: '#16161A', estado: 'publicado', enlace: sitio('qraft'), descripcion: 'Generador de códigos QR con cuenta propia: la estética se decide una sola vez como marca y cada código nuevo solo aporta su contenido.' },
  { nombre: 'Signa', color: '#FF5900', estado: 'idea', descripcion: 'Traductor de lengua de señas por cámara: detecta las manos y traduce en vivo.' },
  { nombre: 'Locknest', color: '#CD0B14', estado: 'publicado', enlace: sitio('locknest'), descripcion: 'Gestor de contraseñas con cuentas de usuario. Las claves se cifran y descifran en el propio dispositivo, así que ni con acceso al servidor se pueden leer.' },
  { nombre: 'Sortscape', color: '#FF1C42', estado: 'idea', descripcion: 'Visualizador de algoritmos de ordenamiento, con controles paso a paso y comparación lado a lado.' },
  { nombre: 'Quizarena', color: '#FFD400', estado: 'idea', descripcion: 'Trivia multijugador en tiempo real: salas, partidas con temporizador y ranking.' },
  { nombre: 'Chartlab', color: '#1CC2FF', estado: 'idea', descripcion: 'Sube un CSV y genera gráficas configurables y un tablero con tus datos.' },
  { nombre: 'Typeflow', color: '#1CFFC8', estado: 'idea', descripcion: 'Prueba de mecanografía con palabras por minuto, precisión, modos de juego e historial.' },
  { nombre: 'Dbridge', color: '#AB1D93', estado: 'publicado', enlace: sitio('dbridge'), descripcion: 'Gestor de bases de datos en la web: SQL Server, MySQL, PostgreSQL y MongoDB juntos en una sola pizarra, con un agente local para que las credenciales no salgan del equipo.' },
  { nombre: 'Trackpile', color: '#F5A627', estado: 'publicado', enlace: sitio('trackpile'), repo: gh('Trackpile'), descripcion: 'Lista personal de proyectos con su stack, sus enlaces y en qué estado va cada uno.' },

  // ---- Salud ----
  { nombre: 'MedTrail', color: '#0BC5F4', estado: 'terminado', descripcion: 'Trazabilidad y analítica de inventario farmacéutico e insumos para hospitales: escaneo GS1 enriquecido con INVIMA, precios SISMED, vencimientos y alertas.' },
  { nombre: 'AirLung', color: '#00FF62', estado: 'desarrollo', descripcion: 'Compañero respiratorio para personas con asma o EPOC en el Valle de Aburrá: calidad del aire con semáforo personal, alertas, recomendaciones y diario de síntomas.' },
  { nombre: 'Steady', color: '#FF4400', estado: 'desarrollo', descripcion: 'Gestor de enfermedades crónicas para hipertensión y diabetes: registra presión, glucosa y peso, muestra tendencias contra la meta y arma un reporte médico en PDF.' },

  // ---- Herramientas ----
  { nombre: 'Vexcel', color: '#6D4AFF', estado: 'publicado', enlace: sitio('vexcel'), repo: gh('Vexcel'), descripcion: 'Vectorizador de imágenes: subes un PNG o un JPG, ajustas el trazado y sale un SVG limpio que escala sin perder nitidez.' },
  { nombre: 'Conversor de media', color: '#9AA0A8', estado: 'idea', descripcion: 'Conversor y compresor de video y audio en local con FFmpeg: MP4 a MP3, comprimir, recortar y crear GIF. Todavía sin nombre.' },

  // ---- Escritorio ----
  { nombre: 'Markwell', color: '#BFA7F4', estado: 'publicado', enlace: sitio('markwell'), repo: gh('Markwell'), descripcion: 'Notas locales para Windows con tres modos: bloques tipo Notion, pizarras con notas adhesivas y un chat con IA que responde leyendo tus notas.' },
  { nombre: 'Spinup', color: '#D4915C', estado: 'publicado', enlace: sitio('spinup'), repo: gh('Spinup'), descripcion: 'Arranca y detiene tus proyectos de desarrollo locales con un clic, sin abrir terminales: estado por proyecto, consola en vivo y puerto fijo.' },

  // ---- Fuera de la lista, ya publicados ----
  { nombre: 'acmsy', color: '#7008F7', estado: 'publicado', enlace: 'https://acmsy.com', descripcion: 'Convierte un PC propio en una plataforma de despliegue con dominio propio: sueltas una carpeta o un repositorio y queda publicado con HTTPS, base de datos, login y correo.' },
  { nombre: 'Grabber', color: '#FA05A0', estado: 'publicado', enlace: sitio('grabber'), repo: gh('Grabber'), descripcion: 'Gestor de descargas con biblioteca propia: cola con progreso en vivo, colecciones, filtros, papelera y cuentas con doble factor.' },
  { nombre: 'Holm', color: '#18BFD8', estado: 'publicado', enlace: sitio('holm'), repo: gh('Holm'), descripcion: 'Organización personal en lienzos infinitos: tareas, proyectos, notas e ideas que se colocan y se conectan a mano, más hábitos con rachas.' },
  { nombre: 'Hibi', color: '#5AA6D2', estado: 'publicado', enlace: sitio('hibi'), repo: gh('Hibi'), descripcion: 'Organización personal día a día. Su nombre viene del japonés hibi: los días, uno tras otro.' },
  { nombre: 'Spentry', color: '#96D15A', estado: 'publicado', enlace: sitio('spentry'), repo: gh('Spentry'), descripcion: 'Control de gastos diarios: tecleas el monto como en una caja registradora y cada gasto queda guardado como un recibo con folio.' },
  { nombre: 'Splitmate', color: '#0EB5A6', estado: 'publicado', enlace: sitio('splitmate'), repo: gh('Splitmate'), descripcion: 'Gastos compartidos del hogar: quién puso qué, cuánto debe cada uno y cómo se salda la cuenta.' },
  { nombre: 'Drestyl', color: '#7C5CFF', estado: 'publicado', enlace: sitio('drestyl'), repo: gh('Drestyl'), descripcion: 'Registras las prendas de tu clóset con foto y cada mañana recibes una sugerencia de outfit hecha por IA según el clima y tu día.' },
  { nombre: 'Confetti', color: '#F03E78', estado: 'publicado', enlace: sitio('confetti'), repo: gh('Confetti'), descripcion: 'Agenda de cumpleaños, aniversarios y fechas propias que te avisa con la antelación que elijas, por correo y como notificación del celular.' },
  { nombre: 'Subwise', color: '#E6A700', estado: 'publicado', enlace: sitio('subwise'), repo: gh('Subwise'), descripcion: 'Control de suscripciones: qué estás pagando, cuánto suma al mes y cuándo toca cada cobro.' },
  { nombre: 'Sprout', color: '#34E07E', estado: 'publicado', enlace: sitio('sprout'), repo: gh('Sprout'), descripcion: 'Seguimiento de metas y hábitos con rachas: registras el día a día y ves crecer el historial.' },
  { nombre: 'Vértice', color: '#FF6A3D', estado: 'publicado', enlace: sitio('vertice'), repo: gh('Vertice'), descripcion: 'Investigación de operaciones paso a paso: método gráfico, transporte y asignación, cadenas de Markov y colas, con una IA que reconoce el método en el enunciado.' },
  { nombre: 'Gestión de proyectos', color: '#295072', estado: 'publicado', enlace: sitio('gestion'), repo: gh('Gestion-de-proyectos'), descripcion: 'Proyectos, tareas y avances en un solo lugar, con gráficas que muestran cómo va todo.' },
  { nombre: 'Mandarina', color: '#F2731F', estado: 'publicado', enlace: sitio('mandarina'), descripcion: 'Chat privado y sencillo para dos personas: mensajes al instante, avisos cuando te escriben y se instala en el celular como app.' },

  // ---- Fuera de la lista, en el PC ----
  { nombre: 'Grimoire', color: '#8B5CF6', estado: 'desarrollo', descripcion: 'Archivador de escritorio para todo lo que usas con Claude: prompts, documentos, comandos, snippets y archivos, cada pieza como una ficha en su cajón.' },
  { nombre: 'Slate', color: '#E0B04A', estado: 'desarrollo', descripcion: 'Agenda de contenido de YouTube con el cine como lenguaje: la idea nace como post-it, pasa a producción como claqueta y termina en la tira de película del calendario.' },
  { nombre: 'Attestra', color: '#2F6FED', estado: 'desarrollo', descripcion: 'Gestión documental y auditoría para equipos: plantillas con un mismo formato, código consecutivo, firmas con vista previa y versiones inmutables.' },
  { nombre: 'Keyhive', color: '#E8A317', estado: 'idea', descripcion: 'Gestor de contraseñas con clave maestra, frase de respaldo de 12 palabras, códigos TOTP y bloqueo automático. Tiene plan detallado y un inicio en Next.js.' },
  { nombre: 'Guidly', color: '#FF7A59', estado: 'desarrollo', descripcion: 'Crea instructivos paso a paso con texto, imágenes y video para documentar un proceso una vez y compartirlo.' },
  { nombre: 'Qland', color: '#3DDC97', estado: 'desarrollo', descripcion: 'Generador de landing pages en el navegador: eliges una plantilla, la personalizas con tu marca y descargas el proyecto listo para correr.' },
  { nombre: 'CraftAdmin', color: '#5DA130', estado: 'desarrollo', descripcion: 'App de escritorio para el servidor de Minecraft Bedrock en el PC: encenderlo, abrir el túnel para los amigos, lista de permitidos, mundos, respaldos y consola.' },
];
