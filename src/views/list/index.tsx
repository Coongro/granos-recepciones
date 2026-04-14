/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, max-lines-per-function, complexity */
import { getHostReact, getHostUI, usePlugin, actions } from '@coongro/plugin-sdk';

const React = getHostReact();
const UI = getHostUI();
const { useState, useEffect, useCallback, useRef, useMemo } = React;

interface Receipt {
  id: string;
  receptionDate: string;
  receiptNumber: string;
  producerId: string;
  grainType: string;
  grossKg: number;
  taraKg: number;
  finalNetKg: number;
  status: string;
  ctgNumber: string;
  driverId: string;
  transportCompany: string;
  harvest: string;
  pricePerTon: number;
  netWithoutCleaningKg: number;
  precleaningKg: number;
  netKg: number;
  shrinkageKg: number;
  humidityPercent: number;
  foreignMatterGr: number;
  dirtGr: number;
  shellGr: number;
  damagedGrainGr: number;
  looseGrainGr: number;
  aptGrainGr: number;
  sampleTotalGr: number;
  dirtPercent: number;
  stickPercent: number;
  boxPercent: number;
  aptPercent: number;
  loosePercent: number;
  boxGrainPercent: number;
  industryKg: number;
  confectioneryKg: number;
  zarandaSize: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

interface FormData {
  receiptNumber: string;
  ctgNumber: string;
  producerId: string;
  driverId: string;
  transportCompany: string;
  receptionDate: string;
  grainType: string;
  harvest: string;
  pricePerTon: number;
  status: string;
  grossKg: number;
  taraKg: number;
  netWithoutCleaningKg: number;
  precleaningKg: number;
  netKg: number;
  humidityPercent: number;
  shrinkageKg: number;
  finalNetKg: number;
  foreignMatterGr: number;
  dirtGr: number;
  shellGr: number;
  damagedGrainGr: number;
  looseGrainGr: number;
  aptGrainGr: number;
  sampleTotalGr: number;
  dirtPercent: number;
  stickPercent: number;
  boxPercent: number;
  aptPercent: number;
  loosePercent: number;
  boxGrainPercent: number;
  industryKg: number;
  confectioneryKg: number;
  zarandaSize: number;
  notes: string;
}

// ── Funciones de calculo ──

function calcSamplePercentages(form: FormData): Partial<FormData> {
  const sampleTotalGr =
    form.foreignMatterGr + form.dirtGr + form.shellGr + form.looseGrainGr + form.aptGrainGr;
  if (sampleTotalGr <= 0) {
    return {
      sampleTotalGr: 0,
      stickPercent: 0,
      dirtPercent: 0,
      boxPercent: 0,
      boxGrainPercent: 0,
      loosePercent: 0,
      aptPercent: 0,
    };
  }
  return {
    sampleTotalGr,
    stickPercent: Math.round(((form.foreignMatterGr * 100) / sampleTotalGr) * 100) / 100,
    dirtPercent: Math.round(((form.dirtGr * 100) / sampleTotalGr) * 100) / 100,
    boxPercent: Math.round(((form.shellGr * 100) / sampleTotalGr) * 100) / 100,
    boxGrainPercent: Math.round(((form.damagedGrainGr * 100) / sampleTotalGr) * 100) / 100,
    loosePercent: Math.round(((form.looseGrainGr * 100) / sampleTotalGr) * 100) / 100,
    aptPercent: Math.round(((form.aptGrainGr * 100) / sampleTotalGr) * 100) / 100,
  };
}

function calcShrinkage(netKg: number, humidityPercent: number): number {
  if (humidityPercent > 9) {
    return Math.round(netKg * ((humidityPercent - 9) / 100) * 1.3 * 100) / 100;
  }
  return 0;
}

function calcWeights(form: FormData): Partial<FormData> {
  const netWithoutCleaningKg = form.grossKg - form.taraKg;
  const netKg = netWithoutCleaningKg - form.precleaningKg;
  const shrinkageKg = calcShrinkage(netKg, form.humidityPercent);
  const finalNetKg = netKg - shrinkageKg;
  return { netWithoutCleaningKg, netKg, shrinkageKg, finalNetKg };
}

function calcIndustryConfectionery(form: FormData): Partial<FormData> {
  const finalNetKg = form.finalNetKg ?? 0;
  const loosePercent = form.loosePercent ?? 0;
  const damagedPercent = form.boxGrainPercent ?? 0;
  const aptPercent = form.aptPercent ?? 0;
  return {
    industryKg: Math.round(finalNetKg * ((loosePercent + damagedPercent) / 100) * 100) / 100,
    confectioneryKg: Math.round(finalNetKg * (aptPercent / 100) * 100) / 100,
  };
}

function recalcAll(base: FormData): FormData {
  const weights = calcWeights(base);
  const withWeights = { ...base, ...weights };
  const sample = calcSamplePercentages(withWeights);
  const withSample = { ...withWeights, ...sample };
  const industry = calcIndustryConfectionery(withSample);
  return { ...withSample, ...industry };
}

const EMPTY_FORM: FormData = recalcAll({
  receiptNumber: '',
  ctgNumber: '',
  producerId: '',
  driverId: '',
  transportCompany: '',
  receptionDate: '',
  grainType: 'mani_caja_runner',
  harvest: '',
  pricePerTon: 0,
  status: 'pending',
  grossKg: 0,
  taraKg: 0,
  netWithoutCleaningKg: 0,
  precleaningKg: 0,
  netKg: 0,
  humidityPercent: 0,
  shrinkageKg: 0,
  finalNetKg: 0,
  foreignMatterGr: 0,
  dirtGr: 0,
  shellGr: 0,
  damagedGrainGr: 0,
  looseGrainGr: 0,
  aptGrainGr: 0,
  sampleTotalGr: 0,
  dirtPercent: 0,
  stickPercent: 0,
  boxPercent: 0,
  aptPercent: 0,
  loosePercent: 0,
  boxGrainPercent: 0,
  industryKg: 0,
  confectioneryKg: 0,
  zarandaSize: 0,
  notes: '',
});

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-AR');
  } catch {
    return dateStr;
  }
};

