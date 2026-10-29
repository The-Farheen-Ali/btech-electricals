const PHONE = '918700037522';
// Contact form email delivery. With a Web3Forms access key (free, from web3forms.com, tied to the
// inbox it was created for) messages go through Web3Forms; without one they go through FormSubmit.
const WEB3FORMS_KEY = '8a0d93e2-defe-4e28-969a-efbbecd990f5';
const FORMSUBMIT_ENDPOINT = 'https://formsubmit.co/ajax/farheen.ali108@gmail.com';

const PAGE_SIZE = 20;
const DEFAULT_FILTER = { category: 'Diwali', sub: 'Lights' };
const state = { products: [], services: [], ...DEFAULT_FILTER, q: '', limit: PAGE_SIZE };
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rupee = n => '₹' + Number(n).toLocaleString('en-IN');
const waLink = msg => `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;

/* ---------- Contact chooser (call or WhatsApp) ---------- */
const modal = $('#contact-modal');
function openContact(message, context = '') {
  $('#cm-wa').href = waLink(message || 'Hello Btech Electricals, I would like to know more about your products and services.');
  $('#cm-context').textContent = context;
  modal.hidden = false;
  $('#cm-wa').focus();
}
modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('.modal-x')) modal.hidden = true; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { modal.hidden = true; closeOffer(); } });


/* ---------- Diwali offer popup: shown on every page load, including refresh ---------- */
const OFFER_DELAY_MS = 10_000;
const offer = $('#offer-modal');
let offerDone = false; // closed or used during this page view
function closeOffer() { offer.hidden = true; offerDone = true; }
document.querySelectorAll('[data-offer-wa]').forEach(a => {
  a.href = waLink('Hello Btech Electricals, I saw the Diwali Dhamaka 30% OFF offer on your website. Please share the details.');
});
offer.addEventListener('click', e => {
  if (e.target === offer || e.target.closest('.modal-x') || e.target.closest('[data-offer-wa]')) closeOffer();
});
document.addEventListener('click', e => {
  if (!e.target.closest('[data-offer-shop]')) return;
  closeOffer();
  state.category = 'Diwali'; state.sub = 'All'; state.limit = PAGE_SIZE;
  renderFilters(); renderProducts();
  $('#products').scrollIntoView();
});
// Wait while another popup is open so two never stack.
function showOfferWhenFree() {
  if (offerDone) return;
  if (!modal.hidden) return setTimeout(showOfferWhenFree, 3000);
  offer.hidden = false;
}
setTimeout(showOfferWhenFree, OFFER_DELAY_MS);

document.addEventListener('click', e => {
  const c = e.target.closest('[data-contact]');
  if (c) { e.preventDefault(); openContact(c.dataset.msg, c.dataset.ctx); return; }
  const w = e.target.closest('[data-wa]');
  if (w) { e.preventDefault(); window.open(waLink(w.dataset.wa), '_blank', 'noopener'); }
});

/* ---------- Mobile menu ---------- */
const menuBtn = $('.menu-btn'), links = $('.nav-links');
menuBtn.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
});
links.addEventListener('click', e => { if (e.target.closest('a,button')) links.classList.remove('open'); });

/* ---------- Products ---------- */
function filtered() {
  const q = state.q.trim().toLowerCase();
  return state.products.filter(p =>
    (state.category === 'All' || p.category === state.category) &&
    (state.sub === 'All' || p.sub_category === state.sub) &&
    (!q || (p.name + ' ' + p.description + ' ' + p.sub_category).toLowerCase().includes(q)));
}

function option(label, value, selected, count) {
  return `<option value="${esc(value)}"${selected ? ' selected' : ''}>${esc(label)} (${count})</option>`;
}

function renderFilters() {
  const cats = [...new Set(state.products.map(p => p.category))].sort();
  $('#cat-select').innerHTML = option('All categories', 'All', state.category === 'All', state.products.length) +
    cats.map(c => option(c, c, state.category === c, state.products.filter(p => p.category === c).length)).join('');

  const inCat = state.products.filter(p => state.category === 'All' || p.category === state.category);
  const subs = [...new Set(inCat.map(p => p.sub_category).filter(Boolean))].sort();
  $('#sub-select').innerHTML = option('All types', 'All', state.sub === 'All', inCat.length) +
    subs.map(s => option(s, s, state.sub === s, inCat.filter(p => p.sub_category === s).length)).join('');
  $('#sub-select').disabled = !subs.length;
}

function productCard(p) {
  const msg = `Hello Btech Electricals, I am interested in "${p.name}" (${rupee(p.price)}). Is it available?`;
  return `<article class="card">
    <div class="ph">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : '<span class="noimg">💡</span>'}</div>
    <div class="body">
      <span class="tag">${esc(p.sub_category || p.category)}</span>
      <h3>${esc(p.name)}</h3>
      ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ''}
      <div class="foot">
        <span class="price">${rupee(p.price)}</span>
        <button class="btn btn-wa btn-sm" data-contact data-msg="${esc(msg)}" data-ctx="${esc(p.name)}">Enquire</button>
      </div>
    </div>
  </article>`;
}

// Order by photo quality (quality: 0 = clear photo, 1 = screenshot/duplicate/blurry, 2 = no photo;
// sharpest first within a level), then take products from each sub-category in turn so the
// first page shows a variety. The final stable sort keeps weak and missing photos at the end.
function mixCategories(products) {
  products = [...products].sort((a, b) => a.quality - b.quality || b.sharpness - a.sharpness);
  const groups = new Map();
  for (const p of products) {
    const key = p.category + '|' + p.sub_category;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const lists = [...groups.values()];
  const mixed = [];
  for (let i = 0; mixed.length < products.length; i++)
    for (const l of lists) if (l[i]) mixed.push(l[i]);
  return mixed.sort((a, b) => a.quality - b.quality);
}

function renderProducts() {
  const list = filtered();
  const shown = list.slice(0, state.limit);
  $('#product-grid').innerHTML = shown.length ? shown.map(productCard).join('') :
    '<p class="empty">No products match your filters.</p>';
  $('#result-count').textContent = `Showing ${shown.length} of ${list.length} products`;
  const more = $('#view-more');
  more.hidden = shown.length >= list.length;
  more.textContent = `See more (${list.length - shown.length} more)`;
}

$('#cat-select').addEventListener('change', e => {
  state.category = e.target.value; state.sub = 'All'; state.limit = PAGE_SIZE;
  renderFilters(); renderProducts();
});
$('#sub-select').addEventListener('change', e => {
  state.sub = e.target.value; state.limit = PAGE_SIZE;
  renderFilters(); renderProducts();
});
$('#search').addEventListener('input', e => { state.q = e.target.value; state.limit = PAGE_SIZE; renderProducts(); });
$('#view-more').addEventListener('click', () => { state.limit += PAGE_SIZE; renderProducts(); });

/* ---------- Services ---------- */
function renderServices() {
  $('#service-grid').innerHTML = state.services.map(s => {
    const msg = `Hello Btech Electricals, I would like to book "${s.name}". Please share the details.`;
    return `<article class="card">
      <div class="ph">${s.image ? `<img src="${esc(s.image)}" alt="${esc(s.name)}" loading="lazy">` : `<span class="noimg">${esc(s.icon || '🔧')}</span>`}</div>
      <div class="body">
        <span class="tag">${esc(s.category)}</span>
        <h3>${esc(s.name)}</h3>
        <div class="foot">
          <span class="price">${rupee(s.visit_charge)} <small>visit charge</small></span>
          <button class="btn btn-primary btn-sm" data-contact data-msg="${esc(msg)}" data-ctx="${esc(s.name)}">Book now</button>
        </div>
      </div>
    </article>`;
  }).join('');
}

/* ---------- Brochure PDF (respects current category / sub-category / search filters) ---------- */
function toDataURL(src, size = 160) {
  return new Promise(resolve => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      const s = Math.min(1, size / Math.max(img.width, img.height));
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve({ data: c.toDataURL('image/jpeg', 0.8), w: c.width, h: c.height });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function downloadBrochure() {
  const btn = $('#brochure-btn');
  if (!window.jspdf) { alert('Brochure tool is still loading, please try again in a moment.'); return; }
  const list = filtered();
  if (!list.length) return;
  btn.disabled = true; const label = btn.textContent; btn.textContent = 'Preparing PDF…';
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const [logo, ...images] = await Promise.all([toDataURL('images/site/logo.jpg', 200), ...list.map(p => toDataURL(p.image))]);

    doc.setFillColor(20, 33, 61); doc.rect(0, 0, W, 34, 'F');
    if (logo) doc.addImage(logo.data, 'JPEG', 10, 5, 24, 24);
    doc.setTextColor(251, 191, 36); doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text('Btech Electricals', 38, 15);
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text('37A, 40 Feet Rd, near Taj Masjid, Mahavir Enclave Part 2, New Delhi 110059', 38, 21);
    doc.text('Call / WhatsApp: +91 87000 37522', 38, 26);

    const scope = [state.category === 'All' ? 'All categories' : state.category, state.sub !== 'All' && state.sub, state.q && `"${state.q}"`].filter(Boolean).join(' / ');
    doc.setTextColor(20, 33, 61); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text('Product Brochure', 10, 44);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(107, 114, 128);
    doc.text(`${scope} · ${list.length} products · ${new Date().toLocaleDateString('en-IN')}`, 10, 49);

    doc.autoTable({
      startY: 53,
      head: [['Photo', 'Product', 'Category', 'Description', 'Price']],
      body: list.map(p => ['', p.name, [p.category, p.sub_category].filter(Boolean).join(' > '), p.description, 'Rs. ' + Number(p.price).toLocaleString('en-IN')]),
      styles: { fontSize: 8.5, cellPadding: 2, valign: 'middle', minCellHeight: 22 },
      headStyles: { fillColor: [249, 115, 22], textColor: [20, 33, 61] },
      columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 40, fontStyle: 'bold' }, 2: { cellWidth: 32 }, 4: { cellWidth: 20, halign: 'right', fontStyle: 'bold' } },
      alternateRowStyles: { fillColor: [255, 248, 235] },
      didDrawCell: d => {
        if (d.section !== 'body' || d.column.index !== 0) return;
        const im = images[d.row.index]; if (!im) return;
        const box = 18, r = Math.min(box / im.w, box / im.h);
        const w = im.w * r, h = im.h * r;
        doc.addImage(im.data, 'JPEG', d.cell.x + (d.cell.width - w) / 2, d.cell.y + (d.cell.height - h) / 2, w, h);
      },
      didDrawPage: () => {
        doc.setFontSize(8); doc.setTextColor(150);
        doc.text('Prices may change. Please confirm on +91 87000 37522 before purchase.', 10, doc.internal.pageSize.getHeight() - 6);
      },
    });

    const slug = [state.category, state.sub].filter(v => v !== 'All').join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'all';
    doc.save(`btech-electricals-brochure-${slug}.pdf`);
  } finally {
    btn.disabled = false; btn.textContent = label;
  }
}
$('#brochure-btn').addEventListener('click', downloadBrochure);

/* ---------- Feedback / contact form → email ---------- */
const form = $('#contact-form');
form.addEventListener('submit', async e => {
  e.preventDefault();
  const status = $('.form-status', form);
  const fd = new FormData(form);
  if (fd.get('_honey')) return;
  const phone = String(fd.get('phone')).replace(/[\s-]/g, '');
  const checks = { phone: /^(\+?91)?[6-9]\d{9}$/.test(phone), subject: fd.get('subject').trim(), description: fd.get('description').trim() };
  let ok = true;
  for (const [k, v] of Object.entries(checks)) { form.elements[k].classList.toggle('invalid', !v); ok &&= !!v; }
  if (!ok) { status.className = 'form-status err'; status.textContent = 'Please enter a valid mobile number, a subject and a description.'; return; }

  const btn = $('button[type=submit]', form);
  btn.disabled = true; status.className = 'form-status'; status.textContent = 'Sending…';
  try {
    const kind = fd.get('type') === 'Feedback' ? 'Feedback' : 'Enquiry';
    const subject = `${kind === 'Feedback' ? '⭐ New Feedback' : '🛒 New Enquiry'}: ${checks.subject}`;
    const fields = {
      'Message type': kind === 'Feedback' ? 'FEEDBACK' : 'ENQUIRY',
      Name: fd.get('name') || '(not given)',
      'Contact number': phone,
      Subject: checks.subject,
      Description: checks.description,
    };
    const [url, payload] = WEB3FORMS_KEY
      ? ['https://api.web3forms.com/submit', { access_key: WEB3FORMS_KEY, subject, from_name: 'Btech Electricals website', ...fields }]
      : [FORMSUBMIT_ENDPOINT, { _subject: subject, _template: 'table', _captcha: 'false', ...fields }];
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || String(data.success) === 'false') throw new Error(data.message || 'Request failed');
    form.reset();
    status.className = 'form-status ok';
    status.textContent = "Thank you! Your message has been sent. We'll contact you soon.";
  } catch {
    status.className = 'form-status err';
    status.innerHTML = `Sorry, the message couldn't be sent. Please <a href="${waLink(`${checks.subject}\n\n${checks.description}`)}" target="_blank" rel="noopener">send it on WhatsApp</a> instead.`;
  } finally {
    btn.disabled = false;
  }
});

