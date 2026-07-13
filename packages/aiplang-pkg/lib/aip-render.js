// @GENERATED from front/src/lib/aip-render.ts — do not edit here.
// Regenerate: see front/docs/RENDER_PARITY.md
"use strict";
// Canonical aiplang static renderer — SINGLE SOURCE for the playground
// preview AND the aiplang runtime (aiplang build). Keep this file
// framework-agnostic (pure string ops, no React) so both sides render
// byte-identical HTML. See docs/RENDER_PARITY.md and tests/parity.test.ts.
//
// parseAip(code, interactive=false): interactive=false is the CANONICAL
// output used by both the export and the runtime; interactive=true only
// adds the in-browser edit/select overlay for the playground preview.
Object.defineProperty(exports, "__esModule", { value: true });
exports.bgCss = bgCss;
exports.parseAip = parseAip;
const ICON_MAP = {
    rocket: '\u{1f680}',
    bolt: '\u26a1',
    globe: '\u{1f310}',
    shield: '\u{1f6e1}\ufe0f',
    chart: '\u{1f4ca}',
    truck: '\u{1f69a}',
    card: '\u{1f4b3}',
    bag: '\u{1f6cd}\ufe0f',
    star: '\u2b50',
    check: '\u2705',
    gear: '\u2699\ufe0f',
    fire: '\u{1f525}',
    money: '\u{1f4b0}',
    bell: '\u{1f514}',
    mail: '\u2709\ufe0f',
    user: '\u{1f464}',
    lock: '\u{1f512}',
    eye: '\u{1f441}\ufe0f',
    tag: '\u{1f3f7}\ufe0f',
    search: '\u{1f50d}',
    home: '\u{1f3e0}',
};
// Injected into the live preview (never into exported HTML) so blocks become
// clickable/selectable and post their index back to the editor.
const INTERACTIVE_SCRIPT = `<script>(function(){
  var sel = (typeof window.__aipSel==='number'?window.__aipSel:-1);
  var from = -1;
  function blocks(){return [].slice.call(document.body.children).filter(function(el){return el.tagName!=='SCRIPT';});}
  function closest(t){while(t&&t!==document.body&&!(t.getAttribute&&t.getAttribute('data-aip-idx')!==null))t=t.parentElement;return (t&&t.getAttribute&&t.getAttribute('data-aip-idx')!==null)?t:null;}
  function paint(){blocks().forEach(function(el,i){el.setAttribute('data-aip-idx',i);if(getComputedStyle(el).position==='static')el.style.position='relative';el.style.outlineOffset='-2px';el.style.outline=(i===sel?'2px solid #32f08c':'');});}
  document.addEventListener('mouseover',function(e){var el=closest(e.target);if(el){var i=+el.getAttribute('data-aip-idx');if(i!==sel)el.style.outline='2px dashed rgba(50,240,140,.55)';}},true);
  document.addEventListener('mouseout',function(e){var el=closest(e.target);if(el){var i=+el.getAttribute('data-aip-idx');if(i!==sel)el.style.outline='';}},true);
  document.addEventListener('click',function(e){var el=closest(e.target);if(el){var fld=(e.target.getAttribute&&e.target.getAttribute('data-aip-field')!==null);if(!fld)e.preventDefault();e.stopPropagation();sel=+el.getAttribute('data-aip-idx');paint();parent.postMessage({source:'aip',type:'select',idx:sel},'*');}},true);
  document.addEventListener('submit',function(e){e.preventDefault();},true);
  // Inline text editing: elements tagged data-aip-field become contenteditable.
  function initEditables(){[].slice.call(document.querySelectorAll('[data-aip-field]')).forEach(function(el){
    if(el.__aipE)return; el.__aipE=1;
    el.setAttribute('contenteditable','true'); el.style.outline='none'; el.style.cursor='text';
    el.addEventListener('focus',function(){parent.postMessage({source:'aip',type:'editstart'},'*');});
    el.addEventListener('input',function(){var b=closest(el);if(b)parent.postMessage({source:'aip',type:'edit',idx:+b.getAttribute('data-aip-idx'),field:el.getAttribute('data-aip-field'),text:el.textContent},'*');});
    el.addEventListener('blur',function(){parent.postMessage({source:'aip',type:'editend'},'*');});
    el.addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault();el.blur();}ev.stopPropagation();});
  });}
  // Drag handle per block → reorder up/down.
  function initHandles(){blocks().forEach(function(el,i){
    if(el.__aipH||el.tagName==='HR')return; el.__aipH=1;
    var h=document.createElement('div');
    h.textContent='☰'; h.title='Drag to reorder'; h.setAttribute('draggable','true'); h.setAttribute('data-aip-handle','1');
    h.style.cssText='position:absolute;top:6px;left:6px;z-index:99999;width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:rgba(13,17,23,.9);color:#32f08c;border:1px solid rgba(50,240,140,.45);font-size:12px;cursor:grab;opacity:0;transition:opacity .15s;';
    el.addEventListener('mouseenter',function(){h.style.opacity='1';});
    el.addEventListener('mouseleave',function(){h.style.opacity='0';});
    h.addEventListener('dragstart',function(e){from=i;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain','aip-row');el.style.opacity='.4';});
    h.addEventListener('dragend',function(){from=-1;el.style.opacity='';blocks().forEach(function(b){b.style.boxShadow='';});});
    el.addEventListener('dragover',function(e){if(from<0||from===i)return;e.preventDefault();el.style.boxShadow=(i>from?'inset 0 -3px 0 #32f08c':'inset 0 3px 0 #32f08c');});
    el.addEventListener('dragleave',function(){el.style.boxShadow='';});
    el.addEventListener('drop',function(e){if(from<0)return;e.preventDefault();el.style.boxShadow='';parent.postMessage({source:'aip',type:'reorder',from:from,to:i},'*');from=-1;});
    el.appendChild(h);
  });}
  window.addEventListener('message',function(e){var d=e.data||{};if(d.source==='aip-parent'&&d.type==='setsel'){sel=(typeof d.idx==='number'?d.idx:-1);paint();}});
  paint();initEditables();initHandles();
  parent.postMessage({source:'aip',type:'ready'},'*');
})();</scr` + `ipt>`;
// A bg token is either a CSS color (#hex / rgb() / name) or "grad:HEX1-HEX2".
function bgCss(tok) {
    if (tok.startsWith('grad:')) {
        const [a, b] = tok.slice(5).split('-');
        return `linear-gradient(160deg,#${a},#${b || a})`;
    }
    return tok;
}
// Force a background onto a block's root element (first style attribute).
function applyBg(blk, tok) {
    return blk.replace('style="', `style="background:${bgCss(tok)} !important;`);
}
// Perceived lightness of a hex color (for light-vs-dark surface adaptation).
function isLightColor(hex) {
    const m = hex.replace('#', '').match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!m)
        return false;
    const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6;
}
function parseAip(code, interactive = false, selIdx = -1) {
    var _a, _b, _c, _d, _e;
    const lines = code.split('\n');
    let html = '';
    let accent = '#6366f1';
    let radius = '0.75rem';
    let font = 'Inter';
    let bg = ''; // global page background (solid or grad:HEX-HEX)
    let text = ''; // base text color
    let grad = ''; // heading/title gradient (grad:HEX-HEX)
    for (const raw of lines) {
        const line = raw.trim();
        if (line.startsWith('~theme')) {
            const am = line.match(/accent=([^\s]+)/);
            if (am)
                accent = am[1];
            const rm = line.match(/radius=([^\s]+)/);
            if (rm)
                radius = rm[1];
            const fm = line.match(/font=([^\s]+)/);
            if (fm)
                font = fm[1];
            const bm = line.match(/bg=([^\s]+)/);
            if (bm)
                bg = bm[1];
            const tm = line.match(/text=([^\s]+)/);
            if (tm)
                text = tm[1];
            const gm = line.match(/grad=([^\s]+)/);
            if (gm)
                grad = gm[1];
        }
    }
    const accentRgb = hexToRgb(accent);
    const accentBg = accentRgb ? `rgba(${accentRgb},0.12)` : 'rgba(99,102,241,0.12)';
    const accentBorder = accentRgb ? `rgba(${accentRgb},0.25)` : 'rgba(99,102,241,0.25)';
    const pageBg = bg ? bgCss(bg) : '#030712';
    // Detect a light page background (solid or first stop of a gradient) so the
    // surfaces, borders and muted text can adapt instead of assuming dark.
    const bgFirst = bg.startsWith('grad:') ? `#${bg.slice(5).split('-')[0]}` : bg;
    const light = bg ? isLightColor(bgFirst) : false;
    const fg = text || (light ? '#0F172A' : '#F1F5F9');
    const themeVars = light
        ? `--fg:${fg};--muted:#475569;--muted2:#5A6B82;--surface:rgba(0, 0, 0, 0.035);--surface2:rgba(0, 0, 0, 0.05);--border:rgba(0, 0, 0, 0.09);--border2:rgba(0, 0, 0, 0.14);--nav:rgba(255, 255, 255, 0.72)`
        : `--fg:${fg};--muted:#94A3B8;--muted2:#64748B;--surface:rgba(255, 255, 255, 0.03);--surface2:rgba(255, 255, 255, 0.04);--border:rgba(255, 255, 255, 0.06);--border2:rgba(255, 255, 255, 0.08);--nav:rgba(10, 12, 18, 0.72)`;
    // Title gradient: grad:A-B → horizontal gradient; else adapts to text color.
    const titleGrad = grad.startsWith('grad:')
        ? `linear-gradient(90deg,#${grad.slice(5).split('-')[0]},#${grad.slice(5).split('-')[1] || grad.slice(5).split('-')[0]})`
        : 'linear-gradient(180deg,var(--fg) 30%,var(--muted))';
    for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith('#') || line.startsWith('%') || line.startsWith('~') || line.startsWith('model') || line.startsWith('api') || line.startsWith('socket') || line.startsWith('cron') || line.startsWith('seed'))
            continue;
        // Per-section background modifier: "... bg=#111827" or "... bg=grad:6366f1-030712"
        const bgTok = ((_a = line.match(/\bbg=(\S+)/)) === null || _a === void 0 ? void 0 : _a[1]) || '';
        const bgStart = html.length;
        if (line.startsWith('nav{')) {
            const inner = extractBraces(line, 'nav');
            const parts = inner.split('>');
            const brand = parts[0].trim();
            const links = parts.slice(1).map(p => {
                const m = p.match(/([^:]+):(.+)/);
                return m ? `<a href="${m[1].trim()}" style="color:var(--muted);text-decoration:none;font-size:.875rem;transition:color .2s;" onmouseover="this.style.color='var(--fg)'" onmouseout="this.style.color='var(--muted)'">${m[2].trim()}</a>` : '';
            }).filter(Boolean).join('');
            html += `<nav style="display:flex;align-items:center;justify-content:space-between;padding:0.875rem 2rem;background:var(--nav);backdrop-filter:blur(16px);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:50;">
        <strong data-aip-field="brand" style="font-size:1.1rem;font-weight:700;letter-spacing:-0.01em;">${brand}</strong>
        <div style="display:flex;align-items:center;gap:1.5rem;">${links}</div>
      </nav>`;
        }
        if (line.startsWith('hero{')) {
            const inner = extractBraces(line, 'hero');
            const parts = inner.split('|');
            const title = parts[0].trim();
            const rest = parts.slice(1).join('|');
            const subAndCtas = rest.split('>');
            const subtitle = ((_b = subAndCtas[0]) === null || _b === void 0 ? void 0 : _b.trim()) || '';
            const ctas = subAndCtas.slice(1).map(c => {
                const m = c.match(/([^:]+):(.+)/);
                if (!m)
                    return '';
                return `<a href="${m[1].trim()}" style="display:inline-block;padding:0.75rem 1.75rem;background:${accent};color:#fff;border-radius:${radius};font-weight:600;text-decoration:none;font-size:.95rem;transition:transform .2s,box-shadow .2s;box-shadow:0 0 20px ${accentBg};" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 24px ${accentBorder}'" onmouseout="this.style.transform='';this.style.boxShadow='0 0 20px ${accentBg}'">${m[2].trim()}</a>`;
            }).filter(Boolean).join(' ');
            const hasAnim = line.includes('animate:');
            html += `<section style="text-align:center;padding:6rem 2rem 4rem;background:transparent;position:relative;overflow:hidden;${hasAnim ? 'animation:fadeInUp .8s ease-out;' : ''}">
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,${accentBg},transparent 70%);pointer-events:none;"></div>
        <div style="position:relative;z-index:1;">
          <h1 data-aip-field="title" style="font-size:clamp(2.5rem,5vw,4rem);font-weight:800;letter-spacing:-0.03em;line-height:1.1;margin-bottom:1rem;background:${titleGrad};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">${title}</h1>
          ${subtitle ? `<p data-aip-field="sub" style="color:var(--muted);font-size:clamp(1rem,2vw,1.25rem);max-width:600px;margin:0 auto 2rem;line-height:1.6;">${subtitle}</p>` : ''}
          <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;">${ctas}</div>
        </div>
      </section>`;
        }
        if (line.startsWith('stats{')) {
            const inner = extractBraces(line, 'stats');
            const items = inner.split('|').map((s, i) => {
                const [val, label] = s.split(':').map(x => x.trim());
                return `<div style="text-align:center;padding:1.5rem;">
          <div data-aip-field="stat.${i}.val" style="font-size:2rem;font-weight:800;color:${accent};letter-spacing:-0.02em;">${val}</div>
          <div data-aip-field="stat.${i}.label" style="font-size:.875rem;color:var(--muted2);margin-top:.25rem;">${label}</div>
        </div>`;
            });
            html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1px;background:var(--surface2);border:1px solid var(--border);border-radius:${radius};margin:0 2rem;max-width:900px;${items.length > 2 ? 'margin-left:auto;margin-right:auto;' : 'margin:0 2rem;'}">${items.join('')}</div>`;
        }
        const rowMatch = line.match(/^row(\d)\{/);
        if (rowMatch) {
            const cols = parseInt(rowMatch[1]);
            const inner = extractBraces(line, `row${cols}`);
            const cards = inner.split('|').map((c, i) => {
                const parts = c.split('>').map(x => x.trim());
                const icon = ICON_MAP[parts[0]] || parts[0] || '';
                const title = parts[1] || '';
                const body = parts[2] || '';
                return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:${radius};padding:1.75rem;transition:border-color .3s,transform .3s;" onmouseover="this.style.borderColor='${accentBorder}';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border)';this.style.transform=''">
          <div style="font-size:1.75rem;margin-bottom:.75rem;">${icon}</div>
          <h3 data-aip-field="row.${i}.title" style="font-size:1rem;font-weight:600;margin-bottom:.5rem;">${title}</h3>
          <p data-aip-field="row.${i}.body" style="color:var(--muted);font-size:.875rem;line-height:1.6;">${body}</p>
        </div>`;
            });
            html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.25rem;padding:3rem 2rem;max-width:1000px;margin:0 auto;">${cards.join('')}</div>`;
        }
        if (line.startsWith('sect{')) {
            const inner = extractBraces(line, 'sect');
            const parts = inner.split('|');
            const title = parts[0].trim();
            const body = ((_c = parts[1]) === null || _c === void 0 ? void 0 : _c.trim()) || '';
            html += `<section style="padding:2rem 2rem 1rem;max-width:900px;margin:0 auto;">
        <h2 data-aip-field="title" style="font-size:1.5rem;font-weight:700;letter-spacing:-0.02em;margin-bottom:.5rem;">${title}</h2>
        ${body ? `<p data-aip-field="body" style="color:var(--muted);font-size:.95rem;">${body}</p>` : ''}
      </section>`;
        }
        if (line.startsWith('table')) {
            const colMatch = line.match(/\{([^}]+)\}/);
            if (colMatch) {
                const cols = colMatch[1].split('|').map(c => c.trim()).filter(c => !c.startsWith('edit') && !c.startsWith('delete') && !c.startsWith('empty'));
                const emptyMatch = colMatch[1].match(/empty:\s*([^|]+)/);
                const emptyMsg = emptyMatch ? emptyMatch[1].trim() : 'No data.';
                html += `<div style="max-width:900px;margin:1rem auto;padding:0 2rem;overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:.875rem;">
            <thead><tr>${cols.map(c => {
                    const label = c.split(':')[0].trim();
                    return `<th style="text-align:left;padding:.75rem 1rem;border-bottom:1px solid var(--border2);color:var(--muted);font-weight:500;">${label}</th>`;
                }).join('')}</tr></thead>
            <tbody>
              <tr><td colspan="${cols.length}" style="padding:2rem 1rem;text-align:center;color:var(--muted2);">${emptyMsg}</td></tr>
            </tbody>
          </table>
        </div>`;
            }
        }
        if (line.startsWith('form')) {
            const fieldMatch = line.match(/\{([^}]+)\}/);
            if (fieldMatch) {
                const fields = fieldMatch[1].split('|').map(f => {
                    const parts = f.trim().split(':').map(x => x.trim());
                    const label = parts[0] || 'Field';
                    const type = parts[1] || 'text';
                    const placeholder = parts[2] || '';
                    if (type === 'select') {
                        const options = placeholder.split(',').map(o => `<option value="${o.trim()}">${o.trim()}</option>`).join('');
                        return `<div style="display:flex;flex-direction:column;gap:.375rem;">
              <label style="font-size:.8rem;color:var(--muted);font-weight:500;">${label}</label>
              <select style="background:var(--surface2);border:1px solid var(--border2);border-radius:${radius};padding:.625rem .875rem;color:var(--fg);font-family:inherit;font-size:.875rem;outline:none;">${options}</select>
            </div>`;
                    }
                    return `<div style="display:flex;flex-direction:column;gap:.375rem;">
            <label style="font-size:.8rem;color:var(--muted);font-weight:500;">${label}</label>
            <input type="${type}" placeholder="${placeholder}" style="background:var(--surface2);border:1px solid var(--border2);border-radius:${radius};padding:.625rem .875rem;color:var(--fg);font-family:inherit;font-size:.875rem;outline:none;">
          </div>`;
                });
                html += `<form style="display:flex;flex-direction:column;gap:1rem;margin:1rem auto;max-width:900px;padding:0 2rem;" onsubmit="event.preventDefault()">
          ${fields.join('')}
          <button type="submit" style="background:${accent};color:#fff;border:none;padding:.625rem 1.5rem;border-radius:${radius};font-weight:600;cursor:pointer;font-size:.875rem;align-self:flex-start;transition:opacity .2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Submit</button>
        </form>`;
            }
        }
        if (line.startsWith('pricing{')) {
            const inner = extractBraces(line, 'pricing');
            const plans = inner.split('|').map((p, i) => {
                var _a;
                const parts = p.split('>').map(x => x.trim());
                const name = parts[0] || '';
                const price = parts[1] || '';
                const desc = parts[2] || '';
                const ctaMatch = (_a = parts[3]) === null || _a === void 0 ? void 0 : _a.match(/([^:]+):(.+)/);
                const cta = ctaMatch ? `<a href="${ctaMatch[1].trim()}" style="display:block;text-align:center;padding:.625rem;background:${i === 1 ? accent : 'var(--border)'};color:${i === 1 ? '#fff' : 'var(--fg)'};border-radius:${radius};font-weight:600;text-decoration:none;font-size:.875rem;margin-top:auto;transition:opacity .2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">${ctaMatch[2].trim()}</a>` : '';
                const highlight = i === 1;
                return `<div style="background:${highlight ? accentBg : 'var(--surface)'};border:1px solid ${highlight ? accentBorder : 'var(--border)'};border-radius:${radius};padding:2rem 1.5rem;display:flex;flex-direction:column;gap:1rem;${highlight ? `box-shadow:0 0 30px ${accentBg};` : ''}">
          <div>
            <h3 data-aip-field="price.${i}.name" style="font-size:1.1rem;font-weight:600;">${name}</h3>
            <div data-aip-field="price.${i}.price" style="font-size:2rem;font-weight:800;margin:.5rem 0;color:${highlight ? accent : 'var(--fg)'};">${price}</div>
            <p data-aip-field="price.${i}.desc" style="color:var(--muted);font-size:.85rem;">${desc}</p>
          </div>
          ${cta}
        </div>`;
            });
            html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1.25rem;padding:3rem 2rem;max-width:1000px;margin:0 auto;">${plans.join('')}</div>`;
        }
        if (line.startsWith('testimonial{')) {
            const inner = extractBraces(line, 'testimonial');
            const parts = inner.split('|');
            const nameRole = parts[0].trim();
            const quote = ((_d = parts[1]) === null || _d === void 0 ? void 0 : _d.trim().replace(/^"|"$/g, '')) || '';
            html += `<div style="max-width:600px;margin:2rem auto;padding:2rem;text-align:center;">
        <p style="font-size:1.15rem;font-style:italic;color:var(--fg);opacity:.9;line-height:1.7;margin-bottom:1rem;">\u201c<span data-aip-field="quote">${quote}</span>\u201d</p>
        <p data-aip-field="author" style="color:var(--muted2);font-size:.875rem;font-weight:500;">${nameRole}</p>
      </div>`;
        }
        if (line.startsWith('faq{')) {
            const inner = extractBraces(line, 'faq');
            const items = inner.split('|').map((item, i) => {
                const [q, a] = item.split('?');
                const answer = (a || '').replace(/\.$/, '').trim();
                return `<details style="border:1px solid var(--border);border-radius:${radius};padding:1rem 1.25rem;margin-bottom:.5rem;">
          <summary style="cursor:pointer;font-weight:600;color:var(--fg);list-style:none;display:flex;justify-content:space-between;align-items:center;"><span data-aip-field="faq.${i}.q">${(q || '').trim()}</span><span style="color:var(--muted2);font-size:1.2rem;">+</span></summary>
          <p data-aip-field="faq.${i}.a" style="color:var(--muted);margin-top:.75rem;font-size:.9rem;line-height:1.6;">${answer}</p>
        </details>`;
            });
            html += `<div style="max-width:700px;margin:2rem auto;padding:0 2rem;">${items.join('')}</div>`;
        }
        if (line.startsWith('gallery{')) {
            const inner = extractBraces(line, 'gallery');
            const urls = inner.split('|').map(u => u.trim());
            const imgs = urls.map(u => `<div style="aspect-ratio:4/3;background:var(--surface2);border-radius:${radius};overflow:hidden;border:1px solid var(--border);"><img src="${u}" style="width:100%;height:100%;object-fit:cover;" alt="" onerror="this.style.display='none'"></div>`);
            html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;padding:2rem;max-width:900px;margin:0 auto;">${imgs.join('')}</div>`;
        }
        if (line.startsWith('foot{')) {
            const inner = extractBraces(line, 'foot');
            const parts = inner.split('>');
            const text = parts[0].trim();
            const links = parts.slice(1).map(p => {
                const m = p.match(/([^:]+):(.+)/);
                return m ? `<a href="${m[1].trim()}" style="color:#475569;text-decoration:none;font-size:.8rem;transition:color .2s;" onmouseover="this.style.color='var(--muted)'" onmouseout="this.style.color='#475569'">${m[2].trim()}</a>` : '';
            }).filter(Boolean).join('  ');
            html += `<footer style="text-align:center;padding:2.5rem 2rem;border-top:1px solid var(--border);color:#475569;font-size:.85rem;margin-top:3rem;">
        <p data-aip-field="text">${text}</p>
        ${links ? `<div style="margin-top:.75rem;display:flex;gap:1.25rem;justify-content:center;">${links}</div>` : ''}
      </footer>`;
        }
        if (line.startsWith('btn{')) {
            const inner = extractBraces(line, 'btn');
            html += `<div style="padding:0.5rem 2rem;"><button data-aip-field="text" style="background:${accent};color:#fff;border:none;padding:.625rem 1.5rem;border-radius:${radius};font-weight:600;cursor:pointer;font-size:.875rem;transition:opacity .2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">${inner}</button></div>`;
        }
        if (line.startsWith('card{')) {
            const inner = extractBraces(line, 'card');
            const parts = inner.split('|');
            const title = parts[0].trim();
            const body = ((_e = parts[1]) === null || _e === void 0 ? void 0 : _e.trim()) || '';
            html += `<div style="background:var(--surface);border:1px solid var(--border);border-radius:${radius};padding:1.5rem;margin:1rem 2rem;">
        <h3 data-aip-field="title" style="font-size:1rem;font-weight:600;margin-bottom:.5rem;">${title}</h3>
        ${body ? `<p data-aip-field="body" style="color:var(--muted);font-size:.875rem;">${body}</p>` : ''}
      </div>`;
        }
        if (line.startsWith('badge{')) {
            const inner = extractBraces(line, 'badge');
            html += `<span data-aip-field="text" style="display:inline-block;background:${accentBg};color:${accent};border:1px solid ${accentBorder};border-radius:9999px;padding:.25rem .75rem;font-size:.75rem;font-weight:600;margin:.5rem 2rem;">${inner}</span>`;
        }
        if (line.startsWith('divider{')) {
            html += `<hr style="border:none;border-top:1px solid var(--border);margin:2rem;">`;
        }
        if (line.startsWith('spacer{')) {
            const inner = extractBraces(line, 'spacer');
            html += `<div style="height:${inner};"></div>`;
        }
        // Apply the per-section background to the block just emitted.
        if (bgTok && html.length > bgStart) {
            html = html.slice(0, bgStart) + applyBg(html.slice(bgStart), bgTok);
        }
    }
    const fontUrl = `https://fonts.googleapis.com/css2?family=${font}:wght@400;500;600;700;800&display=swap`;
    const head = interactive ? `<script>window.__aipSel=${selIdx};</scr` + `ipt>` : '';
    const foot = interactive ? INTERACTIVE_SCRIPT : '';
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="${fontUrl}" rel="stylesheet">${head}
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{${themeVars};font-family:'${font}',sans-serif;background:${pageBg};color:var(--fg);min-height:100vh;-webkit-font-smoothing:antialiased}
a{color:inherit}
::selection{background:${accent};color:#fff}
@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#333;border-radius:3px}
</style></head><body>${html}${foot}</body></html>`;
}
function extractBraces(line, prefix) {
    const start = line.indexOf('{');
    let depth = 0;
    let end = -1;
    for (let i = start; i < line.length; i++) {
        if (line[i] === '{')
            depth++;
        else if (line[i] === '}') {
            depth--;
            if (depth === 0) {
                end = i;
                break;
            }
        }
    }
    if (start === -1 || end === -1)
        return '';
    return line.substring(start + 1, end);
}
function hexToRgb(hex) {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    return m ? `${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)}` : null;
}
