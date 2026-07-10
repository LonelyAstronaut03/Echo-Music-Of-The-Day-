/**
 * Everyday Music — 主应用逻辑
 * 仅显示当天日期的专辑，不提供日期切换
 */

const App = {
  /** 当前显示的日期 (MM-DD) */
  currentDate: null,

  /** 加载的专辑数据库 */
  albumData: {},

  /** 当前展开的专辑卡片 ID */
  expandedCardId: null,

  /** 初始化 */
  async init() {
    this.currentDate = getTodayMMDD();
    this.bindEvents();
    I18N.applyToDOM();

    await this.loadData();
    this.renderToday();
  },

  /** 绑定全局事件 */
  bindEvents() {
    // 语言切换
    document.getElementById('lang-toggle').addEventListener('click', () => I18N.toggle());
    document.getElementById('mobile-lang-toggle').addEventListener('click', () => I18N.toggle());

    // 语言变更时重新渲染
    document.addEventListener('languageChanged', () => {
      this.renderToday(true);
    });

    // 移动端菜单
    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
      document.getElementById('mobile-menu').classList.toggle('open');
    });
    document.querySelectorAll('.mobile-nav-link').forEach((link, i) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('mobile-menu').classList.remove('open');
        if (i === 1) this.openBirthday();
        if (i === 2) this.openAbout();
      });
    });

    // 导航链接
    document.getElementById('nav-today').addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.getElementById('nav-birthday').addEventListener('click', (e) => {
      e.preventDefault();
      this.openBirthday();
    });
    document.getElementById('nav-about').addEventListener('click', (e) => {
      e.preventDefault();
      this.openAbout();
    });

    // 重试按钮
    document.getElementById('btn-retry').addEventListener('click', () => {
      this.loadData().then(() => this.renderToday());
    });

    // 关于模态
    document.getElementById('about-close').addEventListener('click', () => this.closeAbout());
    document.getElementById('about-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeAbout();
    });

    // 生日模态
    document.getElementById('birthday-close').addEventListener('click', () => this.closeBirthday());
    document.getElementById('birthday-modal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeBirthday();
    });
    document.getElementById('btn-birthday-submit').addEventListener('click', () => this.handleBirthdaySubmit());

    // 键盘：Escape 关闭模态
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this.closeAbout(); this.closeBirthday(); }
    });
  },

  /** 加载专辑数据 */
  async loadData() {
    const loading = document.getElementById('loading');
    const errorState = document.getElementById('error-state');
    const albumsSection = document.getElementById('albums-section');

    loading.style.display = 'flex';
    errorState.classList.add('hidden');
    albumsSection.style.display = 'none';

    try {
      const response = await fetch('data/albums.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.albumData = await response.json();
      delete this.albumData['_meta'];
      loading.style.display = 'none';
      albumsSection.style.display = '';
    } catch (err) {
      console.error('Failed to load album data:', err);
      loading.style.display = 'none';
      errorState.classList.remove('hidden');
      throw err;
    }
  },

  /** 渲染今天的专辑 */
  renderToday(preserveExpanded = false) {
    const today = getTodayMMDD();
    this.currentDate = today;
    this.updateHero(today);

    // 仅严格匹配当天日期，不 fallback
    const entry = this.albumData[today];

    const container = document.getElementById('albums-container');
    const emptyState = document.getElementById('empty-state');

    if (!entry || !entry.items || entry.items.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    const items = entry.items.slice(0, 3); // 最多 3 个

    // 根据数量设置布局
    container.className = 'albums-container items-' + items.length;

    emptyState.classList.add('hidden');

    const expandedId = preserveExpanded ? this.expandedCardId : null;

    container.innerHTML = items
      .map((item, index) => this.renderItemCard(item, index))
      .join('');

    if (expandedId) this.expandCard(expandedId, false);

    items.forEach((item) => this.bindCardEvents(item.id));

    // JSONP 方式从 iTunes 加载封面
    this.loadCoversFromiTunes(items);

  },

  /** JSONP 从 iTunes 搜索专辑封面（避免 CORS 限制） */
  loadCoversFromiTunes(albums) {
    albums.forEach((album) => {
      const isChinese = item.language === 'chinese';
      const searchArtist = isChinese ? (item.artistZh || item.artist) : item.artist;
      const searchName = isChinese ? (item.nameZh || item.name) : item.name;

      const cb = '_itunes' + Math.random().toString(36).slice(2);
      const query = encodeURIComponent(`${searchArtist} ${searchName}`);
      const url = `https://itunes.apple.com/search?term=${query}&entity=album&limit=1&callback=${cb}`;

      window[cb] = (data) => {
        delete window[cb];
        try {
          if (data.results && data.results.length > 0) {
            const art = data.results[0].artworkUrl100;
            if (art) {
              const img = document.querySelector(`.album-cover-img[data-album-id="${item.id}"]`);
              if (img) {
                img.src = art.replace(/\/\d+x\d+bb/, '/600x600bb');
              }
            }
          }
        } catch {}
      };

      const script = document.createElement('script');
      script.src = url;
      script.onerror = () => { delete window[cb]; };
      document.head.appendChild(script);
    });
  },

  /** 更新 Hero 日期 */
  updateHero(mmdd) {
    const heroDate = document.getElementById('hero-date');
    const heroDateEn = document.getElementById('hero-date-en');
    if (heroDate) heroDate.textContent = formatDateZh(mmdd);
    if (heroDateEn) heroDateEn.textContent = formatDateEn(mmdd);
  },

  /** 渲染单张专辑卡片 HTML */
  renderItemCard(item, index) {
    const langTag = getLanguageTag(item);
    const lang = I18N.current;

    // 非华语专辑始终显示原名，华语专辑中文界面显示中文名
    const isChinese = item.language === 'chinese';
    const title = (!isChinese) ? item.name : (lang === 'zh' ? (item.nameZh || item.name) : item.name);
    const artist = (!isChinese) ? item.artist : (lang === 'zh' ? (item.artistZh || item.artist) : item.artist);
    const description = I18N.getAlbumText(item, 'description') || '';
    const genreTags = item.genres
      .map((g) => `<span class="tag tag-genre">${g}</span>`)
      .join('');

    const langLabel = lang === 'zh' ? langTag.label : langTag.labelEn;
    const languageTag = `<span class="tag tag-language">${langTag.emoji} ${langLabel}</span>`;

    let linksHTML = '';
    if (item.links) {
      if (item.links.wikipedia) {
        linksHTML += `<a href="${item.links.wikipedia}" target="_blank" rel="noopener" class="btn-link" title="Wikipedia">📖 ${I18N.t('links_wikipedia')}</a>`;
      }
      if (item.links.spotify) {
        linksHTML += `<a href="${item.links.spotify}" target="_blank" rel="noopener" class="btn-link" title="Spotify">🎧 ${I18N.t('links_spotify')}</a>`;
      }
      if (item.links.douban) {
        linksHTML += `<a href="${item.links.douban}" target="_blank" rel="noopener" class="btn-link" title="豆瓣">📚 ${I18N.t('links_douban')}</a>`;
      }
    }

    const coverIcons = ['🎵', '💿', '🎸', '🎹', '🎷', '🎺'];
    const coverIcon = coverIcons[index % coverIcons.length];

    const coverGradients = [
      'linear-gradient(135deg, #2c3e50, #4a6741)',
      'linear-gradient(135deg, #3d2b3f, #6b4c6e)',
      'linear-gradient(135deg, #1a3a4a, #2d6a7e)',
      'linear-gradient(135deg, #4a2c2c, #7a4a3a)',
      'linear-gradient(135deg, #2d3a4a, #4a6a8a)',
      'linear-gradient(135deg, #3a2c4a, #6a4a7a)',
    ];
    const coverGradient = coverGradients[index % coverGradients.length];

    // 封面图片：有 URL 就尝试加载，失败则保留 CSS 封面
    let coverImgHTML = '';
    if (item.coverImage) {
      coverImgHTML = `
          <img
            class="album-cover-img"
            src="${this.escapeAttr(item.coverImage)}"
            alt="${this.escapeAttr(title)}"
            loading="lazy"
            referrerpolicy="no-referrer"
            onerror="this.style.display='none';"
            onload="this.style.display='block';this.parentElement.querySelector('.album-cover-art').style.display='none';"
          >`;
    }

    return `
      <article class="album-card" id="album-${item.id}">
        <div class="album-cover-wrapper" style="background: ${coverGradient};">
          ${coverImgHTML}
          <div class="album-cover-art">
            <span class="cover-icon">${coverIcon}</span>
            <span class="cover-title">${this.escapeHtml(title)}</span>
            <span class="cover-artist">${this.escapeHtml(artist)}</span>
            <span class="cover-year">${item.year}</span>
          </div>
          <div class="album-cover-overlay"></div>
        </div>

        <div class="album-info">
          <h3 class="album-title">${this.escapeHtml(title)}</h3>
          <p class="album-artist">${this.escapeHtml(artist)}</p>
          <p class="album-year">${item.year}</p>
          <div class="album-tags">${languageTag}${genreTags}</div>
          <p class="album-description">${this.escapeHtml(description)}</p>
        </div>

        <div class="album-actions">
          <button class="btn-expand" id="btn-expand-${item.id}">
            ${I18N.t('expand_story')}
          </button>
          <div class="album-links">${linksHTML}</div>
        </div>

        <div class="album-expanded" id="expanded-${item.id}">
          <div class="album-expanded-inner" id="expanded-inner-${item.id}"></div>
        </div>
      </article>
    `;
  },

  /** 绑定卡片交互 */
  bindCardEvents(albumId) {
    const expandBtn = document.getElementById(`btn-expand-${albumId}`);
    if (expandBtn) {
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleExpand(albumId);
      });
    }
    const card = document.getElementById(`album-${albumId}`);
    if (card) {
      card.addEventListener('click', (e) => {
        if (e.target.closest('a') || e.target.closest('button')) return;
        this.toggleExpand(albumId);
      });
    }
  },

  toggleExpand(albumId) {
    if (this.expandedCardId === albumId) {
      this.collapseCard(albumId);
    } else {
      this.expandCard(albumId);
    }
  },

  expandCard(albumId, animate = true) {
    const expanded = document.getElementById(`expanded-${albumId}`);
    const btn = document.getElementById(`btn-expand-${albumId}`);
    const inner = document.getElementById(`expanded-inner-${albumId}`);
    if (!expanded || !btn) return;

    let album = null;
    for (const entry of Object.values(this.albumData)) {
      const found = entry.items.find((i) => i.id === albumId);
      if (found) { album = found; break; }
    }
    if (!album) return;

    if (inner && inner.children.length === 0) {
      inner.innerHTML = this.renderExpandedContent(album);
    }

    if (this.expandedCardId && this.expandedCardId !== albumId) {
      this.collapseCard(this.expandedCardId, false);
    }

    // 隐藏缩略简介，避免与展开内容重复
    const card = document.getElementById(`album-${albumId}`);
    const shortDesc = card ? card.querySelector('.album-description') : null;
    if (shortDesc) shortDesc.style.display = 'none';

    const duration = animate ? 400 : 0;
    expanded.style.transition = duration > 0 ? `height ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)` : 'none';
    expanded.style.height = `${expanded.scrollHeight}px`;
    btn.textContent = I18N.t('collapse_story');
    this.expandedCardId = albumId;

    const onTransitionEnd = () => {
      expanded.style.height = 'auto';
      expanded.style.transition = 'none';
      expanded.removeEventListener('transitionend', onTransitionEnd);
    };
    if (duration > 0) {
      expanded.addEventListener('transitionend', onTransitionEnd);
    } else {
      expanded.style.height = 'auto';
    }

    if (animate && card) {
      setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150);
    }
  },

  collapseCard(albumId, animate = true) {
    const expanded = document.getElementById(`expanded-${albumId}`);
    const btn = document.getElementById(`btn-expand-${albumId}`);
    if (!expanded) return;

    // 恢复缩略简介
    const card = document.getElementById(`album-${albumId}`);
    const shortDesc = card ? card.querySelector('.album-description') : null;
    if (shortDesc) shortDesc.style.display = '';

    const duration = animate ? 300 : 0;
    expanded.style.height = `${expanded.scrollHeight}px`;
    expanded.offsetHeight;
    expanded.style.transition = duration > 0 ? `height ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)` : 'none';
    expanded.style.height = '0';

    if (btn) btn.textContent = I18N.t('expand_story');
    if (this.expandedCardId === albumId) this.expandedCardId = null;

    if (duration > 0) {
      const onTransitionEnd = () => {
        expanded.style.transition = 'none';
        expanded.removeEventListener('transitionend', onTransitionEnd);
      };
      expanded.addEventListener('transitionend', onTransitionEnd);
    }
  },

  renderExpandedContent(album) {
    const lang = I18N.current;
    const sections = [];

    const desc = I18N.getAlbumText(album, 'description');
    if (desc) {
      sections.push(`<div class="expanded-section"><h4>${I18N.t('section_intro')}</h4><p>${this.escapeHtml(desc)}</p></div>`);
    }
    const stories = I18N.getAlbumText(album, 'stories');
    if (stories) {
      sections.push(`<div class="expanded-section"><h4>${I18N.t('section_stories')}</h4><p>${this.escapeHtml(stories)}</p></div>`);
    }
    const impact = I18N.getAlbumText(album, 'historicalImpact');
    if (impact && impact.trim()) {
      sections.push(`<div class="expanded-section"><h4>${I18N.t('section_impact')}</h4><p>${this.escapeHtml(impact)}</p></div>`);
    }

    return sections.join('');
  },

  openAbout() {
    const modal = document.getElementById('about-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  },

  closeAbout() {
    const modal = document.getElementById('about-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  },

  // ---- 生日功能 ----
  openBirthday() {
    const modal = document.getElementById('birthday-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // 初始化选择器
    const monthSel = document.getElementById('bday-month');
    const daySel = document.getElementById('bday-day');
    const lang = I18N.current;

    if (monthSel.children.length === 0) {
      const monthsZh = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
      const monthsEn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      for (let m = 1; m <= 12; m++) {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = lang === 'zh' ? monthsZh[m-1] : monthsEn[m-1];
        monthSel.appendChild(opt);
      }
      this.updateDaySelect(1);
    }

    // 重置状态
    document.getElementById('birthday-result').classList.add('hidden');
    document.getElementById('birthday-loading').classList.add('hidden');
    document.getElementById('btn-birthday-submit').style.display = '';

    monthSel.onchange = () => this.updateDaySelect(parseInt(monthSel.value));
  },

  updateDaySelect(month) {
    const daySel = document.getElementById('bday-day');
    daySel.innerHTML = '';
    const days = new Date(2024, month, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d + (I18N.current === 'zh' ? '日' : '');
      daySel.appendChild(opt);
    }
  },

  closeBirthday() {
    const modal = document.getElementById('birthday-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  },

  async handleBirthdaySubmit() {
    const month = parseInt(document.getElementById('bday-month').value);
    const day = parseInt(document.getElementById('bday-day').value);
    const mmdd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const submitBtn = document.getElementById('btn-birthday-submit');
    const loading = document.getElementById('birthday-loading');
    const result = document.getElementById('birthday-result');

    submitBtn.style.display = 'none';
    loading.classList.remove('hidden');
    result.classList.add('hidden');

    const entry = this.albumData[mmdd];
    const albums = entry ? entry.items.slice(0, 3) : [];

    // 生成生日祝福
    const lang = I18N.current;
    const dateStr = lang === 'zh'
      ? `${month}月${day}日`
      : `${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month]} ${day}`;

    let message;
    if (albums.length === 0) {
      message = lang === 'zh'
        ? `${dateStr}，是你的生日。这一天暂无收录的音乐作品，但每一天都独一无二——就像你一样。生日快乐！🎂`
        : `${dateStr} is your birthday. No works on record for this day — but every day is unique, just like you. Happy birthday! 🎂`;
    } else if (entry && (entry.birthdayZh || entry.birthdayEn)) {
      message = (lang === 'zh' ? entry.birthdayZh : entry.birthdayEn) || entry.birthdayZh || '';
    } else {
      const names = albums.map(a => lang === 'zh' ? (a.nameZh || a.name) : a.name);
      const artists = albums.map(a => lang === 'zh' ? (a.artistZh || a.artist) : a.artist);
      if (lang === 'zh') {
        message = `${dateStr}，是你的生日。\n\n在音乐的长河里，这一天同样闪耀——${artists[0]}的《${names.join('》《')}》，就在历史上的今天诞生。愿这些穿越时光的旋律，陪伴你的新一岁。生日快乐！🎂`;
      } else {
        message = `${dateStr} is your birthday.\n\nOn this day in music history, "${names.join('", "')}" by ${artists[0]} was born. May these melodies, echoing across time, accompany your new year. Happy birthday! 🎂`;
      }
    }

    // 显示结果
    loading.classList.add('hidden');
    result.classList.remove('hidden');

    document.getElementById('birthday-message').innerHTML = message.replace(/\n/g, '<br>');

    const albumsDiv = document.getElementById('birthday-albums');
    if (albums.length > 0) {
      albumsDiv.innerHTML = albums.map(a => {
        const title = lang === 'zh' ? (a.nameZh || a.name) : a.name;
        const artist = lang === 'zh' ? (a.artistZh || a.artist) : a.artist;
        return `<div class="birthday-album-item">
          <span class="bai-icon">💿</span>
          <span class="bai-name">${this.escapeHtml(title)} — <span class="bai-artist">${this.escapeHtml(artist)}</span> (${a.year})</span>
        </div>`;
      }).join('');
    } else {
      albumsDiv.innerHTML = '';
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
