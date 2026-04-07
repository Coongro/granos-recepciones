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
  harvest: string;
  pricePerTon: number;
  netWithoutCleaningKg: number;
  precleaningKg: number;
  netKg: number;
  shrinkageKg: number;
  dirtPercent: number;
  stickPercent: number;
  boxPercent: number;
  aptPercent: number;
  loosePercent: number;
  humidityPercent: number;
  boxGrainPercent: number;
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
  shrinkageKg: number;
  finalNetKg: number;
  dirtPercent: number;
  stickPercent: number;
  boxPercent: number;
  aptPercent: number;
  loosePercent: number;
  humidityPercent: number;
  boxGrainPercent: number;
  zarandaSize: number;
  notes: string;
}

const EMPTY_FORM: FormData = {
  receiptNumber: '',
  ctgNumber: '',
  producerId: '',
  driverId: '',
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
  shrinkageKg: 0,
  finalNetKg: 0,
  dirtPercent: 0,
  stickPercent: 0,
  boxPercent: 0,
  aptPercent: 0,
  loosePercent: 0,
  humidityPercent: 0,
  boxGrainPercent: 0,
  zarandaSize: 0,
  notes: '',
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-AR');
  } catch {
    return dateStr;
  }
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
        const cmp = !isNaN(aNum) && !isNaN(bNum) ? aNum - bNum : String(aRaw ?? '').localeCompare(String(bRaw ?? ''));
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
    setForm({
      receiptNumber: item.receiptNumber ?? '',
      ctgNumber: item.ctgNumber ?? '',
      producerId: item.producerId ?? '',
      driverId: item.driverId ?? '',
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
      shrinkageKg: item.shrinkageKg ?? 0,
      finalNetKg: item.finalNetKg ?? 0,
      dirtPercent: item.dirtPercent ?? 0,
      stickPercent: item.stickPercent ?? 0,
      boxPercent: item.boxPercent ?? 0,
      aptPercent: item.aptPercent ?? 0,
      loosePercent: item.loosePercent ?? 0,
      humidityPercent: item.humidityPercent ?? 0,
      boxGrainPercent: item.boxGrainPercent ?? 0,
      zarandaSize: item.zarandaSize ?? 0,
      notes: item.notes ?? '',
    });
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    const netWithoutCleaningKg = form.grossKg - form.taraKg;
    const netKg = netWithoutCleaningKg - form.precleaningKg;
    const finalNetKg = netKg - form.shrinkageKg;
    const payload = {
      receiptNumber: form.receiptNumber,
      ctgNumber: form.ctgNumber,
      producerId: form.producerId,
      driverId: form.driverId,
      receptionDate: form.receptionDate,
      grainType: form.grainType,
      harvest: form.harvest,
      pricePerTon: form.pricePerTon,
      status: form.status,
      grossKg: form.grossKg,
      taraKg: form.taraKg,
      netWithoutCleaningKg,
      precleaningKg: form.precleaningKg,
      netKg,
      shrinkageKg: form.shrinkageKg,
      finalNetKg,
      dirtPercent: form.dirtPercent,
      stickPercent: form.stickPercent,
      boxPercent: form.boxPercent,
      aptPercent: form.aptPercent,
      loosePercent: form.loosePercent,
      humidityPercent: form.humidityPercent,
      boxGrainPercent: form.boxGrainPercent,
      zarandaSize: form.zarandaSize,
      notes: form.notes,
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
            key: 'taraKg',
            header: 'Tara Kg',
            sortable: true,
            render: (item: Receipt) => Number(item.taraKg ?? 0).toLocaleString('es-AR'),
          },
          {
            key: 'finalNetKg',
            header: 'Kg Neto Final',
            sortable: true,
            render: (item: Receipt) => Number(item.finalNetKg ?? 0).toLocaleString('es-AR'),
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
              { value: 'mani_caja_runner', label: 'Maní Caja Runner' },
              { value: 'mani_blancheado', label: 'Maní Blancheado' },
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
              const text = `Carta de Porte Nº ${item.receiptNumber ?? ''} | Fecha: ${formatDate(item.receptionDate)} | Productor: ${getContactsName(item.producerId)} | Tipo: ${item.grainType ?? ''} | Bruto: ${Number(item.grossKg ?? 0).toLocaleString('es-AR')} kg | Neto Final: ${Number(item.finalNetKg ?? 0).toLocaleString('es-AR')} kg | Estado: ${item.status ?? ''}`;
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
          title: 'Aún no hay cartas de porte',
          description: 'Registrá la primera recepción con el botón de arriba.',
          icon: React.createElement(UI.DynamicIcon, { icon: 'FileText', size: 40, className: 'text-cg-text-muted' }),
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

            // ── Sección 1: Datos generales ──
            React.createElement('h3', { className: 'text-sm font-semibold text-cg-text-muted uppercase tracking-wide border-b border-cg-border pb-2' }, 'Datos generales'),
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
                    setForm((prev: FormData) => ({ ...prev, receiptNumber: e.target.value })),
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
                    setForm((prev: FormData) => ({ ...prev, ctgNumber: e.target.value })),
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
                    onValueChange: (v: string) =>
                      setForm((prev: FormData) => ({ ...prev, producerId: v })),
                  },
                  React.createElement(UI.ComboboxChipTrigger, {
                    placeholder: 'Buscar productor...',
                    renderChip: (val: string, onRemove: () => void) => {
                      const c = contacts.find((x: Record<string, unknown>) => String(x.id) === val);
                      return React.createElement(UI.Chip, { size: 'sm', onRemove }, String(c?.name ?? val));
                    },
                  }),
                  React.createElement(
                    UI.ComboboxContent,
                    null,
                    ...contacts
                      .filter((c: Record<string, unknown>) => {
                        return true; // Combobox handles filtering internally
                      })
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
                          setForm((prev: FormData) => ({ ...prev, producerId: newId }));
                          await fetchItems();
                          toast.success('Productor creado', `Se creó "${name}"`);
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
                    onValueChange: (v: string) =>
                      setForm((prev: FormData) => ({ ...prev, driverId: v })),
                  },
                  React.createElement(UI.ComboboxChipTrigger, {
                    placeholder: 'Buscar conductor...',
                    renderChip: (val: string, onRemove: () => void) => {
                      const d = drivers.find((x: Record<string, unknown>) => String(x.id) === val);
                      return React.createElement(UI.Chip, { size: 'sm', onRemove }, String(d?.name ?? val));
                    },
                  }),
                  React.createElement(
                    UI.ComboboxContent,
                    null,
                    ...drivers
                      .map((d: Record<string, unknown>) =>
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
                          setForm((prev: FormData) => ({ ...prev, driverId: newId }));
                          await fetchItems();
                          toast.success('Conductor creado', `Se creó "${name}"`);
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
                React.createElement(UI.Label, null, 'Fecha de Recepción *'),
                React.createElement(UI.Input, {
                  type: 'date',
                  value: form.receptionDate,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => ({ ...prev, receptionDate: e.target.value })),
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
                    onValueChange: (v: string) =>
                      setForm((prev: FormData) => ({ ...prev, grainType: v })),
                  },
                  React.createElement(UI.SelectItem, { key: 'mani_caja_runner', value: 'mani_caja_runner' }, 'Maní Caja Runner'),
                  React.createElement(UI.SelectItem, { key: 'mani_blancheado', value: 'mani_blancheado' }, 'Maní Blancheado')
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
                    setForm((prev: FormData) => ({ ...prev, harvest: e.target.value })),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Precio por Tonelada'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.pricePerTon,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => ({ ...prev, pricePerTon: Number(e.target.value) })),
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
                    onValueChange: (v: string) =>
                      setForm((prev: FormData) => ({ ...prev, status: v })),
                  },
                  React.createElement(UI.SelectItem, { key: 'pending', value: 'pending' }, 'Pendiente'),
                  React.createElement(UI.SelectItem, { key: 'processed', value: 'processed' }, 'Procesada'),
                  React.createElement(UI.SelectItem, { key: 'certified', value: 'certified' }, 'Certificada')
                )
              )
            ),

            // ── Sección 2: Detalle de kilos ──
            React.createElement('h3', { className: 'text-sm font-semibold text-cg-text-muted uppercase tracking-wide border-b border-cg-border pb-2' }, 'Detalle de kilos'),
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
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => {
                      const grossKg = Number(e.target.value);
                      const netWithoutCleaningKg = grossKg - prev.taraKg;
                      const netKg = netWithoutCleaningKg - prev.precleaningKg;
                      const finalNetKg = netKg - prev.shrinkageKg;
                      return { ...prev, grossKg, netWithoutCleaningKg, netKg, finalNetKg };
                    }),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Tara Kg *'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.taraKg,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => {
                      const taraKg = Number(e.target.value);
                      const netWithoutCleaningKg = prev.grossKg - taraKg;
                      const netKg = netWithoutCleaningKg - prev.precleaningKg;
                      const finalNetKg = netKg - prev.shrinkageKg;
                      return { ...prev, taraKg, netWithoutCleaningKg, netKg, finalNetKg };
                    }),
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
                React.createElement(UI.Label, null, 'Pre-limpieza'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.precleaningKg,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => {
                      const precleaningKg = Number(e.target.value);
                      const netWithoutCleaningKg = prev.grossKg - prev.taraKg;
                      const netKg = netWithoutCleaningKg - precleaningKg;
                      const finalNetKg = netKg - prev.shrinkageKg;
                      return { ...prev, precleaningKg, netWithoutCleaningKg, netKg, finalNetKg };
                    }),
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
                React.createElement(UI.Label, null, 'Merma Kg'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.shrinkageKg,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => {
                      const shrinkageKg = Number(e.target.value);
                      const netWithoutCleaningKg = prev.grossKg - prev.taraKg;
                      const netKg = netWithoutCleaningKg - prev.precleaningKg;
                      const finalNetKg = netKg - shrinkageKg;
                      return { ...prev, shrinkageKg, netWithoutCleaningKg, netKg, finalNetKg };
                    }),
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
                  className: 'bg-cg-bg-secondary',
                })
              )
            ),

            // ── Sección 3: Calidades ──
            React.createElement('h3', { className: 'text-sm font-semibold text-cg-text-muted uppercase tracking-wide border-b border-cg-border pb-2' }, 'Calidades'),
            React.createElement(
              'div',
              { className: 'grid grid-cols-2 gap-4' },
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, '% Tierra'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.dirtPercent,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => ({ ...prev, dirtPercent: Number(e.target.value) })),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, '% Palo'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.stickPercent,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => ({ ...prev, stickPercent: Number(e.target.value) })),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, '% Caja'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.boxPercent,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => ({ ...prev, boxPercent: Number(e.target.value) })),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, '% Apto'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.aptPercent,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => ({ ...prev, aptPercent: Number(e.target.value) })),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, '% Suelto'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.loosePercent,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => ({ ...prev, loosePercent: Number(e.target.value) })),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, '% Humedad'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.humidityPercent,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => ({ ...prev, humidityPercent: Number(e.target.value) })),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Caja/Grano %'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.boxGrainPercent,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => ({ ...prev, boxGrainPercent: Number(e.target.value) })),
                })
              ),
              React.createElement(
                'div',
                { className: 'flex flex-col gap-1' },
                React.createElement(UI.Label, null, 'Zaranda (mm)'),
                React.createElement(UI.Input, {
                  type: 'number',
                  value: form.zarandaSize,
                  onChange: (e: { target: { value: string } }) =>
                    setForm((prev: FormData) => ({ ...prev, zarandaSize: Number(e.target.value) })),
                })
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
                  setForm((prev: FormData) => ({ ...prev, notes: e.target.value })),
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
