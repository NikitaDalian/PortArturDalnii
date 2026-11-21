export function validateFleetOverview(overview,hardware,notes){
  const errors=[];
  const present=value=>typeof value==='string'&&value.trim().length>0;
  for(const field of ['title','dek'])if(!present(overview[field]))errors.push(`fleet_overview: missing ${field}`);
  if(!overview.intro?.length||overview.intro.some(value=>!present(value)))errors.push('fleet_overview: missing introduction');
  if(!Array.isArray(overview.sources)||overview.sources.length<2)errors.push('fleet_overview: insufficient editorial sources');
  for(const [index,source] of (overview.sources??[]).entries())if(source.id!==index+1||!/^https:\/\//.test(source.url)||!['title','author','date','locator','note'].every(key=>present(source[key])))errors.push('fleet_overview: invalid editorial source');
  const sectionIds=new Set(['sources','comparison-title']);
  if((overview.sections?.length??0)<2)errors.push('fleet_overview: incomplete editorial explanation');
  for(const section of overview.sections??[]){
    if(!/^[a-z][a-z0-9-]*$/.test(section.id)||section.id.startsWith('source-')||sectionIds.has(section.id))errors.push('fleet_overview: invalid section ID');
    sectionIds.add(section.id);
    if(!present(section.title)||!section.paragraphs?.length||section.paragraphs.some(value=>!present(value)))errors.push('fleet_overview: empty editorial section');
    if(!section.refs?.length||section.refs.some(ref=>!Number.isInteger(ref)||ref<1||ref>(overview.sources?.length??0)))errors.push('fleet_overview: invalid editorial reference');
  }
  if(!Array.isArray(overview.relatedNotes)||overview.relatedNotes.some(slug=>!notes.has(slug)))errors.push('fleet_overview: invalid related note');
  const known=new Set(hardware.filter(item=>item.kind==='ship').map(item=>item.slug));
  const rows=overview.ships??[];
  const included=new Set(rows.map(row=>row.shipSlug));
  if(!rows.length||included.size!==rows.length||included.size!==known.size||[...known].some(slug=>!included.has(slug)))errors.push('fleet_overview: comparison must cover each published ship once');
  for(const row of rows){
    if(!known.has(row.shipSlug))errors.push(`fleet_overview/${row.shipSlug}: unknown ship`);
    if(!['port-arthur','second-pacific','chemulpo','japanese'].includes(row.group)||!['battleship','armored-cruiser','protected-cruiser','destroyer'].includes(row.profile))errors.push(`fleet_overview/${row.shipSlug}: invalid historical group or profile`);
    for(const field of ['lengthOverallM','normalDisplacementTonnes'])if(row[field]!==null&&(typeof row[field]!=='number'||!Number.isFinite(row[field])||row[field]<=0))errors.push(`fleet_overview/${row.shipSlug}: invalid comparable measurement ${field}`);
    if(!present(row.measurementNote)||!row.sources?.length||row.sources.some(source=>!/^https:\/\//.test(source.url)||!present(source.title)||!present(source.locator)))errors.push(`fleet_overview/${row.shipSlug}: missing measurement provenance`);
    const art=row.illustration;
    // The comparison now shows archival photographs and a length bar.
    if(art===null)continue;
    if(!art||art.file!==`images/fleet/${row.shipSlug}.svg`||!present(art.note)||!art.sourceUrls?.length||art.sourceUrls.some(url=>!/^https:\/\//.test(url)))errors.push(`fleet_overview/${row.shipSlug}: missing illustration provenance`);
    if(!art||![art.hullStart,art.hullEnd].every(Number.isFinite)||art.hullStart<0||art.hullEnd>1200||art.hullEnd<=art.hullStart)errors.push(`fleet_overview/${row.shipSlug}: invalid hull bounds for scale`);
  }
  return errors;
}
