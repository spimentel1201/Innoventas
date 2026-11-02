// Genera docs/azure-cqa-innovventas-kb-v2.tsv a partir del TSV original.
// Mejoras: enlaces markdown clicable ([texto](/ruta)), alternativas de
// "reembolso por daños", y campo "how to" en la respuesta de devoluciones.
import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('docs/azure-cqa-innovventas-kb.tsv', 'utf8');
const lines = src.split('\n').map((l) => l.replace(/\r$/, ''));

// Reemplazos sobre la ANSWER (columna 2arrays). Cada entrada afecta a todas las
// filas cuyo answer coincida (los pares comparten respuesta).
const answerReplacements = [
  {
    match: 'El equipo valida el caso con tu número de pedido. Detalles en la sección de Cambios y devoluciones.',
    replace:
      'Solicítalo desde **«Mis pedidos»** o por el [formulario de contacto](/contacto) indicando tu número de pedido y el motivo. Detalles en la política de [Cambios y devoluciones](/politicas/cambios).',
  },
  {
    match: 'La política completa está en la sección de Garantías.',
    replace: 'La política completa está en [Garantías](/politicas/garantias).',
  },
  {
    match: 'Abre un caso en la página de Contacto con tu número de pedido y descripción; el equipo coordinará reemplazo o devolución según corresponda.',
    replace:
      'Abre un caso en el [formulario de contacto](/contacto) con tu número de pedido (INV-AAAAMM-######) y descripción; el equipo coordinará reemplazo o devolución según corresponda. Más detalle en [Garantías](/politicas/garantias) y en [Cambios y devoluciones](/politicas/cambios).',
  },
  {
    match: 'Si persiste, abre un caso en Contacto con el modelo, número de pedido y descripción del problema.',
    replace:
      'Si persiste, abre un caso en el [formulario de contacto](/contacto) con el modelo, número de pedido y descripción del problema.',
  },
  {
    match: 'Puedes escribirnos desde la página de **Contacto** (el formulario llega directo al equipo).',
    replace: 'Puedes escribirnos desde el [formulario de contacto](/contacto) (el formulario llega directo al equipo).',
  },
];

// Alternativas nuevas (se agregan como filas con la misma respuesta existente).
const alternateQuestions = [
  {
    questions: [
      '¿Hay reembolso por daños?',
      '¿Me devuelven el dinero si el producto llega dañado?',
      '¿Qué pasa si mi producto llega dañado?',
      '¿El paquete llegó roto, qué hago?',
    ],
    quoteAnswerOf: 'Mi producto llegó dañado',
  },
];

let hits = 0;
const rows = lines.filter((l) => l.trim() !== '');
const out = rows.map((line) => {
  const [q, ...rest] = line.split('\t');
  let answer = rest.join('\t');
  for (const { match, replace } of answerReplacements) {
    if (answer.includes(match)) {
      answer = answer.replace(match, replace);
      hits++;
    }
  }
  return [q, answer].join('\t');
});

// Anexar alternativas nuevas al final, reutilizando la respuesta del par citado
// (de las filas YA transformadas, no del original).
const anchor = out.find((l) => l.startsWith('Mi producto llegó dañado\t'));
if (!anchor) throw new Error('no se encontró el par "Mi producto llegó dañado"');
const anchorAnswer = anchor.split('\t').slice(1).join('\t');

const extras = [];
for (const { questions } of alternateQuestions) {
  for (const q of questions) {
    // solo si la pregunta no existe ya
    if (!rows.some((l) => l.split('\t')[0] === q)) {
      extras.push([q, anchorAnswer].join('\t'));
    }
  }
}

const final = [...out, ...extras].join('\n') + '\n';
writeFileSync('docs/azure-cqa-innovventas-kb-v2.tsv', final);
console.log(`filas originales: ${rows.length} · respuestas mejoradas: ${hits} · alternativas nuevas: ${extras.length}`);
