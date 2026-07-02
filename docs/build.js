// Processes docs/README.template.md into README.md at the project root.
//
// Supported tags:
//   <TOC />                                  — auto-generates table of contents from ## headings
//   <Examples />                             — full examples table from examples/src/examples.json
//   <Example id="example-shapes" />          — single example card (screenshot + link + description)
//   <ExamplesTable ids="example-a,example-b" /> — small table of specific examples
//   <Snippet source="./file.ts" />           — entire file as a ts code block
//   <Snippet source="./file.ts" select="name" /> — named region between SNIPPET_START/END markers

import fs from 'node:fs';
import path from 'node:path';

const docsDir = path.dirname(new URL(import.meta.url).pathname);
const projectRoot = path.join(docsDir, '..');

// Change this once the examples site is deployed.
const EXAMPLES_BASE_URL = 'https://box3d.js.dev/examples';

const templatePath = path.join(docsDir, 'README.template.md');
const outPath = path.join(projectRoot, 'README.md');
const examplesJsonPath = path.join(projectRoot, 'examples/src/examples.json');

let text = fs.readFileSync(templatePath, 'utf-8');
const examplesData = JSON.parse(fs.readFileSync(examplesJsonPath, 'utf-8'));

/* <TOC /> */
text = text.replace(/<TOC\s*\/>/g, () => {
    const lines = [];
    for (const [, hashes, title] of text.matchAll(/^(#{2,2})\s+(.+)$/gm)) {
        if (title.trim() === 'Table of Contents') continue;
        const anchor = title.trim()
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
        const indent = '  '.repeat(hashes.length - 2);
        lines.push(`${indent}- [${title.trim()}](#${anchor})`);
    }
    return lines.join('\n');
});

/* <Examples /> */
text = text.replace(/<Examples\s*\/>/g, () => {
    const keys = Object.keys(examplesData);
    const cols = 3;
    let html = '<table>\n';
    for (let i = 0; i < keys.length; i += cols) {
        html += '  <tr>\n';
        for (let j = 0; j < cols && i + j < keys.length; j++) {
            const key = keys[i + j];
            const { title = key } = examplesData[key];
            html += `    <td align="center">\n`;
            html += `      <a href="${EXAMPLES_BASE_URL}#${key}">\n`;
            html += `        <img src="./examples/public/screenshots/${key}.png" width="180" height="120" style="object-fit:cover;"/><br/>\n`;
            html += `        ${title}\n`;
            html += `      </a>\n`;
            html += `    </td>\n`;
        }
        html += '  </tr>\n';
    }
    html += '</table>\n';
    return html;
});

/* <Example id="example-shapes" /> */
text = text.replace(/<Example\s+id=["'](.+?)["']\s*\/>/g, (_, id) => {
    const example = examplesData[id];
    if (!example) { console.warn(`Unknown example id: ${id}`); return _; }
    const { title = id, description = '' } = example;
    return `
<div align="center">
  <a href="${EXAMPLES_BASE_URL}#${id}">
    <img src="./examples/public/screenshots/${id}.png" width="360" height="240" style="object-fit:cover;"/><br/>
    <strong>${title}</strong>
  </a>
  <p>${description}</p>
</div>
`;
});

/* <ExamplesTable ids="example-a,example-b" /> */
text = text.replace(/<ExamplesTable\s+ids=["'](.+?)["']\s*\/>/g, (_, idsStr) => {
    const ids = idsStr.split(',').map(s => s.trim()).filter(id => examplesData[id]);
    const cells = ids.map(id => {
        const { title = id } = examplesData[id];
        return `  <td align="center">
    <a href="${EXAMPLES_BASE_URL}#${id}">
      <img src="./examples/public/screenshots/${id}.png" width="200" height="133" style="object-fit:cover;"/><br/>
      <strong>${title}</strong>
    </a>
  </td>`;
    });
    return `<table>\n  <tr>\n${cells.join('\n')}\n  </tr>\n</table>`;
});

/* <Snippet source="./file.ts" select="name" /> */
text = text.replace(/<Snippet\s+source=["'](.+?)["']\s+select=["'](.+?)["']\s*\/>/g, (full, src, group) => {
    const abs = path.join(docsDir, src);
    if (!fs.existsSync(abs)) { console.warn(`Snippet not found: ${abs}`); return full; }
    const raw = fs.readFileSync(abs, 'utf-8');
    const re = new RegExp(
        String.raw`^([ \t]*)\/\*[ \t]*SNIPPET_START:[ \t]*${group}[ \t]*\*\/[\r\n]+([\s\S]*?)[ \t]*^\1\/\*[ \t]*SNIPPET_END:[ \t]*${group}[ \t]*\*\/`,
        'gm',
    );
    const matches = [...raw.matchAll(re)];
    if (!matches.length) { console.warn(`Snippet group '${group}' not found in ${src}`); return full; }
    let code = matches.map(m => {
        const indent = m[1] || '';
        let chunk = m[2];
        if (indent) chunk = chunk.replace(new RegExp(`^${indent}`, 'gm'), '');
        chunk = chunk.replace(/^.*\/\*[ \t]*SNIPPET_START:[^*]*\*\/.*\n?/gm, '');
        chunk = chunk.replace(/^.*\/\*[ \t]*SNIPPET_END:[^*]*\*\/.*\n?/gm, '');
        return chunk;
    }).join('');
    code = code.replace(/^\s*\n|\n\s*$/g, '');
    return `\`\`\`ts\n${code}\n\`\`\``;
});

/* <Snippet source="./file.ts" /> */
text = text.replace(/<Snippet\s+source=["'](.+?)["']\s*\/>/g, (full, src) => {
    const abs = path.join(docsDir, src);
    if (!fs.existsSync(abs)) { console.warn(`Snippet not found: ${abs}`); return full; }
    let code = fs.readFileSync(abs, 'utf-8');
    code = code.replace(/^[ \t]*\/\*[ \t]*SNIPPET_START:[^*]*\*\/.*\n?/gm, '');
    code = code.replace(/^[ \t]*\/\*[ \t]*SNIPPET_END:[^*]*\*\/.*\n?/gm, '');
    code = code.replace(/^\s*\n|\n\s*$/g, '');
    return `\`\`\`ts\n${code}\n\`\`\``;
});

fs.writeFileSync(outPath, text, 'utf-8');
console.log(`Written: ${outPath}`);
