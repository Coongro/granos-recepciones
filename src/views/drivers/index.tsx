/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, max-lines-per-function, complexity */
import { getHostReact, getHostUI, usePlugin, actions } from '@coongro/plugin-sdk';

const React = getHostReact();
const UI = getHostUI();
const { useState, useEffect, useCallback, useRef, useMemo } = React;

interface Driver {
  id: string;
  name: string;
  type: string;
  companyName: string;
  truckPlate: string;
  trailerPlate: string;
  phone: string;
  isActive: boolean;
  documentNumber: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

interface FormData {
  name: string;
  documentNumber: string;
  phone: string;
  type: string;
  companyName: string;
  truckPlate: string;
  trailerPlate: string;
  isActive: boolean;
}

const EMPTY_FORM: FormData = {
  name: '',
  documentNumber: '',
  phone: '',
  type: 'external',
  companyName: '',
  truckPlate: '',
  trailerPlate: '',
  isActive: true,
};

const _formatDate = (dateStr: string): string => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-AR');
  } catch {
    return dateStr;
  }
};

export function DriversView() {
  const { toast } = usePlugin();

  // --- Estado principal ---
  const [items, setItems] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Busqueda, filtros, sort, paginacion ---
  const [localSearch, setLocalSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');

  const [sortKey, setSortKey] = useState<string | null>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // --- Modal ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
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
      const [result] = await Promise.all([
        actions.execute<Driver[]>('granos-recepciones.drivers.list'),
      ]);
      if (mountedRef.current) {
        setItems(Array.isArray(result) ? result : []);

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

  // --- Filtrado y sort local ---
  const filtered = useMemo(() => {
    let result = [...items];
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase();
      result = result.filter(
        (item) =>
          String(item.name ?? '')
            .toLowerCase()
            .includes(q) ||
          String(item.companyName ?? '')
            .toLowerCase()
            .includes(q) ||
          String(item.truckPlate ?? '')
            .toLowerCase()
            .includes(q) ||
          String(item.trailerPlate ?? '')
            .toLowerCase()
            .includes(q) ||
          String(item.phone ?? '')
            .toLowerCase()
            .includes(q)
      );
    }
    if (filterType) result = result.filter((item) => String(item.type) === filterType);

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
  }, [items, localSearch, filterType, sortKey, sortDir]);

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

  const openEdit = useCallback((item: Driver) => {
    setEditing(item);
    setForm({
      name: item.name ?? '',
      documentNumber: item.documentNumber ?? '',
      phone: item.phone ?? '',
      type: item.type ?? '',
      companyName: item.companyName ?? '',
      truckPlate: item.truckPlate ?? '',
      trailerPlate: item.trailerPlate ?? '',
      isActive: item.isActive ?? false,
    });
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    const payload = {
      name: form.name,
      documentNumber: form.documentNumber,
      phone: form.phone,
      type: form.type,
      companyName: form.companyName,
      truckPlate: form.truckPlate,
      trailerPlate: form.trailerPlate,
      isActive: form.isActive,
    };
    setSaving(true);
    try {
      if (editing) {
        await actions.execute('granos-recepciones.drivers.update', {
          id: editing.id,
          data: { ...payload, updatedAt: new Date().toISOString() },
        });
        toast.success('Guardado', 'Conductor actualizado correctamente');
      } else {
        await actions.execute('granos-recepciones.drivers.create', {
          data: {
            id: crypto.randomUUID(),
            ...payload,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
        toast.success('Creado', 'Conductor registrado correctamente');
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
      await actions.execute('granos-recepciones.drivers.delete', { id: deleteTarget.id });
      toast.success('Eliminado', 'Conductor eliminado correctamente');
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
            'Conductores'
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
            key: 'name',
            header: 'Nombre',
            sortable: true,
            render: (item: Driver) =>
              React.createElement('span', { className: 'font-medium' }, item.name ?? '—'),
          },
          {
            key: 'type',
            header: 'Tipo',
            sortable: true,
            render: (item: Driver) =>
              item.type
                ? React.createElement(UI.Badge, { variant: 'default', size: 'sm' }, item.type)
                : '—',
          },
          {
            key: 'companyName',
            header: 'Empresa',
            sortable: true,
            className: 'max-w-[200px] truncate',
          },
          {
            key: 'truckPlate',
            header: 'Patente Camión',
            sortable: true,
            className: 'max-w-[200px] truncate',
          },
          {
            key: 'trailerPlate',
            header: 'Patente Acoplado',
            sortable: true,
            className: 'max-w-[200px] truncate',
          },
          { key: 'phone', header: 'Teléfono', sortable: true, className: 'max-w-[200px] truncate' },
          {
            key: 'isActive',
            header: 'Activo',
            sortable: true,
            render: (item: Driver) => (item.isActive ? 'Sí' : 'No'),
          },
        ],

        // Busqueda
        searchPlaceholder: 'Buscar...',
        searchValue: localSearch,
        onSearchChange: handleSearchChange,

        // Filtros (ButtonGroup sections)
        filterSections: [
          {
            key: 'type',
            label: 'Tipo',
            value: filterType,
            onChange: (v: string) => {
              setFilterType(v);
              setPage(1);
            },
            options: [
              { value: 'own', label: 'Propio' },
              { value: 'external', label: 'Externo' },
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
            onClick: (item: Driver) => {
              const text = `Conductor: ${item.name ?? ''} | Tipo: ${item.type ?? ''} | Empresa: ${item.companyName ?? ''} | Patente: ${item.truckPlate ?? ''} | Tel: ${item.phone ?? ''}`;
              void navigator.clipboard.writeText(text);
              toast.success('Copiado', 'Datos copiados al portapapeles');
            },
          },
          { label: 'Editar', onClick: openEdit },
          {
            label: 'Eliminar',
            onClick: (item: Driver) => setDeleteTarget(item),
            variant: 'destructive' as const,
          },
        ],

        // Empty state
        emptyState: {
          title: 'Aún no hay conductores registrados',
          description: 'Agregá un conductor con el botón de arriba.',
          icon: React.createElement(UI.DynamicIcon, { icon: 'Users', size: 40, className: 'text-cg-text-muted' }),
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
          title: editing ? 'Editar conductor' : 'Nuevo conductor',
          size: 'md',
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
            { className: 'flex flex-col gap-4' },
            React.createElement(
              'div',
              { className: 'flex flex-col gap-1' },
              React.createElement(UI.Label, null, 'Nombre *'),
              React.createElement(UI.Input, {
                value: form.name,
                placeholder: 'Nombre...',
                onChange: (e: { target: { value: string } }) =>
                  setForm((prev: FormData) => ({ ...prev, name: e.target.value })),
              })
            ),
            React.createElement(
              'div',
              { className: 'flex flex-col gap-1' },
              React.createElement(UI.Label, null, 'Nro. Documento'),
              React.createElement(UI.Input, {
                value: form.documentNumber,
                placeholder: 'Nro. Documento...',
                onChange: (e: { target: { value: string } }) =>
                  setForm((prev: FormData) => ({ ...prev, documentNumber: e.target.value })),
              })
            ),
            React.createElement(
              'div',
              { className: 'flex flex-col gap-1' },
              React.createElement(UI.Label, null, 'Teléfono'),
              React.createElement(UI.Input, {
                value: form.phone,
                placeholder: 'Teléfono...',
                onChange: (e: { target: { value: string } }) =>
                  setForm((prev: FormData) => ({ ...prev, phone: e.target.value })),
              })
            ),
            React.createElement(
              'div',
              { className: 'flex flex-col gap-1' },
              React.createElement(UI.Label, null, 'Tipo *'),
              React.createElement(
                UI.Select,
                {
                  value: form.type,
                  onValueChange: (v: string) => setForm((prev: FormData) => ({ ...prev, type: v })),
                },
                React.createElement(UI.SelectItem, { key: 'own', value: 'own' }, 'Propio'),
                React.createElement(
                  UI.SelectItem,
                  { key: 'external', value: 'external' },
                  'Externo'
                )
              )
            ),
            React.createElement(
              'div',
              { className: 'flex flex-col gap-1' },
              React.createElement(UI.Label, null, 'Empresa'),
              React.createElement(UI.Input, {
                value: form.companyName,
                placeholder: 'Empresa...',
                onChange: (e: { target: { value: string } }) =>
                  setForm((prev: FormData) => ({ ...prev, companyName: e.target.value })),
              })
            ),
            React.createElement(
              'div',
              { className: 'flex flex-col gap-1' },
              React.createElement(UI.Label, null, 'Patente Camión'),
              React.createElement(UI.Input, {
                value: form.truckPlate,
                placeholder: 'Patente Camión...',
                onChange: (e: { target: { value: string } }) =>
                  setForm((prev: FormData) => ({ ...prev, truckPlate: e.target.value })),
              })
            ),
            React.createElement(
              'div',
              { className: 'flex flex-col gap-1' },
              React.createElement(UI.Label, null, 'Patente Acoplado'),
              React.createElement(UI.Input, {
                value: form.trailerPlate,
                placeholder: 'Patente Acoplado...',
                onChange: (e: { target: { value: string } }) =>
                  setForm((prev: FormData) => ({ ...prev, trailerPlate: e.target.value })),
              })
            ),
            React.createElement(
              'div',
              { className: 'flex items-center gap-2' },
              React.createElement(UI.Checkbox, {
                checked: form.isActive,
                onCheckedChange: (checked: boolean) =>
                  setForm((prev: FormData) => ({ ...prev, isActive: checked })),
              }),
              React.createElement(UI.Label, { className: 'cursor-pointer' }, 'Activo')
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
                deleteTarget?.name,
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