// Selecciona todo el texto al hacer foco en un input numerico
const numericFocusProps = {
  onFocus: (e: { target: { select: () => void } }) => e.target.select(),
};

export function ListView() {
  const { toast } = usePlugin();

  // --- Estado principal ---
  const [items, setItems] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Record<string, unknown>[]>([]);
  const [drivers, setDrivers] = useState<Record<string, unknown>[]>([]);

  // --- Busqueda, filtros, sort, paginacion ---
  const [localSearch, setLocalSearch] = useState('');
  const [filterGraintype, setFilterGraintype] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const [sortKey, setSortKey] = useState<string | null>('receptionDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // --- Modal ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Receipt | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Receipt | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // --- Carga de datos ---
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const [result, ...related] = await Promise.all([
        actions.execute<Receipt[]>('granos-recepciones.receipts.list'),
        actions.execute<Record<string, unknown>[]>('contacts.list').catch(() => []),
        actions
          .execute<Record<string, unknown>[]>('granos-recepciones.drivers.list')
          .catch(() => []),
      ]);
      if (mountedRef.current) {
        setItems(Array.isArray(result) ? result : []);
        if (mountedRef.current)
          setContacts(Array.isArray(related[0]) ? (related[0] as Record<string, unknown>[]) : []);
        if (mountedRef.current)
          setDrivers(Array.isArray(related[1]) ? (related[1] as Record<string, unknown>[]) : []);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) setError((err as Error).message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const getContactsName = (id: string): string => {
    const found = contacts.find((c) => String(c.id) === id);
    return found ? String(found.name ?? id) : id;
  };

  const _getDriversName = (id: string): string => {
    const found = drivers.find((c) => String(c.id) === id);
    return found ? String(found.name ?? id) : id;
  };

  // --- Filtrado y sort local ---
  const filtered = useMemo(() => {
    let result = [...items];
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase();
      result = result.filter(
        (item) =>
          String(item.receiptNumber ?? '')
            .toLowerCase()
            .includes(q) ||
          String(item.producerId ?? '')
            .toLowerCase()
            .includes(q)
      );
    }
    if (filterGraintype)
      result = result.filter((item) => String(item.grainType) === filterGraintype);
    if (filterStatus) result = result.filter((item) => String(item.status) === filterStatus);

    if (sortKey && sortDir) {
      result.sort((a, b) => {
        const aRaw = (a as Record<string, unknown>)[sortKey];
        const bRaw = (b as Record<string, unknown>)[sortKey];
        const aNum = Number(aRaw);
        const bNum = Number(bRaw);
        const cmp =
          !isNaN(aNum) && !isNaN(bNum)
            ? aNum - bNum
            : String(aRaw ?? '').localeCompare(String(bRaw ?? ''));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [items, localSearch, filterGraintype, filterStatus, sortKey, sortDir]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  // --- Handlers ---
  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((key: string, direction: 'asc' | 'desc' | null) => {
    setSortKey(direction ? key : null);
    setSortDir(direction);
    setPage(1);
  }, []);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((item: Receipt) => {
    setEditing(item);
    const base: FormData = {
      receiptNumber: item.receiptNumber ?? '',
      ctgNumber: item.ctgNumber ?? '',
      producerId: item.producerId ?? '',
      driverId: item.driverId ?? '',
      transportCompany: item.transportCompany ?? '',
      receptionDate: item.receptionDate ?? '',
      grainType: item.grainType ?? '',
      harvest: item.harvest ?? '',
      pricePerTon: item.pricePerTon ?? 0,
      status: item.status ?? '',
      grossKg: item.grossKg ?? 0,
      taraKg: item.taraKg ?? 0,
      netWithoutCleaningKg: item.netWithoutCleaningKg ?? 0,
      precleaningKg: item.precleaningKg ?? 0,
      netKg: item.netKg ?? 0,
      humidityPercent: item.humidityPercent ?? 0,
      shrinkageKg: item.shrinkageKg ?? 0,
      finalNetKg: item.finalNetKg ?? 0,
      foreignMatterGr: item.foreignMatterGr ?? 0,
      dirtGr: item.dirtGr ?? 0,
      shellGr: item.shellGr ?? 0,
      damagedGrainGr: item.damagedGrainGr ?? 0,
      looseGrainGr: item.looseGrainGr ?? 0,
      aptGrainGr: item.aptGrainGr ?? 0,
      sampleTotalGr: item.sampleTotalGr ?? 0,
      dirtPercent: item.dirtPercent ?? 0,
      stickPercent: item.stickPercent ?? 0,
      boxPercent: item.boxPercent ?? 0,
      aptPercent: item.aptPercent ?? 0,
      loosePercent: item.loosePercent ?? 0,
      boxGrainPercent: item.boxGrainPercent ?? 0,
      industryKg: item.industryKg ?? 0,
      confectioneryKg: item.confectioneryKg ?? 0,
      zarandaSize: item.zarandaSize ?? 0,
      notes: item.notes ?? '',
    };
    setForm(recalcAll(base));
    setDialogOpen(true);
  }, []);

  // Helper para actualizar un campo y recalcular todo
  const updateField = useCallback((field: keyof FormData, value: string | number) => {
    setForm((prev: FormData) => recalcAll({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    const calculated = recalcAll(form);
    const payload = {
      receiptNumber: calculated.receiptNumber,
      ctgNumber: calculated.ctgNumber,
      producerId: calculated.producerId,
      driverId: calculated.driverId,
      transportCompany: calculated.transportCompany,
      receptionDate: calculated.receptionDate,
      grainType: calculated.grainType,
      harvest: calculated.harvest,
      pricePerTon: calculated.pricePerTon,
      status: calculated.status,
      grossKg: calculated.grossKg,
      taraKg: calculated.taraKg,
      netWithoutCleaningKg: calculated.netWithoutCleaningKg,
      precleaningKg: calculated.precleaningKg,
      netKg: calculated.netKg,
      humidityPercent: calculated.humidityPercent,
      shrinkageKg: calculated.shrinkageKg,
      finalNetKg: calculated.finalNetKg,
      foreignMatterGr: calculated.foreignMatterGr,
      dirtGr: calculated.dirtGr,
      shellGr: calculated.shellGr,
      damagedGrainGr: calculated.damagedGrainGr,
      looseGrainGr: calculated.looseGrainGr,
      aptGrainGr: calculated.aptGrainGr,
      sampleTotalGr: calculated.sampleTotalGr,
      dirtPercent: calculated.dirtPercent,
      stickPercent: calculated.stickPercent,
      boxPercent: calculated.boxPercent,
      aptPercent: calculated.aptPercent,
      loosePercent: calculated.loosePercent,
      boxGrainPercent: calculated.boxGrainPercent,
      industryKg: calculated.industryKg,
      confectioneryKg: calculated.confectioneryKg,
      zarandaSize: calculated.zarandaSize,
      notes: calculated.notes,
    };
    setSaving(true);
    try {
      if (editing) {
        await actions.execute('granos-recepciones.receipts.update', {
          id: editing.id,
          data: { ...payload, updatedAt: new Date().toISOString() },
        });
        toast.success('Guardado', 'Carta de porte actualizada correctamente');
      } else {
        await actions.execute('granos-recepciones.receipts.create', {
          data: {
            id: crypto.randomUUID(),
            ...payload,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
        toast.success('Creado', 'Carta de porte registrada correctamente');
      }
      setDialogOpen(false);
      void fetchItems();
    } catch {
      toast.error('Error', 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }, [editing, saving, form, fetchItems, toast]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget || saving) return;
    setSaving(true);
    try {
      await actions.execute('granos-recepciones.receipts.delete', { id: deleteTarget.id });
      toast.success('Eliminado', 'Carta de porte eliminada correctamente');
    } catch {
      toast.error('Error', 'No se pudo eliminar');
    } finally {
      setSaving(false);
    }
    setDeleteTarget(null);
    void fetchItems();
  }, [deleteTarget, saving, fetchItems, toast]);

  // --- Boton crear para el header y empty state ---
  const createButton = React.createElement(
    UI.Button,
    { onClick: openCreate },
    React.createElement(UI.DynamicIcon, { icon: 'Plus', size: 16 }),
    'Nuevo'
  );

  return React.createElement(
    'div',
    { className: 'font-inter min-h-screen bg-cg-bg-secondary p-6' },
    React.createElement(
      'div',
      { className: 'max-w-full flex flex-col gap-6' },

      // ── Header ──
      React.createElement(
        'div',
        { className: 'flex items-center justify-between' },
        React.createElement(
          'div',
          null,
          React.createElement(
            'h1',
            { className: 'text-2xl font-bold text-cg-text' },
            'Cartas de Porte'
          ),
          React.createElement(
            'p',
            { className: 'text-sm text-cg-text-muted mt-1' },
            loading
              ? 'Cargando...'
              : `${filtered.length} registro${filtered.length === 1 ? '' : 's'}`
          )
        ),
        createButton
      ),

      // ── DataTable ──
      React.createElement(UI.DataTable, {
        data: paged,
        loading,
        error,
        onRetry: () => {
          void fetchItems();
        },
        className: 'bg-cg-bg rounded-xl border border-cg-border shadow-sm p-6',

        // Columnas
        columns: [
          {
            key: 'receptionDate',
            header: 'Fecha',
            sortable: true,
            render: (item: Receipt) => formatDate(item.receptionDate),
            className: 'whitespace-nowrap',
          },
          {
            key: 'receiptNumber',
            header: 'Nro. Carta Porte',
            sortable: true,
            className: 'max-w-[200px] truncate',
          },
          {
            key: 'producerId',
            header: 'Productor',
            sortable: true,
            render: (item: Receipt) => getContactsName(item.producerId),
            className: 'max-w-[200px] truncate',
          },
          {
            key: 'grainType',
            header: 'Tipo de Grano',
            sortable: true,
            render: (item: Receipt) =>
              item.grainType
                ? React.createElement(UI.Badge, { variant: 'default', size: 'sm' }, item.grainType)
                : '—',
          },
          {
            key: 'grossKg',
            header: 'Kg Bruto',
            sortable: true,
            render: (item: Receipt) => Number(item.grossKg ?? 0).toLocaleString('es-AR'),
          },
          {
            key: 'finalNetKg',
            header: 'Kg Neto Final',
            sortable: true,
            render: (item: Receipt) => Number(item.finalNetKg ?? 0).toLocaleString('es-AR'),
          },
          {
            key: 'industryKg',
            header: 'Kg Industria',
            sortable: true,
            render: (item: Receipt) => Number(item.industryKg ?? 0).toLocaleString('es-AR'),
          },
          {
            key: 'confectioneryKg',
            header: 'Kg Confiteria',
            sortable: true,
            render: (item: Receipt) => Number(item.confectioneryKg ?? 0).toLocaleString('es-AR'),
          },
          {
            key: 'status',
            header: 'Estado',
            sortable: true,
            render: (item: Receipt) =>
              item.status
                ? React.createElement(UI.Badge, { variant: 'default', size: 'sm' }, item.status)
                : '—',
          },
        ],

        // Busqueda
        searchPlaceholder: 'Buscar...',
        searchValue: localSearch,
        onSearchChange: handleSearchChange,

        // Filtros (ButtonGroup sections)
        filterSections: [
          {
            key: 'grainType',
            label: 'Tipo de Grano',
            value: filterGraintype,
            onChange: (v: string) => {
              setFilterGraintype(v);
              setPage(1);
            },
            options: [
              { value: 'mani_caja_runner', label: 'Mani Caja Runner' },
              { value: 'mani_blancheado', label: 'Mani Blancheado' },
            ],
          },
          {
            key: 'status',
            label: 'Estado',
            value: filterStatus,
            onChange: (v: string) => {
              setFilterStatus(v);
              setPage(1);
            },
            options: [
              { value: 'pending', label: 'Pendiente' },
              { value: 'processed', label: 'Procesada' },
              { value: 'certified', label: 'Certificada' },
            ],
          },
        ],

        // Sort
        sortKey,
        sortDirection: sortDir,
        onSortChange: handleSortChange,

        // Paginacion
        pagination: { page, pageSize, total: filtered.length },
        onPageChange: setPage,

        // Acciones por fila
        actions: [
          {
            label: 'Copiar',
            onClick: (item: Receipt) => {
              const text = `Carta de Porte N.o ${item.receiptNumber ?? ''} | Fecha: ${formatDate(item.receptionDate)} | Productor: ${getContactsName(item.producerId)} | Tipo: ${item.grainType ?? ''} | Bruto: ${Number(item.grossKg ?? 0).toLocaleString('es-AR')} kg | Neto Final: ${Number(item.finalNetKg ?? 0).toLocaleString('es-AR')} kg | Estado: ${item.status ?? ''}`;
              void navigator.clipboard.writeText(text);
              toast.success('Copiado', 'Datos copiados al portapapeles');
            },
          },
          {
            label: 'Marcar Procesada',
            onClick: (item: Receipt) => {
              void actions.execute('granos-recepciones.receipts.update', {
                id: item.id,
                data: { status: 'processed', updatedAt: new Date().toISOString() },
              });
              void fetchItems();
            },
          },
          {
            label: 'Marcar Certificada',
            onClick: (item: Receipt) => {
              void actions.execute('granos-recepciones.receipts.update', {
                id: item.id,
                data: { status: 'certified', updatedAt: new Date().toISOString() },
              });
              void fetchItems();
            },
          },
          { label: 'Editar', onClick: openEdit },
          {
            label: 'Eliminar',
            onClick: (item: Receipt) => setDeleteTarget(item),
            variant: 'destructive' as const,
          },
        ],

        // Empty state
        emptyState: {
          title: 'Aun no hay cartas de porte',
          description: 'Registra la primera recepcion con el boton de arriba.',
          icon: React.createElement(UI.DynamicIcon, {
            icon: 'FileText',
            size: 40,
            className: 'text-cg-text-muted',
          }),
          filteredTitle: 'No se encontraron resultados con esos filtros',
        },
      }),

      // ── FormDialog crear/editar ──
      dialogOpen &&
        React.createElement(UI.FormDialog, {
          open: dialogOpen,
          onOpenChange: (open: boolean) => {
            if (!open) setDialogOpen(false);
          },
          title: editing ? 'Editar carta de porte' : 'Nueva carta de porte',
          size: 'lg',
          footer: React.createElement(
            React.Fragment,
            null,
            React.createElement(
              UI.Button,
              { variant: 'outline', onClick: () => setDialogOpen(false) },
              'Cancelar'
            ),
            React.createElement(
              UI.Button,
              {
                onClick: () => {
                  void handleSave();
                },
                disabled: saving,
              },
              saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear'
            )
          ),
          children: React.createElement(
            'div',
            { className: 'flex flex-col gap-6' },

            // ── Seccion 1: Datos generales ──
            React.createElement(
              'h3',
              {
                className:
                  'text-sm font-semibold text-cg-text-muted uppercase tracking-wide border-b border-cg-border pb-2',
              },
              'Datos generales'
            ),
            React.createElement(
              'div',
              { className: 'grid grid-cols-2 gap-4' },
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Nro. Carta de Porte *'),
                React.createElement(UI.Input, {
                  value: form.receiptNumber,
                  placeholder: 'Nro. Carta de Porte...',
                  onChange: (e: { target: { value: string } }) =>
                    updateField('receiptNumber', e.target.value),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Nro. CTG'),
                React.createElement(UI.Input, {
                  value: form.ctgNumber,
                  placeholder: 'Nro. CTG...',
                  onChange: (e: { target: { value: string } }) =>
                    updateField('ctgNumber', e.target.value),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Productor *'),
                React.createElement(
                  UI.Combobox,
                  {
                    value: form.producerId,
                    onValueChange: (v: string) => updateField('producerId', v),
                  },
                  React.createElement(UI.ComboboxChipTrigger, {
                    placeholder: 'Buscar productor...',
                    renderChip: (val: string, onRemove: () => void) => {
                      const c = contacts.find((x: Record<string, unknown>) => String(x.id) === val);
                      return React.createElement(
                        UI.Chip,
                        { size: 'sm', onRemove },
                        String(c?.name ?? val)
                      );
                    },
                  }),
                  React.createElement(
                    UI.ComboboxContent,
                    null,
                    ...contacts
                      .filter(() => true)
                      .map((c: Record<string, unknown>) =>
                        React.createElement(
                          UI.ComboboxItem,
                          { key: String(c.id), value: String(c.id) },
                          String(c.name ?? c.id)
                        )
                      ),
                    React.createElement(UI.ComboboxEmpty, null, 'Sin productores encontrados'),
                    React.createElement(UI.ComboboxCreate, {
                      label: 'Crear productor "{search}"',
                      onCreate: async (name: string) => {
                        const newId = crypto.randomUUID();
                        try {
                          await actions.execute('contacts.create', {
                            data: {
                              id: newId,
                              name,
                              type: 'producer',
                              is_active: true,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            },
                          });
                          updateField('producerId', newId);
                          await fetchItems();
                          toast.success('Productor creado', `Se creo "${name}"`);
                        } catch {
                          toast.error('Error', 'No se pudo crear el productor');
                        }
                      },
                    })
                  )
                )
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Conductor'),
                React.createElement(
                  UI.Combobox,
                  {
                    value: form.driverId,
                    onValueChange: (v: string) => updateField('driverId', v),
                  },
                  React.createElement(UI.ComboboxChipTrigger, {
                    placeholder: 'Buscar conductor...',
                    renderChip: (val: string, onRemove: () => void) => {
                      const d = drivers.find((x: Record<string, unknown>) => String(x.id) === val);
                      return React.createElement(
                        UI.Chip,
                        { size: 'sm', onRemove },
                        String(d?.name ?? val)
                      );
                    },
                  }),
                  React.createElement(
                    UI.ComboboxContent,
                    null,
                    ...drivers.map((d: Record<string, unknown>) =>
                      React.createElement(
                        UI.ComboboxItem,
                        { key: String(d.id), value: String(d.id) },
                        String(d.name ?? d.id)
                      )
                    ),
                    React.createElement(UI.ComboboxEmpty, null, 'Sin conductores encontrados'),
                    React.createElement(UI.ComboboxCreate, {
                      label: 'Crear conductor "{search}"',
                      onCreate: async (name: string) => {
                        const newId = crypto.randomUUID();
                        try {
                          await actions.execute('granos-recepciones.drivers.create', {
                            data: {
                              id: newId,
                              name,
                              type: 'external',
                              isActive: true,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            },
                          });
                          updateField('driverId', newId);
                          await fetchItems();
                          toast.success('Conductor creado', `Se creo "${name}"`);
                        } catch {
                          toast.error('Error', 'No se pudo crear el conductor');
                        }
                      },
                    })
                  )
                )
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Empresa Transportista'),
                React.createElement(UI.Input, {
                  value: form.transportCompany,
                  placeholder: 'Nombre de la empresa...',
                  onChange: (e: { target: { value: string } }) =>
                    updateField('transportCompany', e.target.value),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Fecha de Recepcion *'),
                React.createElement(UI.Input, {
                  type: 'date',
                  value: form.receptionDate,
                  onChange: (e: { target: { value: string } }) =>
                    updateField('receptionDate', e.target.value),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Tipo de Grano *'),
                React.createElement(
                  UI.Select,
                  {
                    value: form.grainType,
                    onValueChange: (v: string) => updateField('grainType', v),
                  },
                  React.createElement(
                    UI.SelectItem,
                    { key: 'mani_caja_runner', value: 'mani_caja_runner' },
                    'Mani Caja Runner'
                  ),
                  React.createElement(
                    UI.SelectItem,
                    { key: 'mani_blancheado', value: 'mani_blancheado' },
                    'Mani Blancheado'
                  )
                )
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Cosecha'),
                React.createElement(UI.Input, {
                  value: form.harvest,
                  placeholder: 'Cosecha...',
                  onChange: (e: { target: { value: string } }) =>
                    updateField('harvest', e.target.value),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Precio por Tonelada'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.pricePerTon,
                  ...numericFocusProps,
                  onChange: (e: { target: { value: string } }) =>
                    updateField('pricePerTon', Number(e.target.value)),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Estado *'),
                React.createElement(
                  UI.Select,
                  {
                    value: form.status,
                    onValueChange: (v: string) => updateField('status', v),
                  },
                  React.createElement(
                    UI.SelectItem,
                    { key: 'pending', value: 'pending' },
                    'Pendiente'
                  ),
                  React.createElement(
                    UI.SelectItem,
                    { key: 'processed', value: 'processed' },
                    'Procesada'
                  ),
                  React.createElement(
                    UI.SelectItem,
                    { key: 'certified', value: 'certified' },
                    'Certificada'
                  )
                )
              )
            ),

            // ── Seccion 2: Detalle de kilos ──
            React.createElement(
              'h3',
              {
                className:
                  'text-sm font-semibold text-cg-text-muted uppercase tracking-wide border-b border-cg-border pb-2',
              },
              'Detalle de kilos'
            ),
            React.createElement(
              'div',
              { className: 'grid grid-cols-2 gap-4' },
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Kg Bruto *'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.grossKg,
                  ...numericFocusProps,
                  onChange: (e: { target: { value: string } }) =>
                    updateField('grossKg', Number(e.target.value)),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Tara Kg *'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.taraKg,
                  ...numericFocusProps,
                  onChange: (e: { target: { value: string } }) =>
                    updateField('taraKg', Number(e.target.value)),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Neto sin Limpieza'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.netWithoutCleaningKg,
                  readOnly: true,
                  className: 'bg-cg-bg-secondary',
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(
                  'div',
                  { className: 'flex items-center gap-1' },
                  React.createElement(UI.Label, null, 'Pre-limpieza (kg)'),
                  React.createElement(
                    'span',
                    {
                      className: 'text-xs text-cg-text-muted',
                      title:
                        'Peso removido en pre-limpieza antes del analisis de muestra. Dejar en 0 si no aplica.',
                    },
                    '(?)'
                  )
                ),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.precleaningKg,
                  ...numericFocusProps,
                  onChange: (e: { target: { value: string } }) =>
                    updateField('precleaningKg', Number(e.target.value)),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Kg Neto'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.netKg,
                  readOnly: true,
                  className: 'bg-cg-bg-secondary',
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, '% Humedad'),
                React.createElement(UI.Input, {
                  type: 'number',
                  step: '0.1',
                  value: form.humidityPercent,
                  ...numericFocusProps,
                  onChange: (e: { target: { value: string } }) =>
                    updateField('humidityPercent', Number(e.target.value)),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(
                  UI.Label,
                  null,
                  'Merma por humedad (kg)',
                  form.humidityPercent > 9
                    ? React.createElement(
                        'span',
                        { className: 'text-xs text-cg-text-muted ml-1' },
                        `(${form.humidityPercent}% > 9%)`
                      )
                    : null
                ),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.shrinkageKg,
                  readOnly: true,
                  className: 'bg-cg-bg-secondary',
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Kg Neto Final'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.finalNetKg,
                  readOnly: true,
                  className: 'bg-cg-bg-secondary font-semibold',
                })
              )
            ),

            // ── Seccion 3: Analisis de muestra ──
            React.createElement(
              'h3',
              {
                className:
                  'text-sm font-semibold text-cg-text-muted uppercase tracking-wide border-b border-cg-border pb-2',
              },
              'Analisis de muestra (gramos)'
            ),
            React.createElement(
              'p',
              { className: 'text-xs text-cg-text-muted -mt-2' },
              'Ingresa los gramos de cada componente. Los porcentajes y totales se calculan automaticamente.'
            ),
            React.createElement(
              'div',
              { className: 'grid grid-cols-3 gap-4' },
              // C.E.
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'C.E. (Cuerpos Extr.) gr'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.foreignMatterGr,
                  ...numericFocusProps,
                  onChange: (e: { target: { value: string } }) =>
                    updateField('foreignMatterGr', Number(e.target.value)),
                }),
                React.createElement(
                  'span',
                  { className: 'text-xs text-cg-text-muted' },
                  `${form.stickPercent}%`
                )
              ),
              // Tierra
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Tierra (gr)'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.dirtGr,
                  ...numericFocusProps,
                  onChange: (e: { target: { value: string } }) =>
                    updateField('dirtGr', Number(e.target.value)),
                }),
                React.createElement(
                  'span',
                  { className: 'text-xs text-cg-text-muted' },
                  `${form.dirtPercent}%`
                )
              ),
              // Cascara
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Cascara (gr)'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.shellGr,
                  ...numericFocusProps,
                  onChange: (e: { target: { value: string } }) =>
                    updateField('shellGr', Number(e.target.value)),
                }),
                React.createElement(
                  'span',
                  { className: 'text-xs text-cg-text-muted' },
                  `${form.boxPercent}%`
                )
              ),
              // G.D.
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'G.D. (Grano Danado) gr'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.damagedGrainGr,
                  ...numericFocusProps,
                  onChange: (e: { target: { value: string } }) =>
                    updateField('damagedGrainGr', Number(e.target.value)),
                }),
                React.createElement(
                  'span',
                  { className: 'text-xs text-cg-text-muted' },
                  `${form.boxGrainPercent}%`
                )
              ),
              // G.S.
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'G.S. (Grano Suelto) gr'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.looseGrainGr,
                  ...numericFocusProps,
                  onChange: (e: { target: { value: string } }) =>
                    updateField('looseGrainGr', Number(e.target.value)),
                }),
                React.createElement(
                  'span',
                  { className: 'text-xs text-cg-text-muted' },
                  `${form.loosePercent}%`
                )
              ),
              // G.A.
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'G.A. (Grano Apto) gr'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.aptGrainGr,
                  ...numericFocusProps,
                  onChange: (e: { target: { value: string } }) =>
                    updateField('aptGrainGr', Number(e.target.value)),
                }),
                React.createElement(
                  'span',
                  { className: 'text-xs text-cg-text-muted' },
                  `${form.aptPercent}%`
                )
              )
            ),

            // Totales de muestra (read-only)
            React.createElement(
              'div',
              { className: 'grid grid-cols-3 gap-4' },
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Peso total muestra (gr)'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.sampleTotalGr,
                  readOnly: true,
                  className: 'bg-cg-bg-secondary',
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Zaranda (mm)'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.zarandaSize,
                  ...numericFocusProps,
                  onChange: (e: { target: { value: string } }) =>
                    updateField('zarandaSize', Number(e.target.value)),
                })
              )
            ),

            // ── Seccion 4: Resultados ──
            React.createElement(
              'h3',
              {
                className:
                  'text-sm font-semibold text-cg-text-muted uppercase tracking-wide border-b border-cg-border pb-2',
              },
              'Resultados'
            ),
            React.createElement(
              'div',
              { className: 'grid grid-cols-2 gap-4' },
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Kilos totales de industria'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.industryKg,
                  readOnly: true,
                  className: 'bg-cg-bg-secondary font-semibold',
                }),
                React.createElement(
                  'span',
                  { className: 'text-xs text-cg-text-muted' },
                  `(Neto Final x (%G.S. + %G.D.) / 100)`
                )
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Kilos totales de confiteria'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.confectioneryKg,
                  readOnly: true,
                  className: 'bg-cg-bg-secondary font-semibold',
                }),
                React.createElement(
                  'span',
                  { className: 'text-xs text-cg-text-muted' },
                  `(Neto Final x %G.A. / 100)`
                )
              )
            ),

            // ── Notas ──
            React.createElement(
              'div',
              { className: 'flex flex-col gap-1' },
              React.createElement(UI.Label, null, 'Notas'),
              React.createElement(UI.Textarea, {
                value: form.notes,
                rows: 2,
                placeholder: 'Notas...',
                onChange: (e: { target: { value: string } }) =>
                  updateField('notes', e.target.value),
              })
            )
          ),
        }),

      // ── Dialog confirmar eliminacion ──
      !!deleteTarget &&
        React.createElement(
          UI.Dialog,
          { open: !!deleteTarget, onOpenChange: () => setDeleteTarget(null) },
          React.createElement(
            UI.DialogContent,
            { size: 'sm' },
            React.createElement(
              UI.DialogHeader,
              null,
              React.createElement(UI.DialogTitle, null, 'Confirmar eliminacion')
            ),
            React.createElement(
              UI.DialogBody,
              null,
              React.createElement(
                'p',
                { className: 'text-cg-text' },
                'Vas a eliminar "',
                deleteTarget?.receptionDate,
                '". Esta accion no se puede deshacer.'
              )
            ),
            React.createElement(
              UI.DialogFooter,
              null,
              React.createElement(
                UI.Button,
                { variant: 'outline', onClick: () => setDeleteTarget(null) },
                'Cancelar'
              ),
              React.createElement(
                UI.Button,
                {
                  variant: 'destructive',
                  onClick: () => {
                    void handleDelete();
                  },
                  disabled: saving,
                },
                saving ? 'Eliminando...' : 'Eliminar'
              )
            )
          )
        )
    )
  );
}
