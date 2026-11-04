/** Study-only inks. A consumes the original engine bytes; C/D are stock +
 * discrete ink deposits, never inverted RGB or a multiply surface. */
export const PALETTES = [
  { id:'A', name:'Oscura actual', base:'#020405', ink:'#B4CABE', wash:'#346E7B', figure:'#EAF3E6', cores:'#EAF3E6', text:'#EAF3E6', veil:'#060B0D',
    verdict:'Conserva la profundidad y el silencio aprobados; el cielo y el lavado siguen demasiado cerca del negro.',
    note:'Control sin retoque. Base del escenario #020405; el emisor original deposita #060B0D como suelo efectivo. Tinta nominal #B4CABE; compensación original de 12 tintas.',
    palette:['#060B0D','#0A1114','#10191C','#183039','#244C5B','#346E7B','#4D9199','#73B7B0','#94CCBB','#A8D3BA','#D5E5CF','#EAF3E6'] },
  { id:'B', name:'Oscura con capas visibles', base:'#071116', ink:'#C4D8CB', wash:'#477F89', figure:'#E5F1DE', cores:'#F2F7EA', text:'#F2F7EA', veil:'#071116',
    verdict:'El cielo, el lavado y el cierre de bordes ya se separan; pierde algo de la caja negra del control.',
    note:'Mismas máscaras y tamaños que A. Se elevan las tintas bajas, no la opacidad de un velo uniforme.',
    palette:['#071116','#172A30','#203B43','#2C535F','#396B78','#477F89','#65A1A6','#87C1BB','#A3D4C4','#C4D8CB','#D8EBD3','#F2F7EA'] },
  { id:'C', name:'Clara cálida · papel stock', base:'#E7DDC7', ink:'#55594A', wash:'#FFF9E9', figure:'#444B3D', cores:'#242D25', text:'#242D25', veil:'#E7DDC7', light:true,
    inks:['#8B8973','#707461','#55594A'],
    verdict:'El punto se lee como tinta sobre stock y el halo abre luz, no mancha; la trama aún compite con los enlaces finos.',
    note:'Tres depósitos de tinta opaca: #8B8973 → #707461 → #55594A. El lavado reserva y aclara papel; no añade tinta oscura.' },
  { id:'D', name:'Clara fría · técnica', base:'#D9E3E8', ink:'#354D5E', wash:'#F6FCFF', figure:'#304A5B', cores:'#172E40', text:'#172E40', veil:'#D9E3E8', light:true,
    inks:['#758B98','#536D7D','#354D5E'],
    verdict:'Mayor definición y lectura técnica; la trama compite más con los enlaces y se siente menos orgánica.',
    note:'Tres depósitos de tinta opaca: #758B98 → #536D7D → #354D5E. Stock azul gris y halo blanco frío, sin inversión ni multiply.' },
];
export const rgb = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
export const luminance = color => Array.from(color,v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
export const contrast = (a,b) => (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
