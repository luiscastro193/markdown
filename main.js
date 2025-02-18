"use strict";
const path = decodeURIComponent(location.hash.slice(1)).trim();

if (path && !path.includes(`"`)) {
	document.title = path;
	document.body.innerHTML = `<zero-md src="../${path}"></zero-md>`;
}

window.onhashchange = () => location.reload();
