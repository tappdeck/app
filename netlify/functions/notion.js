exports.handler = async function () {
  const token = process.env.NOTION_API_KEY;
  const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;
  if (!token || !dataSourceId) return json(500,{error:'Missing NOTION_API_KEY or NOTION_DATA_SOURCE_ID environment variable.'});

  try {
    const results = [];
    let cursor = undefined;
    let requests = 0;
    let lastHasMore = false;
    const MAX_REQUESTS = 500; // supports up to 50,000 leads at 100 per request

    do {
      const body = { page_size: 100 };
      if (cursor) body.start_cursor = cursor;

      const r = await fetch(`https://api.notion.com/v1/data_sources/${dataSourceId}/query`, {
        method:'POST',
        headers:{
          Authorization:`Bearer ${token}`,
          'Notion-Version':'2026-03-11',
          'Content-Type':'application/json'
        },
        body:JSON.stringify(body)
      });

      const d = await r.json();
      requests++;
      if(!r.ok) return json(r.status,{error:d.message||'Notion API request failed.',details:d});

      results.push(...(d.results||[]));
      lastHasMore = Boolean(d.has_more && d.next_cursor);
      cursor = d.next_cursor || undefined;

      if (lastHasMore && requests >= MAX_REQUESTS) {
        return json(502,{error:`The CRM is larger than the safe pagination limit (${(MAX_REQUESTS*100).toLocaleString()} leads). Increase MAX_REQUESTS in the function.`});
      }
    } while (lastHasMore);

    const pages = results.map(page => {
      const p = page.properties || {};
      const status = readValue(p, 'Lead Status') || 'New Lead';
      return {
        id: page.id,
        url: page.url,
        name: readTitle(p) || 'Untitled lead',
        status,
        company: readValue(p,'Company'),
        contactPerson: readValue(p,'Contact Person'),
        phone: readValue(p,'Phone Number'),
        email: readValue(p,'Email'),
        brands: readMultiValue(p,['Brands','Brand']),
        product: readAnyValue(p,['NFC Product','Product','Card Package']),
        cardStyle: readAnyValue(p,['Card Style','Finish']),
        quantity: readAnyNumber(p,['Quantity','Order Quantity','Card Quantity']),
        dealValue: readAnyNumber(p,['Deal Value','Quote Value','Order Value']),
        source: readAnyValue(p,['Lead Source','Source']),
        lastContacted: readDate(p,'Last Contacted'),
        nextActionDate: readDate(p,'Next action'),
        qualifiedDate: readDate(p,'Qualified Date'),
        proposalSentDate: readDate(p,'Proposal Sent Date'),
        wonDate: readDate(p,'Won Date'),
        lostDate: readDate(p,'Lost Date'),
        lastEdited: page.last_edited_time || null
      };
    });

    const brands = [...new Set(pages.flatMap(p=>p.brands||[]).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    const statuses={};
    for(const page of pages) statuses[page.status]=(statuses[page.status]||0)+1;

    return json(200,{
      total:pages.length,
      fetchedPages:pages.length,
      requests,
      paginationComplete:!lastHasMore,
      statuses,
      brands,
      pages
    });
  } catch(e) {
    return json(500,{error:e.message});
  }
};

function prop(p,name){
  if (p[name]) return p[name];
  const wanted=name.toLowerCase().trim();
  const key=Object.keys(p).find(k=>k.toLowerCase().trim()===wanted);
  return key ? p[key] : null;
}
function propAny(p,names){for(const name of names){ const x=prop(p,name); if(x) return x; } return null;}
function readValue(p,name){
  const x=prop(p,name); if(!x) return '';
  if(x.type==='status') return x.status?.name||'';
  if(x.type==='select') return x.select?.name||'';
  if(x.type==='multi_select') return (x.multi_select||[]).map(v=>v.name).join(', ');
  if(x.type==='rich_text') return (x.rich_text||[]).map(v=>v.plain_text||'').join('');
  if(x.type==='title') return (x.title||[]).map(v=>v.plain_text||'').join('');
  if(x.type==='phone_number') return x.phone_number||'';
  if(x.type==='email') return x.email||'';
  if(x.type==='url') return x.url||'';
  if(x.type==='number') return x.number==null?'':String(x.number);
  return '';
}
function readMultiValue(p,names){
  const x=propAny(p,names); if(!x) return [];
  if(x.type==='multi_select') return (x.multi_select||[]).map(v=>v.name).filter(Boolean);
  if(x.type==='select') return x.select?.name?[x.select.name]:[];
  if(x.type==='rich_text') return (x.rich_text||[]).map(v=>v.plain_text||'').join('').split(',').map(v=>v.trim()).filter(Boolean);
  return [];
}
function readAnyValue(p,names){for(const name of names){const value=readValue(p,name);if(value)return value;}return '';}
function readAnyNumber(p,names){for(const name of names){const x=prop(p,name);if(!x)continue;if(x.type==='number'&&x.number!=null)return x.number;const value=readValue(p,name);if(value&&!Number.isNaN(Number(value)))return Number(value);}return null;}
function readTitle(p){for(const x of Object.values(p)){if(x?.type==='title') return (x.title||[]).map(v=>v.plain_text||'').join('');}return '';}
function readDate(p,name){const x=prop(p,name);return x?.type==='date'?(x.date?.start||null):null;}
function json(status,body){return {statusCode:status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(body)};}
