import { createServer } from "node:http";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const contentRoot = join(root, "src", "content");
const uploadRoot = join(root, "public", "uploads");
const port = 4323;
const types = ["jobs", "tenders", "announcements", "gallery", "service-charter", "department-requirements", "intakes"];
const dateFields = ["postedDate", "closingDate", "startDate", "endDate", "date", "openingDate"];
const requiredDateFields = {
  jobs: ["postedDate", "closingDate"],
  tenders: ["postedDate", "closingDate"],
  announcements: ["startDate", "endDate"],
  gallery: ["date"],
};
const tenderTypes = ["Tender", "Prequalification", "Addendum", "Notice"];
const allowedUploadExtensions = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg", ".avif", ".tif", ".tiff", ".mp3", ".wav", ".m4a", ".ogg", ".aac", ".mp4", ".webm", ".mov", ".m4v"]);
const uploadMimeTypes = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".aac": "audio/aac",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
};
const fields = {
  jobs: ["title", "department", "description", "attachment", "postedDate", "closingDate", "howToApply"],
  tenders: ["title", "reference", "type", "description", "attachments", "postedDate", "closingDate", "openingDate"],
  announcements: ["title", "image", "description", "link", "startDate", "endDate", "homepageBanner"],
  gallery: ["title", "department", "date", "photos", "videos"],
  "service-charter": ["englishAudio", "swahiliAudio", "signLanguageLink", "pdf"],
  "department-requirements": ["title", "department", "intake", "description", "document"],
  intakes: ["title", "applicationUrl", "openingDate", "closingDate", "description"],
};

function send(response, status, body, type = "application/json") {
  response.writeHead(status, { "content-type": `${type}; charset=utf-8` });
  response.end(type === "application/json" ? JSON.stringify(body) : body);
}

function yamlValue(value) {
  if (Array.isArray(value) || (value && typeof value === "object")) return JSON.stringify(value);
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return JSON.stringify(value ?? "");
}

function markdown(data, body = "") {
  const frontmatter = Object.entries(data)
    .map(([key, value]) => `${key}: ${yamlValue(value)}`)
    .join("\n");
  return `---\n${frontmatter}\n---\n${body}\n`;
}

function parseValue(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
    try { return JSON.parse(trimmed); } catch { return trimmed; }
  }

  return trimmed.replace(/^["']|["']$/g, "");
}

function normaliseDate(value) {
  const match = String(value ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : value;
}

function normaliseTenderType(value) {
  if (typeof value !== "string") return value;
  return tenderTypes.find((type) => type.toLowerCase() === value.trim().toLowerCase()) ?? value;
}

function parseMarkdown(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: source };
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator > 0) data[line.slice(0, separator)] = parseValue(line.slice(separator + 1));
  }
  return { data, body: match[2].trim() };
}

async function listEntries(type) {
  const directory = join(contentRoot, type);
  if (!existsSync(directory)) return [];
  const names = (await readdir(directory)).filter((name) => extname(name) === ".md");
  return Promise.all(names.map(async (name) => {
    const parsed = parseMarkdown(await readFile(join(directory, name), "utf8"));
    for (const field of dateFields) {
      if (field in parsed.data) parsed.data[field] = normaliseDate(parsed.data[field]);
    }
    return { slug: name.slice(0, -3), ...parsed };
  }));
}

