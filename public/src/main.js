console.log("MAIN JS LOADED");

document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");

  if (!app) return;

  app.innerHTML = `
    <div style="
      height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      flex-direction:column;
      background:#050505;
      color:white;
      font-family:sans-serif;
    ">
      <h1>DECIDE ENGINE LIVE</h1>
      <button onclick="alert('JS Working')"
        style="margin-top:20px;padding:10px 20px;">
        Test Button
      </button>
    </div>
  `;
});
