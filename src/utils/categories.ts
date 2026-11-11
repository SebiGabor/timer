import type { SectionCategory } from '../types';

export interface CategoryMeta {
  id: SectionCategory;
  label: string;
  shortLabel: string;
  hex: string;
  badgeClass: string;
  dotClass: string;
}

export const CATEGORIES: Record<SectionCategory, CategoryMeta> = {
  intro: {
    id: 'intro',
    label: 'Deschidere / Recap',
    shortLabel: 'Intro',
    hex: '#38bdf8',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    dotClass: 'bg-sky-400',
  },
  theory: {
    id: 'theory',
    label: 'Teorie / Concepte',
    shortLabel: 'Teorie',
    hex: '#a78bfa',
    badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    dotClass: 'bg-violet-400',
  },
  demo: {
    id: 'demo',
    label: 'Demo / Exemplu Live',
    shortLabel: 'Demo',
    hex: '#34d399',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dotClass: 'bg-emerald-400',
  },
  exercise: {
    id: 'exercise',
    label: 'Exercițiu / Practică',
    shortLabel: 'Exercițiu',
    hex: '#fbbf24',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dotClass: 'bg-amber-400',
  },
  break: {
    id: 'break',
    label: 'Pauză',
    shortLabel: 'Pauză',
    hex: '#94a3b8',
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    dotClass: 'bg-slate-400',
  },
  qa: {
    id: 'qa',
    label: 'Q&A / Concluzii',
    shortLabel: 'Q&A',
    hex: '#fb7185',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    dotClass: 'bg-rose-400',
  },
};

export const CATEGORY_LIST: CategoryMeta[] = Object.values(CATEGORIES);
