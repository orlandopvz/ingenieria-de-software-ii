import { useId } from 'react';
import { CAMPUS_MAP_VIEWBOX, CAMPUS_ZONE_SHAPES } from '../../data/campusZoneShapes.js';
export default function CampusZoneSelector({ zones = [], value = '', onChange, label = 'Zona del campus', allowMobile = true }) {
  const id = useId(); const options = zones.filter(zone => allowMobile || zone.codigo !== 'ZONA-MOVIL');
  const fixed = options.filter(zone => Object.hasOwn(CAMPUS_ZONE_SHAPES, zone.codigo));
  // La zona seleccionada se pinta al final para conservar todo su borde visible.
  fixed.sort((a, b) => Number(String(value) === String(a.id)) - Number(String(value) === String(b.id)));
  return <fieldset className="grid gap-3"><legend className="field-label">{label}</legend><p className="text-xs text-slate-600">Mapa esquemático, sin ubicación exacta de vendedores. Norte arriba.</p><svg viewBox={CAMPUS_MAP_VIEWBOX} className="w-full max-w-2xl mx-auto rounded-xl border border-slate-200 bg-slate-50" role="group" aria-labelledby={`${id}-title`}><title id={`${id}-title`}>Zonas de la Universidad de Sonora</title><text x="965" y="40" fontSize="18" fill="#002D62">N ↑</text>{fixed.map(zone => {
    const selected = String(value) === String(zone.id);
    const shape = CAMPUS_ZONE_SHAPES[zone.codigo];
    return <g key={zone.id} role="button" tabIndex={0} aria-label={zone.nombre} aria-pressed={selected} className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#002D62]" onClick={() => onChange(String(zone.id))} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onChange(String(zone.id)); } }}>
      <title>{zone.nombre}</title>
      {shape.poligonos.map(points => <polygon key={points} points={points} fill={selected ? '#F2A900' : shape.color} stroke={selected ? '#002D62' : '#FFFFFF'} strokeWidth="3" strokeLinejoin="round" />)}
      {shape.etiquetas.map(([cx, cy]) => <g key={`${cx},${cy}`} pointerEvents="none">
        <circle cx={cx} cy={cy} r="16" fill="#002D62" />
        <text x={cx} y={cy + 6} fontSize="18" fontWeight="700" textAnchor="middle" fill="#FFFFFF" pointerEvents="none">{zone.orden_visual}</text>
      </g>)}
    </g>;
  })}</svg><label className="text-sm" htmlFor={id}>Seleccionar zona en lista</label><select id={id} value={value} onChange={event => onChange(event.target.value)}><option value="">Sin selección de zona</option>{options.map(zone => <option key={zone.id} value={zone.id}>{zone.codigo === 'ZONA-MOVIL' ? 'Sin punto fijo / Venta móvil' : `${zone.orden_visual}. ${zone.nombre}`}</option>)}</select><div className="flex flex-wrap gap-2">{allowMobile && options.filter(zone => zone.codigo === 'ZONA-MOVIL').map(zone => <button type="button" key={zone.id} className={`button ${String(value) === String(zone.id) ? 'button-gold' : 'button-secondary'}`} aria-pressed={String(value) === String(zone.id)} onClick={() => onChange(String(zone.id))}>Venta móvil</button>)}<button type="button" className="text-button" onClick={() => onChange('')}>Limpiar zona</button></div></fieldset>;
}
