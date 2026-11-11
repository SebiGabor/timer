import type { Recipe } from '../types';

export function buildDefaultRecipes(): Recipe[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'starter-curs-90',
      title: 'Curs Universitar Standard',
      tag: 'Curs 90m',
      targetMinutes: 90,
      autoAdvance: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      sections: [
        {
          id: 's-90-1',
          title: 'Deschidere & Recapitulare',
          durationSeconds: 8 * 60,
          category: 'intro',
          cueNote: 'Doar 2-3 idei cheie de data trecută, fără detalii.',
        },
        {
          id: 's-90-2',
          title: 'Conceptul Principal I',
          durationSeconds: 22 * 60,
          category: 'theory',
          cueNote: 'Păstrează focusul pe intuiție înainte de formalism.',
        },
        {
          id: 's-90-3',
          title: 'Exemplu Concret / Demo Live',
          durationSeconds: 15 * 60,
          category: 'demo',
          cueNote: 'Dacă apare un bug neprevăzut, trece la slide-ul de backup.',
        },
        {
          id: 's-90-4',
          title: 'Pauză scurtă',
          durationSeconds: 5 * 60,
          category: 'break',
        },
        {
          id: 's-90-5',
          title: 'Conceptul II & Studiu de Caz',
          durationSeconds: 25 * 60,
          category: 'theory',
        },
        {
          id: 's-90-6',
          title: 'Concluzii & Întrebări (Buffer)',
          durationSeconds: 15 * 60,
          category: 'qa',
          cueNote: 'Tampon de siguranță pentru întrebări și rezumat final.',
        },
      ],
    },
    {
      id: 'starter-seminar-50',
      title: 'Seminar / Laborator',
      tag: 'Lab 50m',
      targetMinutes: 50,
      autoAdvance: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      sections: [
        {
          id: 's-50-1',
          title: 'Briefing & Obiective',
          durationSeconds: 5 * 60,
          category: 'intro',
          cueNote: 'Explică clar cerința înainte să deschidă IDE-ul.',
        },
        {
          id: 's-50-2',
          title: 'Exercițiu Ghidat Împreună',
          durationSeconds: 15 * 60,
          category: 'demo',
        },
        {
          id: 's-50-3',
          title: 'Lucru Individual / Echipe',
          durationSeconds: 20 * 60,
          category: 'exercise',
        },
        {
          id: 's-50-4',
          title: 'Debrief & Soluții',
          durationSeconds: 10 * 60,
          category: 'qa',
        },
      ],
    },
    {
      id: 'starter-lightning-15',
      title: 'Prezentare Scurtă / Talk',
      tag: '15 min',
      targetMinutes: 15,
      autoAdvance: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      sections: [
        {
          id: 's-15-1',
          title: 'Hook & Problema',
          durationSeconds: 2 * 60,
          category: 'intro',
        },
        {
          id: 's-15-2',
          title: 'Arhitectura Soluției',
          durationSeconds: 5 * 60,
          category: 'theory',
        },
        {
          id: 's-15-3',
          title: 'Demo Rapid',
          durationSeconds: 5 * 60,
          category: 'demo',
        },
        {
          id: 's-15-4',
          title: 'Concluzie & Întrebări',
          durationSeconds: 3 * 60,
          category: 'qa',
        },
      ],
    },
  ];
}
