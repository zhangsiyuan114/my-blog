/* ============================================
   站点脚本
   主题切换 / 导航 / 文章渲染 / 标签过滤 / 动效
   ============================================ */

(function () {
  "use strict";

  var POSTS = (window.POSTS || []).slice().sort(function (a, b) {
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  });

  /* ---------------- 工具函数 ---------------- */

  function $(sel, scope) {
    return (scope || document).querySelector(sel);
  }

  function fmtShort(dateStr) {
    return dateStr.replace(/-/g, ".");
  }

  function fmtLong(dateStr) {
    var p = dateStr.split("-");
    return p[0] + " 年 " + parseInt(p[1], 10) + " 月 " + parseInt(p[2], 10) + " 日";
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function tagRow(tags) {
    return (
      '<div class="tag-row">' +
      tags.map(function (t) {
        return '<span class="tag">' + esc(t) + "</span>";
      }).join("") +
      "</div>"
    );
  }

  /* ---------------- 主题 ---------------- */

  var THEME_KEY = "blog-theme";

  function currentTheme() {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      /* 隐私模式下忽略 */
    }
    var btn = $("#themeToggle");
    if (btn) {
      btn.setAttribute("aria-label", theme === "dark" ? "切换到浅色模式" : "切换到深色模式");
    }
  }

  function initTheme() {
    var btn = $("#themeToggle");
    if (btn) {
      btn.addEventListener("click", function () {
        setTheme(currentTheme() === "dark" ? "light" : "dark");
      });
      setTheme(currentTheme());
    }
  }

  /* ---------------- 导航 ---------------- */

  function initNav() {
    var header = $(".site-header");
    var toggle = $("#navToggle");
    var links = $("#navLinks");

    function onScroll() {
      if (!header) return;
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (toggle && links) {
      toggle.addEventListener("click", function () {
        var open = links.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
      links.addEventListener("click", function (e) {
        if (e.target.tagName === "A") {
          links.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    }
  }

  /* ---------------- 滚动入场动画 ---------------- */

  var observer = null;

  function observeReveals() {
    var items = document.querySelectorAll(".reveal:not(.is-in)");
    if (!items.length) return;

    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(items, function (el) {
        el.classList.add("is-in");
      });
      return;
    }

    if (!observer) {
      observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
      );
    }

    Array.prototype.forEach.call(items, function (el) {
      observer.observe(el);
    });
  }

  /* ---------------- 首页：精选文章 ---------------- */

  function renderFeatured() {
    var box = $("#featuredPosts");
    if (!box) return;

    var list = POSTS.slice(0, 3);
    box.innerHTML = list
      .map(function (p, i) {
        return (
          '<a class="card reveal" style="animation-delay:' + i * 90 + 'ms" href="post.html?id=' +
          encodeURIComponent(p.id) + '">' +
          '<div class="card-meta"><span>' + fmtShort(p.date) + '</span>' +
          '<span class="dot"></span><span>' + esc(p.readTime) + "</span></div>" +
          "<h3>" + esc(p.title) + "</h3>" +
          "<p>" + esc(p.excerpt) + "</p>" +
          tagRow(p.tags) +
          "</a>"
        );
      })
      .join("");
  }

  /* ---------------- 文章列表页 ---------------- */

  function renderPostList(activeTag) {
    var box = $("#postList");
    if (!box) return;

    var list = POSTS.filter(function (p) {
      return !activeTag || activeTag === "all" || p.tags.indexOf(activeTag) !== -1;
    });

    if (!list.length) {
      box.innerHTML = '<div class="empty">这个标签下还没有文章。</div>';
      return;
    }

    box.innerHTML = list
      .map(function (p, i) {
        return (
          '<a class="post-row" style="animation-delay:' + i * 55 + 'ms" href="post.html?id=' +
          encodeURIComponent(p.id) + '">' +
          '<div class="post-row-date">' + fmtShort(p.date) + "</div>" +
          "<div>" +
          '<h2 class="post-row-title">' + esc(p.title) + "</h2>" +
          '<p class="post-row-excerpt">' + esc(p.excerpt) + "</p>" +
          tagRow(p.tags) +
          "</div></a>"
        );
      })
      .join("");
  }

  function renderFilters() {
    var bar = $("#filterBar");
    if (!bar) return;

    var counts = {};
    POSTS.forEach(function (p) {
      p.tags.forEach(function (t) {
        counts[t] = (counts[t] || 0) + 1;
      });
    });

    var tags = Object.keys(counts).sort(function (a, b) {
      return counts[b] - counts[a] || a.localeCompare(b, "zh");
    });

    var html = '<button class="chip is-on" data-tag="all">全部 · ' + POSTS.length + "</button>";
    html += tags
      .map(function (t) {
        return '<button class="chip" data-tag="' + esc(t) + '">' + esc(t) + " · " + counts[t] + "</button>";
      })
      .join("");

    bar.innerHTML = html;

    bar.addEventListener("click", function (e) {
      var btn = e.target.closest(".chip");
      if (!btn) return;
      Array.prototype.forEach.call(bar.querySelectorAll(".chip"), function (c) {
        c.classList.remove("is-on");
      });
      btn.classList.add("is-on");
      renderPostList(btn.dataset.tag);
      observeReveals();
    });
  }

  /* ---------------- 文章详情页 ---------------- */

  function renderPostDetail() {
    var holder = $("#postDetail");
    if (!holder) return;

    var id = new URLSearchParams(window.location.search).get("id");
    var post = POSTS.filter(function (p) { return p.id === id; })[0];

    if (!post) {
      holder.innerHTML =
        '<div class="page-head"><h1>找不到这篇文章</h1>' +
        '<p>链接可能写错了，或者这篇内容已经被移除。</p></div>' +
        '<div class="prose"><p><a href="blog.html">← 回到文章列表</a></p></div>';
      return;
    }

    document.title = post.title + " — 张思源的博客";

    var idx = POSTS.indexOf(post);
    var prev = POSTS[idx + 1];
    var next = POSTS[idx - 1];

    var navHtml = '<div class="post-footer">';
    navHtml += prev
      ? '<a class="back-link" href="post.html?id=' + encodeURIComponent(prev.id) + '">← ' + esc(prev.title) + "</a>"
      : "<span></span>";
    navHtml += next
      ? '<a class="back-link" href="post.html?id=' + encodeURIComponent(next.id) + '">' + esc(next.title) + " →</a>"
      : "<span></span>";
    navHtml += "</div>";

    holder.innerHTML =
      '<article>' +
        '<header class="post-header measure">' +
          '<a class="back-link" href="blog.html">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>' +
            "全部文章" +
          "</a>" +
          "<h1>" + esc(post.title) + "</h1>" +
          '<div class="card-meta">' +
            "<span>" + fmtLong(post.date) + "</span>" +
            '<span class="dot"></span><span>' + esc(post.readTime) + "</span>" +
            '<span class="dot"></span><span>' + post.tags.map(esc).join(" / ") + "</span>" +
          "</div>" +
        "</header>" +
        '<div class="prose measure">' + post.content + "</div>" +
        '<div class="measure">' + navHtml + "</div>" +
      "</article>";
  }

  /* ---------------- 当前页高亮 ---------------- */

  function markActiveNav() {
    var file = window.location.pathname.split("/").pop() || "index.html";
    Array.prototype.forEach.call(document.querySelectorAll(".nav-links a"), function (a) {
      var href = a.getAttribute("href");
      if (href === file) a.classList.add("is-active");
    });
  }

  /* ---------------- 页脚年份 ---------------- */

  function initYear() {
    var el = $("#year");
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ---------------- 启动 ---------------- */

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initNav();
    markActiveNav();
    initYear();

    var page = document.body.dataset.page;

    if (page === "home") renderFeatured();
    if (page === "blog") {
      renderFilters();
      renderPostList("all");
    }
    if (page === "post") renderPostDetail();

    observeReveals();
    // 详情页正文高度变化，稍后再扫一次
    window.setTimeout(observeReveals, 120);
  });
})();
