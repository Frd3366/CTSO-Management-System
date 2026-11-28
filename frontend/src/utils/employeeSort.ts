export type EmployeeSortMode = 'default' | 'az' | 'za';

export const CUSTOM_EMPLOYEE_ORDER: string[] = [
  'muhhamad dimas tonang',
  'ferdi adi wibowo',
  'kadek sri nopiani',
  'ni putu kharisma pradnyawati',
  'ni komang diah pusparini',
  'hendry arivianto',
  'ni kadek dwi budayani',
  'syarif firnanda',
  'fitria ilda rohmawati',
  'komang ayu juniartini',
  'mochammad fathir roisudin',
  'mohammad untung johar syah',
  'bima fedi wijaksono',
  'gede devon nandra suastika',
  'elvira fauziah',
  'anzila krisnawati',
  'aldan naufal aflialdi',
  'enkqi ubay abdillah',
  'devisa cahya ramadhan',
  'arya prodigy siburian',
  'gede adi dwi putra',
  'achmad selo angkoso',
  'intan nur shanti',
];

const ORDER_INDEX_MAP = new Map<string, number>(
  CUSTOM_EMPLOYEE_ORDER.map((name, idx) => [name, idx])
);

function normalizeName(name?: string): string {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getEmployeeOrderRank(name?: string): number {
  const norm = normalizeName(name);
  const exact = ORDER_INDEX_MAP.get(norm);
  if (exact !== undefined) return exact;
  return Number.MAX_SAFE_INTEGER;
}

export function sortByEmployeeOrder<T>(
  items: T[],
  getName: (item: T) => string,
  mode: EmployeeSortMode = 'default'
): T[] {
  return [...items].sort((a, b) => {
    const nameA = (getName(a) || '').trim();
    const nameB = (getName(b) || '').trim();

    if (mode === 'az') {
      return nameA.localeCompare(nameB, 'id', { sensitivity: 'base' });
    }
    if (mode === 'za') {
      return nameB.localeCompare(nameA, 'id', { sensitivity: 'base' });
    }

    // Default custom CTSO order; unlisted/new employees automatically placed at bottom preserving order
    const rankA = getEmployeeOrderRank(nameA);
    const rankB = getEmployeeOrderRank(nameB);
    if (rankA !== rankB) return rankA - rankB;
    return 0;
  });
}
