export interface Project {
  id: string;
  name: string;
  twColor: string;
  twText: string;
}

export interface Musician {
  id: string;
  name: string;
  instrument: string;
}

export interface LineupFreela {
  musicianId: string;
  agreedFee: number;
  isPaid: boolean;
}

export interface Gig {
  id: string;
  projectId: string;
  title: string;
  location: string;
  date: string; // ISO String
  grossValue: number;
  lineup: LineupFreela[];
  paid: boolean;
}

export const mockedProjects: Project[] = [
  { id: 'p1', name: 'Agenda Oficial', twColor: 'bg-blue-500', twText: 'text-blue-500' },
  { id: 'p2', name: 'Projeto DNP (Convidados)', twColor: 'bg-purple-500', twText: 'text-purple-500' },
  { id: 'p3', name: 'Residência de Quinta', twColor: 'bg-amber-500', twText: 'text-amber-500' },
];

export const mockedMusicians: Musician[] = [
  { id: 'm1', name: 'Carlos', instrument: 'Baixo' },
  { id: 'm2', name: 'João', instrument: 'Bateria' },
  { id: 'm3', name: 'Ana', instrument: 'Teclado' },
];

export const mockedGigs: Gig[] = [
  {
    id: 'g1',
    projectId: 'p1',
    title: 'Show Principal - Auditório Ibirapuera',
    location: 'São Paulo, SP',
    date: '2026-05-12T19:00:00Z',
    grossValue: 4500,
    lineup: [
      { musicianId: 'm1', agreedFee: 600, isPaid: true },
      { musicianId: 'm2', agreedFee: 600, isPaid: false },
      { musicianId: 'm3', agreedFee: 800, isPaid: false },
    ],
    paid: false,
  },
  {
    id: 'g2',
    projectId: 'p2',
    title: 'Edição Especial DNP',
    location: 'Casa de Cultura, SP',
    date: '2026-05-20T21:00:00Z',
    grossValue: 2500,
    lineup: [
      { musicianId: 'm1', agreedFee: 400, isPaid: false },
      { musicianId: 'm2', agreedFee: 400, isPaid: false },
    ],
    paid: false,
  },
  {
    id: 'g3',
    projectId: 'p3',
    title: 'Ensaio Aberto & Show',
    location: 'Bar do Zé, RJ',
    date: '2026-06-05T18:30:00Z',
    grossValue: 1200,
    lineup: [
      { musicianId: 'm1', agreedFee: 300, isPaid: true },
      { musicianId: 'm2', agreedFee: 300, isPaid: true },
      { musicianId: 'm3', agreedFee: 300, isPaid: false },
    ],
    paid: false,
  },
];
