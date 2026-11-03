/**
 * Scriptul care aplică tema înainte de prima randare (fără „flash” luminos în tema întunecată).
 * Marchează și aplicația desktop (Electron, apps/desktop), ca bara aplicației să lase loc
 * butoanelor ferestrei și să poată fi trasă ca o bară de titlu.
 */
export const THEME_KEY = "lexai-tema";

export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}")||"sistem";var d=t==="intunecat"||(t==="sistem"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}if(/LexAIDesktop\\//.test(navigator.userAgent))document.documentElement.dataset.desktop=/Mac/.test(navigator.platform)?"mac":"1"})()`;
