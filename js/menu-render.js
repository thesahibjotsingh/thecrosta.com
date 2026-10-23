// Renders the menu panels (#tab-<id>) from window.MENU_DATA (see menu-data.js).
// Output markup is exactly what the cart wiring in menu-wiring.js expects, so
// changing a price or adding an item never needs a code change.
(function () {
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function badges(list) {
    if (!list || !list.length) return '';
    return '<div class="badge-row">' + list.map(function (b) {
      return '<span class="badge badge-' + esc(b.type) + '">' + esc(b.label) + '</span>';
    }).join('') + '</div>';
  }

  function priceHtml(it) {
    var text = '₹' + it.prices.join(' / ');
    var note = it.priceNote ? '<span class="price-note">' + esc(it.priceNote) + '</span>' : '';
    return '<div class="menu-item-price">' + text + note + '</div>';
  }

  function imgHtml(it) {
    if (!it.img) return '';
    return '<img class="menu-item-img" src="' + esc(it.img) + '" alt="' + esc(it.alt || it.name) + '" loading="lazy">';
  }

  function itemHtml(it) {
    var attrs = '';
    var middle = '';
    if (it.variant) {
      var v = it.variant;
      attrs = ' data-variant-item data-base-name="' + esc(v.baseName) + '" data-price="' + v.cartPrice +
              '" data-default-variant="' + esc(v.default) + '"';
      middle = '<div class="variant-pills-row">' + v.options.map(function (o) {
        return '<button class="variant-pill' + (o === v.default ? ' active' : '') +
               '" data-variant="' + esc(o) + '">' + esc(o) + '</button>';
      }).join('') + '</div>';
    } else {
      if (it.flavorOptions) attrs = ' data-flavor-options="' + esc(it.flavorOptions) + '"';
      middle = (it.desc ? '<div class="menu-item-desc">' + esc(it.desc) + '</div>' : '') + badges(it.badges);
    }
    return '<div class="menu-item"' + attrs + '>' +
      '<div class="menu-item-left"><div class="menu-item-name">' + esc(it.name) + '</div>' + middle + '</div>' +
      priceHtml(it) + imgHtml(it) + '</div>';
  }

  function categoryHtml(c) {
    return '<div class="menu-category"' + (c.id ? ' id="' + esc(c.id) + '"' : '') + '>' +
      '<div class="menu-category-title">' + esc(c.title) + '</div>' +
      '<div class="menu-grid">' + c.items.map(itemHtml).join('') + '</div></div>';
  }

  // markup for one panel — also used by tools/prerender.js to bake the menu into index.html
  window.menuPanelHtml = function (panel) { return panel.categories.map(categoryHtml).join(''); };

  window.renderMenu = function (data) {
    data.panels.forEach(function (p) {
      var el = document.getElementById('tab-' + p.id);
      if (el) el.innerHTML = window.menuPanelHtml(p);
    });
  };

  if (window.MENU_DATA) window.renderMenu(window.MENU_DATA);
})();