/* ---------- Boot ---------- */
$('#year').textContent = new Date().getFullYear();
Promise.all([fetch('data/products.json', { cache: 'no-cache' }).then(r => r.json()), fetch('data/services.json', { cache: 'no-cache' }).then(r => r.json())])
  .then(([products, services]) => {
    state.products = mixCategories(products); state.services = services;
    $('#stat-products').textContent = products.length + '+';
    renderFilters(); renderProducts(); renderServices();
  })
  .catch(() => { $('#product-grid').innerHTML = '<p class="empty">Could not load products. Please refresh the page.</p>'; });

/* ---------- Theme picker: palette button (top right of the menu bar) opens the theme choices ---------- */
const THEMES = [
  ['classic', 'Classic', 'linear-gradient(135deg,#fbbf24,#f97316 60%,#14213d 60%)'],
  ['diwali', 'Diwali', 'linear-gradient(135deg,#fbbf24,#e11d48 60%,#4a0d2e 60%)'],
  ['royal', 'Royal Blue', 'linear-gradient(135deg,#38bdf8,#2563eb 60%,#0f1f4b 60%)'],
  ['emerald', 'Emerald', 'linear-gradient(135deg,#fcd34d,#d97706 60%,#053b2f 60%)'],
];
{
  const current = () => document.documentElement.dataset.theme || 'classic';
  const toggle = document.createElement('button');
  toggle.className = 'theme-toggle';
  toggle.setAttribute('aria-label', 'Change colour theme');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.title = 'Change theme';
  toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A5.6 5.6 0 0 0 22 9.8C22 5.5 17.5 2 12 2z" fill="#fff" stroke="#14213d" stroke-width="1.5"/><circle cx="6.5" cy="11.5" r="1.6" fill="#f97316"/><circle cx="9.5" cy="7" r="1.6" fill="#e11d48"/><circle cx="14.5" cy="7" r="1.6" fill="#2563eb"/><circle cx="17.5" cy="11" r="1.6" fill="#059669"/></svg>';
  const picker = document.createElement('div');
  picker.className = 'theme-picker';
  picker.hidden = !new URLSearchParams(location.search).has('themes');
  const render = () => {
    picker.innerHTML = '<p>Choose a theme</p><div>' + THEMES.map(([id, label, swatch]) =>
      `<button data-theme-id="${id}" aria-pressed="${current() === id}"><i style="background:${swatch}"></i>${label}</button>`).join('') + '</div>';
  };
  toggle.addEventListener('click', () => {
    picker.hidden = !picker.hidden;
    toggle.setAttribute('aria-expanded', !picker.hidden);
  });
  picker.addEventListener('click', e => {
    const b = e.target.closest('[data-theme-id]'); if (!b) return;
    const id = b.dataset.themeId;
    if (id === 'classic') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = id;
    try { localStorage.setItem('btech-theme', id); } catch { /* not remembered next visit */ }
    render();
  });
  document.addEventListener('click', e => {
    if (!picker.hidden && !e.target.closest('.theme-picker, .theme-toggle')) { picker.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }
  });
  render();
  $('#theme-wrap').append(toggle, picker);
}
