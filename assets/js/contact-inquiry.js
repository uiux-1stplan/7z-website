(() => {
  const form = document.querySelector("#contact-inquiry");
  if (!form) return;
  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(form);
    const subject = `Project enquiry — ${data.get("name")}`;
    const body = [
      `Name: ${data.get("name")}`,
      `Email: ${data.get("email")}`,
      `Focus: ${data.get("focus")}`,
      `Timing: ${data.get("timing")}`,
      "",
      String(data.get("brief") || "")
    ].join("\n");
    document.querySelector("#contact-status").textContent = "Your email app is opening with your project brief.";
    window.location.href = `mailto:creative@7z-magic.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
})();