const adminPage = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>MTVC Content Manager</title><style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#403f37;background:#f9fafb;line-height:1.5}
*{box-sizing:border-box}body{margin:0;background:#f9fafb}header{background:#005485;color:#fff;border-bottom:5px solid #eb232b;box-shadow:0 5px 18px rgb(10 5 0 / 12%)}
.header-inner{max-width:1180px;margin:auto;padding:1.05rem 1.5rem;display:flex;justify-content:space-between;align-items:center;gap:1rem}.brand{display:flex;align-items:center;gap:.8rem}.crest{display:grid;place-items:center;width:2.5rem;height:2.5rem;border-radius:.55rem;background:#ffee6d;color:#0a0500;font-weight:900}.brand strong{display:block;font-size:1rem;line-height:1.1}.brand small{display:block;margin-top:.18rem;color:#dcecf4}
main{max-width:1180px;margin:2.25rem auto;padding:0 1.5rem}.intro{max-width:720px;margin-bottom:1.5rem}.intro h1{margin:0 0 .35rem;color:#0a0500;font-size:clamp(1.7rem,3vw,2.4rem)}.intro p{margin:0;color:#6b6a62}
.toolbar{display:flex;align-items:end;gap:.8rem;flex-wrap:wrap;margin-bottom:1.25rem}.toolbar-group{min-width:230px;flex:1}.toolbar label{margin:0 0 .35rem}
.layout{display:grid;grid-template-columns:285px minmax(0,1fr);gap:1.25rem;align-items:start}aside,form{background:#fff;border:1px solid #edeff2;border-radius:12px;box-shadow:0 8px 26px rgb(10 5 0 / 5%)}aside{overflow:hidden;padding:.6rem}
.list-heading{padding:.75rem .8rem .55rem;color:#005485;font-size:.75rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.empty{padding:.8rem;color:#777;font-size:.9rem}
button,select,input,textarea{font:inherit}button{border:0;border-radius:6px;padding:.7rem 1rem;background:#005485;color:#fff;font-weight:700;cursor:pointer;transition:background .15s,transform .15s}button:hover{background:#003e63;transform:translateY(-1px)}button.secondary{background:#ffee6d;color:#0a0500}button.secondary:hover{background:#e8d95b}button.danger{background:#eb232b}.entry{display:block;width:100%;padding:.85rem .8rem;border-top:1px solid #edeff2;border-radius:6px;text-align:left;background:#fff;color:#403f37;font-weight:600}.entry:hover{background:#f9fafb;color:#005485;transform:none}
form{padding:1.5rem}form h2{margin:0 0 1rem;color:#0a0500;font-size:1.35rem}label{display:block;margin:1rem 0 .35rem;color:#403f37;font-size:.86rem;font-weight:800}input,textarea,select{width:100%;padding:.72rem .8rem;border:1px solid #dfe5e9;border-radius:6px;background:#fff;color:#403f37;outline:none}input:focus,textarea:focus,select:focus{border-color:#005485;box-shadow:0 0 0 3px rgb(0 84 133 / 12%)}textarea{min-height:115px;resize:vertical}.status{min-height:1.5rem;margin:.9rem 0;color:#005485;font-size:.9rem;font-weight:700}.form-actions{display:flex;gap:.7rem;align-items:center;flex-wrap:wrap;margin-top:1rem}.file-input{display:block;width:100%;margin-top:.45rem;padding:.65rem;border:1px dashed #9fb8c8;border-radius:6px;background:#f9fafb;color:#005485}.file-input::file-selector-button{margin-right:.7rem;border:0;border-radius:5px;padding:.5rem .75rem;background:#005485;color:#fff;font-weight:700;cursor:pointer}.uploaded-list{display:flex;flex-direction:column;gap:.35rem;margin-top:.5rem;color:#005485;font-size:.8rem}.uploaded-list span{padding:.45rem .6rem;border-radius:5px;background:#f1f7fa;overflow-wrap:anywhere}.attachment-preview{margin-top:.75rem;padding:.75rem;border:1px solid #dfe5e9;border-radius:8px;background:#f9fafb}.attachment-preview img{display:block;max-width:100%;max-height:360px;margin-bottom:.6rem;border-radius:5px;object-fit:contain;background:#fff}.attachment-preview iframe{display:block;width:100%;height:420px;border:0;border-radius:5px;background:#fff}.attachment-preview a{color:#005485;font-weight:700}
code{padding:.15rem .35rem;border-radius:4px;background:#edeff2;color:#005485}small{color:#dcecf4}@media(max-width:750px){main{margin-top:1.25rem;padding:0 1rem}.header-inner{padding:1rem}.layout{grid-template-columns:1fr}.toolbar-group{min-width:100%}form{padding:1rem}}
</style></head><body><header><div class="header-inner"><div class="brand"><span class="crest">M</span><div><strong>MTVC Content Manager</strong><small>Local, college-owned CMS</small></div></div><span>Mathioya Technical & Vocational College</span></div></header>
<main><section class="intro"><h1>Content Manager</h1><p>Manage public college content locally. Changes are saved as Markdown in <code>src/content</code> and appear on the website after its development server refreshes.</p></section>
<div class="toolbar"><div class="toolbar-group"><label for="type">Content section</label><select id="type"></select></div><button id="new">+ New entry</button><button class="secondary" id="site">Open website</button></div>
<div class="layout"><aside><div class="list-heading">Saved entries</div><div id="entries"></div></aside><form id="form"><p>Select a content type and entry, or create a new entry.</p></form></div></main>
<script>
const types=${JSON.stringify(types)}, fields=${JSON.stringify(fields)}, dateFields=${JSON.stringify(dateFields)}, requiredDateFields=${JSON.stringify(requiredDateFields)}, tenderTypes=${JSON.stringify(tenderTypes)}, state={type:types[0],slug:null,entries:[]};
const typeEl=document.querySelector('#type'), entriesEl=document.querySelector('#entries'), form=document.querySelector('#form');
function label(value){return value.replace(/[-_]/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\b\w/g,letter=>letter.toUpperCase())}
types.forEach(t=>typeEl.add(new Option(label(t),t)));
typeEl.onchange=()=>{state.type=typeEl.value;state.slug=null;load(true)};
document.querySelector('#new').onclick=()=>{state.slug=null;renderForm({data:{},body:''})};
document.querySelector('#site').onclick=()=>window.open('http://127.0.0.1:4321/','_blank');
async function load(clearForm=false){state.entries=await (await fetch('/api/content/'+state.type)).json();entriesEl.innerHTML=state.entries.map(e=>'<button class="entry" data-slug="'+e.slug+'">'+(e.data.title||e.slug)+'</button>').join('')||'<p class="empty">No entries yet.</p>';entriesEl.querySelectorAll('button').forEach(b=>b.onclick=()=>{state.slug=b.dataset.slug;renderForm(state.entries.find(e=>e.slug===state.slug))});if(clearForm)renderForm({data:{},body:''})}
function preview(path){if(!path)return '<div class="attachment-preview">No preview available yet.</div>';const lower=path.toLowerCase();if(lower.endsWith('.pdf'))return '<div class="attachment-preview"><iframe src="'+esc(path)+'" title="Attachment preview"></iframe><a href="'+esc(path)+'" target="_blank" rel="noreferrer">Open document in a new tab</a></div>';if(['.jpg','.jpeg','.png','.webp','.gif','.bmp','.svg','.avif','.tif','.tiff'].some(ext=>lower.endsWith(ext)))return '<div class="attachment-preview"><img src="'+esc(path)+'" alt="Uploaded attachment preview"><a href="'+esc(path)+'" target="_blank" rel="noreferrer">Open image in a new tab</a></div>';if(['.mp3','.wav','.m4a','.ogg','.aac'].some(ext=>lower.endsWith(ext)))return '<div class="attachment-preview"><audio controls preload="none" src="'+esc(path)+'"></audio><a href="'+esc(path)+'" target="_blank" rel="noreferrer">Open audio in a new tab</a></div>';if(['.mp4','.webm','.mov','.m4v'].some(ext=>lower.endsWith(ext)))return '<div class="attachment-preview"><video controls preload="metadata" src="'+esc(path)+'"></video><a href="'+esc(path)+'" target="_blank" rel="noreferrer">Open video in a new tab</a></div>';return '<div class="attachment-preview"><a href="'+esc(path)+'" target="_blank" rel="noreferrer">Open uploaded attachment</a></div>'}
function fieldControl(f,value){const type=f==='openingDate'?'datetime-local':dateFields.includes(f)?'date':'text';const safe=type==='date'&&value&&value.includes('/')?value.split('/').reverse().join('-'):value??(f==='homepageBanner'?false:'');const required=requiredDateFields[state.type]?.includes(f)?'required':'';const accept='application/pdf,image/*,audio/*,video/*';if(f==='type'&&state.type==='tenders')return '<select name="type" required>'+tenderTypes.map(option=>'<option value="'+option+'" '+(safe===option?'selected':'')+'>'+option+'</option>').join('')+'</select>';if(f==='image'||f==='attachment'||f==='englishAudio'||f==='swahiliAudio'||f==='pdf'||f==='document')return '<input type="hidden" name="'+f+'" value="'+esc(safe)+'"><small>Select a supported document, image, audio, or video file.</small><input class="file-input" type="file" accept="'+accept+'" data-target="'+f+'"><div class="uploaded-list" data-list="'+f+'">'+(safe?'<span>'+esc(safe)+'</span>':'No file selected.')+'</div><div data-preview="'+f+'">'+preview(safe)+'</div>';if(f==='attachments'||f==='videos'){const paths=Array.isArray(safe)?safe:[];return '<input type="hidden" name="'+f+'" value="'+esc(JSON.stringify(paths))+'"><small>Select one or more supported files.</small><input class="file-input" type="file" accept="'+accept+'" multiple data-target="'+f+'"><div class="uploaded-list" data-list="'+f+'">'+(paths.length?paths.map(path=>'<span>'+esc(typeof path==='string'?path:path.image)+'</span>').join(''):'No files selected.')+'</div><div data-preview="'+f+'">'+(paths.length?paths.map(path=>preview(typeof path==='string'?path:path.image)).join(''):'<div class="attachment-preview">No preview available yet.</div>')+'</div>'};if(f==='photos'){const photos=Array.isArray(safe)?safe:[];return '<input type="hidden" name="photos" value="'+esc(JSON.stringify(photos))+'"><small>Select one or more gallery images.</small><input class="file-input" type="file" accept="image/*" multiple data-target="photos"><div class="uploaded-list" data-list="photos">'+(photos.length?photos.map(photo=>'<span>'+esc(photo.image)+'</span>').join(''):'No photos selected.')+'</div><div data-preview="photos">'+(photos.length?photos.map(photo=>preview(photo.image)).join(''):'<div class="attachment-preview">No preview available yet.</div>')+'</div>'};return '<input type="'+type+'" name="'+f+'" value="'+esc(safe)+'" '+required+'>'}
function renderForm(entry){const data=entry.data||{};form.innerHTML='<h2>'+(state.slug?'Edit '+state.slug:'New '+label(state.type))+'</h2>'+fields[state.type].map(f=>'<label>'+label(f)+fieldControl(f,data[f])+'</label>').join('')+'<label>Body / Content<textarea name="body">'+esc(entry.body||'')+'</textarea></label><p class="status" id="status"></p><div class="form-actions"><button type="submit">Save And Publish Locally</button>'+(state.slug?' <button type="button" class="danger" id="delete">Delete</button>':'')+'</div>';form.querySelectorAll('.file-input').forEach(input=>input.onchange=uploadFiles);form.onsubmit=save;const del=document.querySelector('#delete');if(del)del.onclick=remove}
async function uploadFiles(e){const input=e.target;const target=input.dataset.target;const uploaded=[];for(const file of input.files){const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file)});const response=await fetch('/api/upload',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:file.name,data})});const result=await response.json();if(!response.ok){document.querySelector('#status').textContent=result.error;return}uploaded.push(result.path)}if(['image','attachment','englishAudio','swahiliAudio','pdf','document'].includes(target)){const path=uploaded[0]||'';document.querySelector('[name="'+target+'"]').value=path;document.querySelector('[data-list="'+target+'"]').innerHTML=path?'<span>'+esc(path)+'</span>':'No file selected.';document.querySelector('[data-preview="'+target+'"]').innerHTML=preview(path)}if(['attachments','videos'].includes(target)){const field=document.querySelector('[name="'+target+'"]');let current=[];try{current=field.value.trim()?JSON.parse(field.value):[]}catch{}const all=current.concat(uploaded);field.value=JSON.stringify(all);document.querySelector('[data-list="'+target+'"]').innerHTML=all.length?all.map(path=>'<span>'+esc(path)+'</span>').join(''):'No files selected.';document.querySelector('[data-preview="'+target+'"]').innerHTML=all.length?all.map(path=>preview(path)).join(''):'<div class="attachment-preview">No preview available yet.</div>'}if(target==='photos'){const field=document.querySelector('[name="photos"]');let current=[];try{current=field.value.trim()?JSON.parse(field.value):[]}catch{}const all=current.concat(uploaded.map(image=>({image})));field.value=JSON.stringify(all);document.querySelector('[data-list="photos"]').innerHTML=all.length?all.map(photo=>'<span>'+esc(photo.image)+'</span>').join(''):'No photos selected.';document.querySelector('[data-preview="photos"]').innerHTML=all.length?all.map(photo=>preview(photo.image)).join(''):'<div class="attachment-preview">No preview available yet.</div>'}input.value='';document.querySelector('#status').textContent='Upload complete. Save the entry to keep the file link.'}
async function save(e){e.preventDefault();const data={};for(const f of fields[state.type]){let value=e.target.elements[f].value;if(requiredDateFields[state.type]?.includes(f)&&!value){document.querySelector('#status').textContent=label(f)+' is required.';return}if(f==='type'&&state.type==='tenders'){value=tenderTypes.find(option=>option.toLowerCase()===value.toLowerCase())||value}if(['attachments','photos'].includes(f)){if(!value.trim()){value=[]}else{try{value=JSON.parse(value)}catch{document.querySelector('#status').textContent=label(f)+' must be a valid JSON list, or left empty.';return}if(!Array.isArray(value)){document.querySelector('#status').textContent=label(f)+' must be a JSON list, for example ["/uploads/notice.pdf"].';return}}}if(f==='homepageBanner')value=value==='true';data[f]=value}if(state.type==='tenders'&&!tenderTypes.includes(data.type)){document.querySelector('#status').textContent='Select a valid tender type.';return}const response=await fetch('/api/content',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:state.type,slug:state.slug,data,body:e.target.elements.body.value})});const result=await response.json();document.querySelector('#status').textContent=result.message||result.error;if(response.ok){state.slug=result.slug;await load();renderForm(state.entries.find(x=>x.slug===state.slug))}}
async function remove(){if(!confirm('Delete this entry?'))return;await fetch('/api/content/'+state.type+'/'+state.slug,{method:'DELETE'});state.slug=null;await load();form.innerHTML='<p>Entry deleted.</p>'}
function esc(v){return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}
load(true);
</script></body></html>`;

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  if (url.pathname === "/" || url.pathname === "/admin/") return send(response, 200, adminPage, "text/html");
  if (url.pathname.startsWith("/uploads/") && request.method === "GET") {
    const name = decodeURIComponent(url.pathname.slice("/uploads/".length));
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) return send(response, 400, { error: "Invalid upload path." });
    const extension = extname(name).toLowerCase();
    if (!allowedUploadExtensions.has(extension)) return send(response, 404, { error: "Upload not found." });
    try {
      const file = await readFile(join(uploadRoot, name));
      return send(response, 200, file, uploadMimeTypes[extension] ?? "application/octet-stream");
    } catch (error) {
      if (error.code === "ENOENT") return send(response, 404, { error: "Upload not found." });
      throw error;
    }
  }
  if (url.pathname.startsWith("/api/content/") && request.method === "GET") return send(response, 200, await listEntries(url.pathname.split("/")[3]));
  if (url.pathname === "/api/upload" && request.method === "POST") {
    let raw = "";
    for await (const chunk of request) {
      raw += chunk;
      if (raw.length > 15_000_000) return send(response, 413, { error: "The file is too large. Maximum upload size is 10 MB." });
    }
    const input = JSON.parse(raw);
    const extension = extname(String(input.name ?? "")).toLowerCase();
    if (!allowedUploadExtensions.has(extension)) return send(response, 400, { error: "Upload a supported document, image, audio, or video file." });
    if (typeof input.data !== "string") return send(response, 400, { error: "The uploaded file data is missing." });
    const safeName = `${Date.now()}-${String(input.name).toLowerCase().replace(/[^a-z0-9._-]/g, "-")}`;
    await mkdir(uploadRoot, { recursive: true });
    await writeFile(join(uploadRoot, safeName), Buffer.from(input.data, "base64"));
    return send(response, 200, { path: `/uploads/${safeName}` });
  }
  if (url.pathname === "/api/content" && request.method === "POST") {
    let raw = ""; for await (const chunk of request) raw += chunk;
    const input = JSON.parse(raw);
    if (!types.includes(input.type) || !input.data?.title && input.type !== "service-charter") return send(response, 400, { error: "A valid content type and required title are needed." });
    if (input.type === "tenders") input.data.type = normaliseTenderType(input.data.type);
    if (input.type === "tenders" && !tenderTypes.includes(input.data.type)) return send(response, 400, { error: "Tender Type must be Tender, Prequalification, Addendum, or Notice." });
    const slug = (input.slug || input.data.title || "current").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const directory = join(contentRoot, input.type); await mkdir(directory, { recursive: true });
    await writeFile(join(directory, `${slug}.md`), markdown(input.data, input.body), "utf8");
    return send(response, 200, { message: "Saved. Rebuild or refresh the Astro site to see the published entry.", slug });
  }
  if (url.pathname.startsWith("/api/content/") && request.method === "DELETE") {
    const [, , , type, slug] = url.pathname.split("/");
    if (!types.includes(type)) return send(response, 400, { error: "Invalid content type." });
    const { unlink } = await import("node:fs/promises"); await unlink(join(contentRoot, type, `${slug}.md`));
    return send(response, 200, { message: "Deleted." });
  }
  send(response, 404, { error: "Not found." });
});
server.listen(port, "127.0.0.1", () => console.log(`MTVC CMS running at http://127.0.0.1:${port}/admin/`));
