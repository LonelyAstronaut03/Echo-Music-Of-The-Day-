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
        if (i === 1) this.openAbout();
      });
    });

    // 导航链接
    document.getElementById('nav-today').addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

    // 键盘：Escape 关闭模态
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAbout();
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

    // 查找当天数据，不够则 fallback 前后 ±3 天
    let entry = this.albumData[today];
    let isFallback = false;

    if (!entry) {
      const nearby = getNearbyDates(today, 3);
      for (const d of nearby) {
        if (this.albumData[d]) {
          entry = this.albumData[d];
          isFallback = true;
          break;
        }
      }
    }

    const container = document.getElementById('albums-container');
    const emptyState = document.getElementById('empty-state');

    if (!entry || !entry.albums || entry.albums.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    const expandedAlbumId = preserveExpanded ? this.expandedCardId : null;

    container.innerHTML = entry.albums
      .map((album, index) => this.renderAlbumCard(album, index, isFallback))
      .join('');

    if (expandedAlbumId) {
      this.expandCard(expandedAlbumId, false);
    }

    entry.albums.forEach((album) => this.bindCardEvents(album.id));

    if (isFallback) {
      const subtitle = document.getElementById('hero-subtitle');
      if (subtitle) subtitle.textContent = I18N.t('hero_subtitle_fallback');
    }

  },

  /** 更新 Hero 日期 */
  updateHero(mmdd) {
    const heroDate = document.getElementById('hero-date');
    const heroDateEn = document.getElementById('hero-date-en');
    if (heroDate) heroDate.textContent = formatDateZh(mmdd);
    if (heroDateEn) heroDateEn.textContent = formatDateEn(mmdd);
  },

  /** 渲染单张专辑卡片 HTML */
  renderAlbumCard(album, index, isFallback) {
    const langTag = getLanguageTag(album);
    const lang = I18N.current;

    // 非华语专辑始终显示原名，华语专辑中文界面显示中文名
    const isChinese = album.language === 'chinese';
    const title = (!isChinese) ? album.name : (lang === 'zh' ? (album.nameZh || album.name) : album.name);
    const artist = (!isChinese) ? album.artist : (lang === 'zh' ? (album.artistZh || album.artist) : album.artist);
    const description = I18N.getAlbumText(album, 'description') || '';

    const genreTags = album.genres
      .map((g) => `<span class="tag tag-genre">${g}</span>`)
      .join('');

    const langLabel = lang === 'zh' ? langTag.label : langTag.labelEn;
    const languageTag = `<span class="tag tag-language">${langTag.emoji} ${langLabel}</span>`;

    let linksHTML = '';
    if (album.links) {
      if (album.links.wikipedia) {
        linksHTML += `<a href="${album.links.wikipedia}" target="_blank" rel="noopener" class="btn-link" title="Wikipedia">📖 ${I18N.t('links_wikipedia')}</a>`;
      }
      if (album.links.spotify) {
        linksHTML += `<a href="${album.links.spotify}" target="_blank" rel="noopener" class="btn-link" title="Spotify">🎧 ${I18N.t('links_spotify')}</a>`;
      }
      if (album.links.douban) {
        linksHTML += `<a href="${album.links.douban}" target="_blank" rel="noopener" class="btn-link" title="豆瓣">📚 ${I18N.t('links_douban')}</a>`;
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
    if (album.coverImage) {
      coverImgHTML = `
          <img
            class="album-cover-img"
            src="${this.escapeAttr(album.coverImage)}"
            alt="${this.escapeAttr(title)}"
            loading="lazy"
            referrerpolicy="no-referrer"
            onerror="this.style.display='none';"
            onload="this.style.display='block';this.parentElement.querySelector('.album-cover-art').style.display='none';"
          >`;
    }

    return `
      <article class="album-card" id="album-${album.id}">
        <div class="album-cover-wrapper" style="background: ${coverGradient};">
          ${coverImgHTML}
          <div class="album-cover-art">
            <span class="cover-icon">${coverIcon}</span>
            <span class="cover-title">${this.escapeHtml(title)}</span>
            <span class="cover-artist">${this.escapeHtml(artist)}</span>
            <span class="cover-year">${album.year}</span>
          </div>
          <div class="album-cover-overlay"></div>
        </div>

        <div class="album-info">
          <h3 class="album-title">${this.escapeHtml(title)}</h3>
          <p class="album-artist">${this.escapeHtml(artist)}</p>
          <p class="album-year">${album.year}</p>
          <div class="album-tags">${languageTag}${genreTags}</div>
          <p class="album-description">${this.escapeHtml(description)}</p>
        </div>

        <div class="album-actions">
          <button class="btn-expand" id="btn-expand-${album.id}">
            ${I18N.t('expand_story')}
          </button>
          <div class="album-links">${linksHTML}</div>
        </div>

        <div class="album-expanded" id="expanded-${album.id}">
          <div class="album-expanded-inner" id="expanded-inner-${album.id}"></div>
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
      const found = entry.albums.find((a) => a.id === albumId);
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
