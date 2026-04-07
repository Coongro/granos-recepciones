/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, max-lines-per-function, complexity */
import type { CalendarEvent } from '@coongro/calendar';
import {
  useDateNavigation,
  getMonthGridDays,
  getShortDayName,
  toDateString,
  isSameDay,
} from '@coongro/calendar';
import { getHostReact, getHostUI, usePlugin, actions } from '@coongro/plugin-sdk';

const React = getHostReact();
const UI = getHostUI();
const { useState, useEffect, useMemo, useCallback } = React;

interface Delivery {
  id: string;
  title: string;
  type: string;
  scheduledDate: string;
  producerId: string | null;
  driverId: string | null;
  estimatedKg: number | null;
  notes: string | null;
  status: string;
  [key: string]: unknown;
}

interface DeliveryForm {
  title: string;
  type: string;
  scheduledDate: string;
  producerId: string;
  driverId: string;
  estimatedKg: number;
  notes: string;
  status: string;
}

const EMPTY_FORM: DeliveryForm = {
  title: '',
  type: 'incoming',
  scheduledDate: '',
  producerId: '',
  driverId: '',
  estimatedKg: 0,
  notes: '',
  status: 'pending',
};

export function CalendarView() {
  const { toast } = usePlugin();
  const nav = useDateNavigation('month');

  const [events, setEvents] = useState<Delivery[]>([]);
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Delivery | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Record<string, unknown> | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [contacts, setContacts] = useState<Record<string, unknown>[]>([]);
  const [drivers, setDrivers] = useState<Record<string, unknown>[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<DeliveryForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const getContactName = (id: string): string => {
    const found = contacts.find((c: Record<string, unknown>) => String(c.id) === id);
    return found ? String(found.name ?? id) : id;
  };

  const getDriverName = (id: string): string => {
    const found = drivers.find((d: Record<string, unknown>) => String(d.id) === id);
    return found ? String(found.name ?? id) : id;
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [result, contactsResult, driversResult, ordersResult] = await Promise.all([
          actions.execute<Delivery[]>('granos-recepciones.deliveries.list'),
          actions.execute<Record<string, unknown>[]>('contacts.list').catch(() => []),
          actions.execute<Record<string, unknown>[]>('granos-recepciones.drivers.list').catch(() => []),
          actions.execute<Record<string, unknown>[]>('granos-comercial.orders.list').catch(() => []),
        ]);
        if (!cancelled) {
          setEvents(Array.isArray(result) ? result : []);
          setContacts(Array.isArray(contactsResult) ? contactsResult : []);
          setDrivers(Array.isArray(driversResult) ? driversResult : []);
          setOrders(Array.isArray(ordersResult) ? ordersResult : []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error cargando datos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const filteredEvents = useMemo(
    () => (sourceFilter && sourceFilter !== 'orders'
      ? events.filter((e) => e.type === sourceFilter)
      : sourceFilter === 'orders' ? [] : events),
    [events, sourceFilter]
  );

  // Orders con loadDate como eventos
  const orderEvents = useMemo(() => {
    if (sourceFilter && sourceFilter !== 'orders') return [];
    const items: Array<{ id: string; title: string; date: string; source: 'order'; color: string; raw: Record<string, unknown> }> = [];
    for (const o of orders) {
      if (o.loadDate) {
        items.push({
          id: String(o.id),
          title: `Carga: ${getContactName(String(o.clientId ?? ''))}`,
          date: String(o.loadDate).slice(0, 10),
          source: 'order',
          color: '#93c5fd',
          raw: o,
        });
      }
    }
    return items;
  }, [orders, sourceFilter, contacts]);

  // Agrupar por fecha (deliveries + orders)
  const eventsByDate = useMemo(() => {
    const map: Record<string, Array<{ id: string; title: string; color: string; source: 'delivery' | 'order'; raw: unknown }>> = {};
    for (const e of filteredEvents) {
      const key = e.scheduledDate ? e.scheduledDate.slice(0, 10) : '';
      if (key) {
        if (!map[key]) map[key] = [];
        map[key].push({
          id: e.id,
          title: e.title,
          color: e.type === 'incoming' ? '#86efac' : '#fdba74',
          source: 'delivery',
          raw: e,
        });
      }
    }
    for (const o of orderEvents) {
      if (!map[o.date]) map[o.date] = [];
      map[o.date].push({
        id: o.id,
        title: o.title,
        color: o.color,
        source: 'order',
        raw: o.raw,
      });
    }
    return map;
  }, [filteredEvents, orderEvents]);

  const days = useMemo(
    () => getMonthGridDays(nav.currentDate.getFullYear(), nav.currentDate.getMonth()),
    [nav.currentDate]
  );

  const weekDayHeaders = [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const ref = new Date(2024, 0, d === 0 ? 7 : d);
    return getShortDayName(ref);
  });

  const handleEventClick = (delivery: Delivery) => {
    setSelectedEvent(delivery);
    setShowDetail(true);
  };

  const handleDayClick = useCallback((dateStr: string) => {
    setForm({ ...EMPTY_FORM, scheduledDate: dateStr });
    setCreateOpen(true);
  }, []);

  const fetchData = useCallback(() => {
    setRetryCount((c: number) => c + 1);
  }, []);

  const handleCreate = useCallback(async () => {
    if (saving || !form.title.trim()) return;
    setSaving(true);
    try {
      await actions.execute('granos-recepciones.deliveries.create', {
        data: {
          id: crypto.randomUUID(),
          title: form.title,
          type: form.type,
          scheduledDate: form.scheduledDate,
          producerId: form.producerId || null,
          driverId: form.driverId || null,
          estimatedKg: form.estimatedKg || null,
          notes: form.notes || null,
          status: form.status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
      toast.success('Creado', 'Entrega programada correctamente');
      setCreateOpen(false);
      fetchData();
    } catch {
      toast.error('Error', 'No se pudo crear la entrega');
    } finally {
      setSaving(false);
    }
  }, [saving, form, fetchData, toast]);


  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    } catch {
      return dateStr;
    }
  };

  if (error)
    return React.createElement(UI.ErrorDisplay, {
      title: 'Error',
      message: error,
      onRetry: () => setRetryCount((c: number) => c + 1),
    });
  if (loading)
    return React.createElement(
      'div',
      { className: 'min-h-screen bg-cg-bg-secondary p-6' },
      React.createElement(UI.LoadingOverlay, { variant: 'skeleton', rows: 8 })
    );

  const currentMonth = nav.currentDate.getMonth();
  const today = new Date();

  return React.createElement(
    'div',
    { className: 'min-h-screen bg-cg-bg-secondary p-6' },
    React.createElement(
      'div',
      { className: 'max-w-full flex flex-col gap-5' },

      // Header
      React.createElement(
        'div',
        { className: 'flex items-center justify-between' },
        React.createElement(
          'div',
          null,
          React.createElement(
            'h1',
            { className: 'text-2xl font-bold text-cg-text' },
            'Calendario de Entregas'
          ),
          React.createElement('p', { className: 'text-sm text-cg-text-muted mt-1' }, nav.title)
        ),
        React.createElement(
          'div',
          { className: 'flex items-center gap-2' },
          React.createElement(UI.Button, {
            variant: sourceFilter === '' ? 'default' : 'outline', size: 'sm',
            onClick: () => setSourceFilter(''),
          }, 'Todos'),
          React.createElement(UI.Button, {
            variant: sourceFilter === 'incoming' ? 'default' : 'outline', size: 'sm',
            onClick: () => setSourceFilter('incoming'),
          }, 'Llegadas'),
          React.createElement(UI.Button, {
            variant: sourceFilter === 'outgoing' ? 'default' : 'outline', size: 'sm',
            onClick: () => setSourceFilter('outgoing'),
          }, 'Despachos'),
          React.createElement(UI.Button, {
            variant: sourceFilter === 'orders' ? 'default' : 'outline', size: 'sm',
            onClick: () => setSourceFilter('orders'),
          }, 'Pedidos')
        ),
        React.createElement(
          'div',
          { className: 'flex items-center gap-2' },
          React.createElement(
            UI.Button,
            { variant: 'outline', size: 'sm', onClick: nav.goPrev },
            React.createElement(UI.DynamicIcon, { icon: 'ChevronLeft', size: 16 })
          ),
          React.createElement(
            UI.Button,
            { variant: 'outline', size: 'sm', onClick: nav.goToToday },
            nav.title
          ),
          React.createElement(
            UI.Button,
            { variant: 'outline', size: 'sm', onClick: nav.goNext },
            React.createElement(UI.DynamicIcon, { icon: 'ChevronRight', size: 16 })
          )
        )
      ),

      // Grilla del calendario
      React.createElement(
        UI.Card,
        { className: 'overflow-hidden' },

        // Header días de la semana
        React.createElement(
          'div',
          {
            style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' },
            className: 'border-b border-cg-border',
          },
          ...weekDayHeaders.map((name) =>
            React.createElement(
              'div',
              {
                key: name,
                className: 'text-center text-xs text-cg-text-muted py-2 font-medium',
              },
              name
            )
          )
        ),

        // Días del mes
        React.createElement(
          'div',
          {
            style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' },
          },
          ...days.map((day: Date, i: number) => {
            const dateStr = toDateString(day);
            const isCurrentMonth = day.getMonth() === currentMonth;
            const isToday = isSameDay(day, today);
            const dayEvents = eventsByDate[dateStr] ?? [];
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;

            return React.createElement(
              'div',
              {
                key: i,
                style: { minHeight: '100px' },
                className: [
                  'border-b border-r border-cg-border p-1 cursor-pointer transition-colors',
                  !isCurrentMonth ? 'opacity-40' : '',
                  isWeekend && isCurrentMonth ? 'bg-cg-bg-secondary' : '',
                  isToday ? 'bg-cg-accent/5' : '',
                ].filter(Boolean).join(' '),
                onClick: () => handleDayClick(dateStr),
              },

              // Número del día
              React.createElement(
                'div',
                { className: 'flex items-center justify-between mb-1' },
                React.createElement(
                  'span',
                  {
                    className: isToday
                      ? 'w-6 h-6 flex items-center justify-center rounded-full bg-cg-accent text-white text-xs font-bold'
                      : 'text-xs text-cg-text',
                  },
                  day.getDate()
                )
              ),

              // Eventos del día
              ...dayEvents.slice(0, 3).map((evt) =>
                React.createElement(
                  'div',
                  {
                    key: evt.id,
                    onClick: (e: { stopPropagation: () => void }) => {
                      e.stopPropagation();
                      if (evt.source === 'delivery') {
                        handleEventClick(evt.raw as Delivery);
                      } else {
                        setSelectedOrder(evt.raw as Record<string, unknown>);
                        setShowOrderDetail(true);
                      }
                    },
                    style: {
                      backgroundColor: evt.color,
                      borderRadius: '6px',
                    },
                    className: 'text-cg-text text-xs font-medium px-2 py-1 mb-1 truncate cursor-pointer text-center',
                  },
                  evt.title
                )
              ),
              dayEvents.length > 3 &&
                React.createElement(
                  'div',
                  { className: 'text-xs text-cg-text-muted pl-1' },
                  `+${dayEvents.length - 3} más`
                )
            );
          })
        )
      ),

      // Modal detalle
      showDetail &&
        selectedEvent &&
        React.createElement(
          UI.FormDialog,
          {
            open: showDetail,
            onOpenChange: setShowDetail,
            title: selectedEvent.title,
            size: 'sm',
            footer: React.createElement(
              UI.Button,
              { variant: 'outline', onClick: () => setShowDetail(false) },
              'Cerrar'
            ),
          },
          React.createElement(
            'div',
            { className: 'flex flex-col gap-3' },
            React.createElement(
              'div',
              { className: 'flex items-center gap-2' },
              React.createElement(UI.DynamicIcon, {
                icon: 'Calendar',
                size: 14,
                className: 'text-cg-text-muted',
              }),
              React.createElement(
                'span',
                { className: 'text-sm text-cg-text' },
                formatDate(selectedEvent.scheduledDate)
              )
            ),
            React.createElement(
              'div',
              { className: 'flex items-center gap-2' },
              React.createElement(
                UI.Badge,
                {
                  variant: selectedEvent.type === 'incoming' ? 'success' : 'warning',
                  size: 'sm',
                },
                selectedEvent.type === 'incoming' ? 'Llegada' : 'Despacho'
              ),
              React.createElement(
                UI.Badge,
                { variant: 'default', size: 'sm' },
                selectedEvent.status
              )
            ),
            selectedEvent.estimatedKg &&
              React.createElement(
                'div',
                { className: 'flex items-center gap-2' },
                React.createElement(UI.DynamicIcon, {
                  icon: 'Scale',
                  size: 14,
                  className: 'text-cg-text-muted',
                }),
                React.createElement(
                  'span',
                  { className: 'text-sm text-cg-text' },
                  `${Number(selectedEvent.estimatedKg).toLocaleString('es-AR')} kg estimados`
                )
              ),
            selectedEvent.notes &&
              React.createElement(
                'p',
                { className: 'text-sm text-cg-text-muted' },
                selectedEvent.notes
              )
          )
        ),

      // FormDialog crear entrega
      createOpen &&
        React.createElement(UI.FormDialog, {
          open: createOpen,
          onOpenChange: (open: boolean) => { if (!open) setCreateOpen(false); },
          title: 'Nueva entrega programada',
          size: 'md',
          footer: React.createElement(
            React.Fragment,
            null,
            React.createElement(
              UI.Button,
              { variant: 'outline', onClick: () => setCreateOpen(false) },
              'Cancelar'
            ),
            React.createElement(
              UI.Button,
              {
                onClick: () => { void handleCreate(); },
                disabled: saving || !form.title.trim(),
              },
              saving ? 'Guardando...' : 'Crear'
            )
          ),
          children: React.createElement(
            'div',
            { className: 'flex flex-col gap-4' },
            React.createElement(
              'div',
              { className: 'flex flex-col gap-1' },
              React.createElement(UI.Label, null, 'Título *'),
              React.createElement(UI.Input, {
                value: form.title,
                placeholder: 'Ej: Llegada camión Pérez...',
                onChange: (e: { target: { value: string } }) =>
                  setForm((prev: DeliveryForm) => ({ ...prev, title: e.target.value })),
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
                  onValueChange: (v: string) =>
                    setForm((prev: DeliveryForm) => ({ ...prev, type: v })),
                },
                React.createElement(UI.SelectItem, { key: 'incoming', value: 'incoming' }, 'Llegada'),
                React.createElement(UI.SelectItem, { key: 'outgoing', value: 'outgoing' }, 'Despacho')
              )
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
                    setForm((prev: DeliveryForm) => ({ ...prev, status: v })),
                },
                React.createElement(UI.SelectItem, { key: 'pending', value: 'pending' }, 'Pendiente'),
                React.createElement(UI.SelectItem, { key: 'completed', value: 'completed' }, 'Completada'),
                React.createElement(UI.SelectItem, { key: 'cancelled', value: 'cancelled' }, 'Cancelada')
              )
            ),
            React.createElement(
              'div',
              { className: 'flex flex-col gap-1' },
              React.createElement(UI.Label, null, 'Fecha programada *'),
              React.createElement(UI.Input, {
                type: 'date',
                value: form.scheduledDate,
                onChange: (e: { target: { value: string } }) =>
                  setForm((prev: DeliveryForm) => ({ ...prev, scheduledDate: e.target.value })),
              })
            ),
            React.createElement(
              'div',
              { className: 'flex flex-col gap-1' },
              React.createElement(UI.Label, null, 'Productor'),
              React.createElement(
                UI.Combobox,
                {
                  value: form.producerId,
                  onValueChange: (v: string) =>
                    setForm((prev: DeliveryForm) => ({ ...prev, producerId: v })),
                },
                React.createElement(UI.ComboboxChipTrigger, {
                  placeholder: 'Buscar productor...',
                  renderChip: (val: string, onRemove: () => void) => {
                    return React.createElement(UI.Chip, { size: 'sm', onRemove }, getContactName(val));
                  },
                }),
                React.createElement(
                  UI.ComboboxContent,
                  null,
                  ...contacts.map((c: Record<string, unknown>) =>
                    React.createElement(
                      UI.ComboboxItem,
                      { key: String(c.id), value: String(c.id) },
                      String(c.name ?? c.id)
                    )
                  ),
                  React.createElement(UI.ComboboxEmpty, null, 'Sin productores'),
                  React.createElement(UI.ComboboxCreate, {
                    label: 'Crear productor "{search}"',
                    onCreate: async (name: string) => {
                      const newId = crypto.randomUUID();
                      try {
                        await actions.execute('contacts.create', {
                          data: {
                            id: newId, name, type: 'producer', is_active: true,
                            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                          },
                        });
                        setForm((prev: DeliveryForm) => ({ ...prev, producerId: newId }));
                        fetchData();
                        toast.success('Productor creado', `Se creó "${name}"`);
                      } catch { toast.error('Error', 'No se pudo crear'); }
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
                    setForm((prev: DeliveryForm) => ({ ...prev, driverId: v })),
                },
                React.createElement(UI.ComboboxChipTrigger, {
                  placeholder: 'Buscar conductor...',
                  renderChip: (val: string, onRemove: () => void) => {
                    return React.createElement(UI.Chip, { size: 'sm', onRemove }, getDriverName(val));
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
                  React.createElement(UI.ComboboxEmpty, null, 'Sin conductores'),
                  React.createElement(UI.ComboboxCreate, {
                    label: 'Crear conductor "{search}"',
                    onCreate: async (name: string) => {
                      const newId = crypto.randomUUID();
                      try {
                        await actions.execute('granos-recepciones.drivers.create', {
                          data: {
                            id: newId, name, type: 'external', isActive: true,
                            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                          },
                        });
                        setForm((prev: DeliveryForm) => ({ ...prev, driverId: newId }));
                        fetchData();
                        toast.success('Conductor creado', `Se creó "${name}"`);
                      } catch { toast.error('Error', 'No se pudo crear'); }
                    },
                  })
                )
              )
            ),
            React.createElement(
              'div',
              { className: 'flex flex-col gap-1' },
              React.createElement(UI.Label, null, 'Kg estimados'),
              React.createElement(UI.Input, {
                type: 'number',
                value: form.estimatedKg,
                onChange: (e: { target: { value: string } }) =>
                  setForm((prev: DeliveryForm) => ({ ...prev, estimatedKg: Number(e.target.value) })),
              })
            ),
            React.createElement(
              'div',
              { className: 'flex flex-col gap-1' },
              React.createElement(UI.Label, null, 'Notas'),
              React.createElement(UI.Textarea, {
                value: form.notes,
                rows: 2,
                placeholder: 'Notas...',
                onChange: (e: { target: { value: string } }) =>
                  setForm((prev: DeliveryForm) => ({ ...prev, notes: e.target.value })),
              })
            )
          ),
        }),

      // Modal detalle pedido
      showOrderDetail &&
        selectedOrder &&
        React.createElement(
          UI.FormDialog,
          {
            open: showOrderDetail,
            onOpenChange: setShowOrderDetail,
            title: 'Detalle del Pedido',
            size: 'sm',
            footer: React.createElement(
              UI.Button,
              { variant: 'outline', onClick: () => setShowOrderDetail(false) },
              'Cerrar'
            ),
          },
          React.createElement(
            'div',
            { className: 'flex flex-col gap-3' },
            React.createElement(
              'div',
              { className: 'flex items-center gap-2' },
              React.createElement(UI.DynamicIcon, { icon: 'User', size: 14, className: 'text-cg-text-muted' }),
              React.createElement('span', { className: 'text-sm text-cg-text' },
                `Cliente: ${getContactName(String(selectedOrder.clientId ?? ''))}`
              )
            ),
            React.createElement(
              'div',
              { className: 'flex items-center gap-2' },
              React.createElement(UI.DynamicIcon, { icon: 'Calendar', size: 14, className: 'text-cg-text-muted' }),
              React.createElement('span', { className: 'text-sm text-cg-text' },
                `Fecha carga: ${formatDate(String(selectedOrder.loadDate ?? ''))}`
              )
            ),
            React.createElement(
              'div',
              { className: 'flex items-center gap-2' },
              React.createElement(
                UI.Badge, { variant: 'default', size: 'sm' },
                String(selectedOrder.caliber ?? '')
              ),
              React.createElement(
                UI.Badge, { variant: 'default', size: 'sm' },
                String(selectedOrder.product ?? '')
              ),
              React.createElement(
                UI.Badge,
                { variant: selectedOrder.delivered ? 'success' : 'warning', size: 'sm' },
                selectedOrder.delivered ? 'Entregado' : 'Pendiente'
              )
            ),
            selectedOrder.kg &&
              React.createElement(
                'div',
                { className: 'flex items-center gap-2' },
                React.createElement(UI.DynamicIcon, { icon: 'Scale', size: 14, className: 'text-cg-text-muted' }),
                React.createElement('span', { className: 'text-sm text-cg-text' },
                  `${Number(selectedOrder.kg).toLocaleString('es-AR')} kg`
                )
              )
          )
        )
    )
  );
}
