/**
 * Echo-Music Of The Day — 国际化 (i18n)
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
      about_title: '关于 Echo-Music Of The Day',
      about_p1: '音乐是时间的回声。在历史的同一天，无数专辑曾悄然诞生——有些成为了时代的注脚，有些则在岁月中静静等待被重新聆听。Echo-Music Of The Day 每天为你拾起三张发行于当日的专辑，让过去的声音在今天重新响起。',
      about_p2: '我们穿梭于不同的语言与流派之间，从经典之作到沧海遗珠，每一张专辑都是一个独立的世界。三张专辑，三种声音，一段穿越时空的音乐对话。',
      about_p3: '这里不提供直接播放——我们相信，好的音乐值得你亲自去寻找。我们为你准备了专辑的创作背景、艺术家故事和音乐史上的回响，并附上流媒体链接，让你在喜爱的平台上与这些作品相遇。',
      about_disclaimer: '专辑数据由 AI 辅助整理，可能存在疏漏。如发现日期或信息错误，欢迎随时反馈。',

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
      about_title: 'About Echo-Music Of The Day',
      about_p1: 'Music is the echo of time. On this day across history, countless albums were born — some became landmarks of their era, others quietly waited in the dust for someone to listen again. Echo-Music Of The Day brings you three albums released on this date, letting the sounds of the past resonate anew.',
      about_p2: 'We wander between languages and genres, from timeless masterpieces to overlooked treasures. Three albums, three voices, one conversation across time and space.',
      about_p3: 'We don\'t stream music here — some things are worth seeking out on your own. Instead, we offer the stories behind each album: how they were made, who made them, and the ripples they left behind. Streaming links are provided so you can encounter these works on your own terms, in your own time.',
      about_disclaimer: 'Album data is AI-assisted and may contain inaccuracies. If you spot an error, we welcome your feedback.',

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
