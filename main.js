"use strict";
const marked = import('https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js').then(module => new module.Marked());

async function request(resource, options) {
	let response = await fetch(resource, options);
	if (response.ok) return response; else throw response;
}

const path = `../${decodeURIComponent(location.hash.slice(1))}`;
const markdown = request(path, {priority: 'high'}).then(response => response.text());

let scopes = import('https://esm.sh/linguist-languages').then(languages => {
	const map = new Map();
	
	for (const lang of Object.values(languages)) {
		if (!lang.tmScope || lang.tmScope == 'none') continue;
		map.set(lang.name.toLowerCase().replaceAll(' ', '-'), lang.tmScope);
		lang.aliases?.forEach(name => map.set(name, lang.tmScope));
		
		lang.extensions?.map(name => name.slice(1)).forEach(name => {
			if (!map.has(name)) map.set(name, lang.tmScope);
		});
	}
	
	return map;
});

const highlighterUrl = 'https://esm.sh/@wooorm/starry-night/lib/index.js';
const highlighterImport = import(highlighterUrl);
let highlighterVersion = highlighterImport.then(async () =>
	(await fetch(highlighterUrl, {cache: "force-cache"})).headers.get("x-esm-path").match(/@(\d[^/]+)/)[1]);
let highlighter = highlighterImport.then(module => module.createStarryNight([]));
const hastToHtml = import('https://cdn.jsdelivr.net/npm/hast-util-to-html/+esm').then(module => module.toHtml);

window.onhashchange = () => location.reload();
const pre = document.createElement('pre');
pre.textContent = await markdown;
document.body.append(pre);

document.body.innerHTML = `<main class="markdown-body">${(await marked).parse(await markdown)}</main>`;
document.querySelectorAll('a').forEach(link => {link.target = '_blank'});

function getFlag(code) {
	return code.classList[0].replace(/^language-/, '').toLowerCase();
}

const blocks = [...document.querySelectorAll('code[class^="language-"]')];
[scopes, highlighterVersion] = await Promise.all([scopes, highlighterVersion]);
const needed = [...new Set(blocks.map(code => scopes.get(getFlag(code))).filter(Boolean))];
const grammars = (await Promise.all(needed.map(scope => 
	import(`https://cdn.jsdelivr.net/npm/@wooorm/starry-night@${highlighterVersion}/lang/${scope}.js`)
		.then(module => module.default)
		.catch(console.error)
))).filter(Boolean);

highlighter = await highlighter;
await highlighter.register(grammars);

blocks.forEach(async code => {
	const scope = highlighter.flagToScope(getFlag(code));
	if (scope) code.innerHTML = (await hastToHtml)(highlighter.highlight(code.textContent, scope));
});
