(() => {
  try {
    const lang = localStorage.getItem("z7-lang") || localStorage.getItem("7z-course-lang") || "ar";
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  } catch (e) {}
  try {
    const theme = localStorage.getItem("z7-theme") || localStorage.getItem("7z-course-theme") || "dark";
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch (e) {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.classList.add("dark");
  }
  try {
    const a = JSON.parse(sessionStorage.getItem("z7:core-arrival:v1") || "null");
    const p = location.pathname.replace(/\/+$/, "") || "/";
    if (a && (a.path === p || a.target === p || a.to === p)) {
      if (Date.now() - (a.time || a.ts || 0) < 12000) {
        document.documentElement.setAttribute("data-z7-arriving", "");
      }
      if (a.referrer) {
        document.documentElement.dataset.z7CoreFrom = a.referrer;
      }
    }
  } catch (e) {}
})();
