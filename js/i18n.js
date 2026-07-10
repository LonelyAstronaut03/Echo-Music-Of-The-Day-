/**
 * Everyday Music — 国际化 (i18n)
 * 支持中文 (zh) 和 English (en)
 */

const I18N = {
  current: 'zh',

  translations: {
    zh: {
      // Navigation
      nav_today: '今天',
      nav_calendar: '浏览日期',
      nav_about: '关于',

      // Hero
      hero_subtitle: '历史上的今天，这些专辑诞生了',
      hero_subtitle_fallback: '（附近日期）',

      // Album Card
      expand_story: '展开故事 ▼',
      collapse_story: '收起 ▲',
      links_wikipedia: 'Wikipedia',
      links_spotify: 'Spotify',
      links_douban: '豆瓣',
      section_intro: '专辑简介',
      section_stories: '背后的故事',
      section_impact: '历史影响',

      // States
      loading: '正在寻找今天的专辑...',
      error_title: '数据加载失败',
      error_desc: '请检查网络连接或稍后再试',
      error_retry: '重新加载',
      empty_title: '附近没有找到专辑',
      empty_desc: '明天再来看看吧，也许会有惊喜',

      // Date Navigation
      pick_date: '选择日期',
      pick_date_title: '选择日期',
      back_today: '回到今天',

      // About
      about_title: '关于 Everyday Music',
      about_p1: 'Everyday Music 是一个每日音乐发现平台。我们每天推荐三张发行于当日的优质专辑，带你穿越音乐史的长河，发现那些诞生在历史上的今天的伟大作品。',
      about_p2: '三张专辑中，每天保证恰好一张来自华语乐坛，其余的精选自世界各地的优秀作品。我们注重搭配——既有你耳熟能详的经典，也有值得被更多人听到的冷门佳作。',
      about_p3: '我们不提供音乐播放功能，以规避版权问题。但我们为每张专辑提供详尽的介绍、艺术家趣事和音乐史背景，并附上流媒体链接，方便你去自己喜欢的平台收听。',
      about_disclaimer: '专辑数据由 AI 辅助整理，可能存在疏漏。如发现日期或信息错误，欢迎反馈纠错。',

      // Footer
      footer_sub: '每天三张专辑，发现音乐史上的今天',

      // Calendar
      cal_weekdays: ['日', '一', '二', '三', '四', '五', '六'],

      // Fallback note
      fallback_note: '（今天附近没有足够数据，展示的是近期发行的专辑）',
    },

    en: {
      // Navigation
      nav_today: 'Today',
      nav_calendar: 'Browse',
      nav_about: 'About',

      // Hero
      hero_subtitle: 'On this day in music history',
      hero_subtitle_fallback: '(nearby dates)',

      // Album Card
      expand_story: 'Read more ▼',
      collapse_story: 'Collapse ▲',
      links_wikipedia: 'Wikipedia',
      links_spotify: 'Spotify',
      links_douban: 'Douban',
      section_intro: 'About the Album',
      section_stories: 'The Story Behind',
      section_impact: 'Historical Impact',

      // States
      loading: 'Finding today\'s albums...',
      error_title: 'Failed to Load Data',
      error_desc: 'Please check your connection and try again',
      error_retry: 'Reload',
      empty_title: 'No Albums Found Nearby',
      empty_desc: 'Come back tomorrow for more discoveries',

      // Date Navigation
      pick_date: 'Pick a Date',
      pick_date_title: 'Pick a Date',
      back_today: 'Back to Today',

      // About
      about_title: 'About Everyday Music',
      about_p1: 'Everyday Music is a daily music discovery platform. We recommend three outstanding albums released on this date in history, taking you on a journey through music\'s past to discover great works born on this day.',
      about_p2: 'Among the three albums each day, exactly one is from the Chinese-language music scene, with the rest selected from outstanding works worldwide. We curate a thoughtful mix — from beloved classics to hidden gems that deserve a wider audience.',
      about_p3: 'We don\'t provide music playback to avoid copyright issues. Instead, we offer detailed introductions, artist stories, and musical context for each album, along with streaming links for you to listen on your preferred platform.',
      about_disclaimer: 'Album data is AI-assisted and may contain inaccuracies. If you find date or content errors, we welcome your feedback and corrections.',

      // Footer
      footer_sub: 'Three albums a day — discover music history, one date at a time',

      // Calendar
      cal_weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

      // Fallback note
      fallback_note: '(Not enough albums for today — showing nearby releases)',
    },
  },

  /** 获取翻译文本 */
  t(key) {
    const dict = this.translations[this.current];
    return dict[key] || key;
  },

  /** 切换语言 */
  toggle() {
    this.current = this.current === 'zh' ? 'en' : 'zh';
    this.save();
    this.applyToDOM();
  },

  /** 设置语言 */
  setLanguage(lang) {
    if (lang === 'zh' || lang === 'en') {
      this.current = lang;
      this.save();
      this.applyToDOM();
    }
  },

  /** 保存到 localStorage */
  save() {
    try {
      localStorage.setItem('everyday-music-lang', this.current);
    } catch {}
  },

  /** 从 localStorage 加载 */
  load() {
    try {
      const saved = localStorage.getItem('everyday-music-lang');
      if (saved === 'zh' || saved === 'en') {
        this.current = saved;
      }
    } catch {}
  },

  /** 将翻译应用到 DOM */
  applyToDOM() {
    // data-i18n 属性
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const translated = this.t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = translated;
      } else {
        el.textContent = translated;
      }
    });

    // 更新语言切换按钮样式
    const zhSpan = document.querySelector('.lang-zh');
    const enSpan = document.querySelector('.lang-en');
    const toggles = document.querySelectorAll('.lang-toggle');
    if (this.current === 'en') {
      toggles.forEach(t => t.classList.add('en-active'));
    } else {
      toggles.forEach(t => t.classList.remove('en-active'));
    }

    // 更新 HTML lang 属性
    document.documentElement.lang = this.current === 'zh' ? 'zh-CN' : 'en';

    // 触发自定义事件，让 app.js 重新渲染内容
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: this.current } }));
  },

  /** 根据当前语言获取专辑文本字段 */
  getAlbumText(album, fieldBase) {
    const suffix = this.current === 'zh' ? 'Zh' : 'En';
    const field = fieldBase + suffix;
    // 字段名映射：如 fieldBase='description' → 'descriptionZh' 或 'descriptionEn'
    return album[field] || album[fieldBase + 'Zh'] || '';
  },
};

// 初始化：加载保存的语言偏好
I18N.load();
