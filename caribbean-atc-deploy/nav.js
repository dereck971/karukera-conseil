/**
 * Caribbean ATC Pro — Global Navigation
 * Floating nav menu injected on all pages
 */
(function() {
  const pages = [
    { href: '/', label: 'Accueil', icon: '🏠' },
    { href: '/search.html', label: 'Recherche', icon: '🔍' },
    { href: '/pro.html', label: 'Pro', icon: '🎯' },
    { href: '/assistant.html', label: 'Assistant IA', icon: '🤖' },
    { href: '/explore.html', label: 'Explorer', icon: '🗺️' },
    { href: '/hurricane.html', label: 'Ouragan', icon: '🌀' },
    { href: '/pricing.html', label: 'Tarifs', icon: '💎' },
    { href: '/widget.html', label: 'Widget KCI', icon: '📊' }
  ];

  const currentPath = window.location.pathname;

  const style = document.createElement('style');
  style.textContent = `
    .catc-nav-toggle {
      position: fixed; bottom: 20px; left: 20px; z-index: 99999;
      width: 48px; height: 48px; border-radius: 50%;
      background: linear-gradient(135deg, #00c2ff, #7b61ff);
      border: none; cursor: pointer; display: flex; align-items: center;
      justify-content: center; font-size: 22px; color: #fff;
      box-shadow: 0 4px 20px rgba(0,194,255,.3);
      transition: transform .2s, box-shadow .2s;
    }
    .catc-nav-toggle:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(0,194,255,.45); }
    .catc-nav-menu {
      position: fixed; bottom: 78px; left: 20px; z-index: 99999;
      background: rgba(8,12,22,.96); border: 1px solid rgba(0,194,255,.15);
      border-radius: 14px; padding: 8px 0; min-width: 200px;
      backdrop-filter: blur(20px); display: none;
      box-shadow: 0 8px 32px rgba(0,0,0,.5);
      animation: catcSlideUp .2s ease;
    }
    .catc-nav-menu.open { display: block; }
    @keyframes catcSlideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    .catc-nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 18px; color: #a0aacc; font-size: 13px;
      font-family: 'Inter', sans-serif; text-decoration: none;
      transition: all .15s; font-weight: 500;
    }
    .catc-nav-item:hover { background: rgba(0,194,255,.06); color: #fff; }
    .catc-nav-item.active { color: #00c2ff; font-weight: 600; background: rgba(0,194,255,.08); }
    .catc-nav-item-icon { font-size: 16px; width: 24px; text-align: center; }
    .catc-nav-brand {
      padding: 10px 18px 8px; font-size: 11px; font-weight: 700;
      color: #00c2ff; letter-spacing: 1px; text-transform: uppercase;
      border-bottom: 1px solid rgba(255,255,255,.05); margin-bottom: 4px;
    }
  `;
  document.head.appendChild(style);

  const menu = document.createElement('div');
  menu.className = 'catc-nav-menu';
  menu.innerHTML = '<div class="catc-nav-brand">✈ Caribbean ATC Pro</div>' +
    pages.map(p => {
      const isActive = (currentPath === p.href) ||
        (p.href === '/' && (currentPath === '/index.html' || currentPath === '/'));
      return `<a href="${p.href}" class="catc-nav-item${isActive ? ' active' : ''}">
        <span class="catc-nav-item-icon">${p.icon}</span>${p.label}</a>`;
    }).join('');

  const btn = document.createElement('button');
  btn.className = 'catc-nav-toggle';
  btn.innerHTML = '✈';
  btn.title = 'Navigation';
  btn.onclick = () => menu.classList.toggle('open');

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && e.target !== btn) {
      menu.classList.remove('open');
    }
  });

  document.body.appendChild(menu);
  document.body.appendChild(btn);
})();
