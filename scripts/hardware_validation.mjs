// Validation is independent of rendering and cannot create map entities.
export function validateHardware(records, { assetsExist, people, places, notes, essays, sources, periods }) {
  const errors=[];
  const bySlug=new Map(records.map(item=>[item.slug,item]));
  if(bySlug.size!==records.length)errors.push('hardware: duplicate slug');
  const present=value=>typeof value==='string'&&value.trim().length>0;
  for(const item of records){
    const name=`hardware/${item.slug}`;
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)||item.slug==='v-masshtabe')errors.push(`${name}: invalid or reserved slug`);
    if(!['ship','weapon'].includes(item.kind))errors.push(`${name}: invalid kind`);
    for(const field of ['lat','lng','coordinates','polyline','map'])if(field in item)errors.push(`${name}: hardware must not contain map geometry`);
    for(const field of ['name','shortName','category','summary'])if(!present(item[field]))errors.push(`${name}: missing ${field}`);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(item.updatedAt))errors.push(`${name}: invalid review date`);
    if(!Array.isArray(item.aliases)||!item.aliases.length||item.aliases.some(alias=>!present(alias)||alias.length>90)||new Set(item.aliases).size!==item.aliases.length)errors.push(`${name}: invalid aliases`);
    if(!item.countries?.length||item.countries.some(country=>!['russia','japan','china','other'].includes(country)))errors.push(`${name}: invalid countries`);
    if(!item.periods?.length||item.periods.some(period=>!periods.has(period)))errors.push(`${name}: invalid periods`);
    if(!item.intro?.length||item.intro.some(paragraph=>!present(paragraph)))errors.push(`${name}: missing introduction`);
    if(!Array.isArray(item.sources)||item.sources.length<2)errors.push(`${name}: at least two checked sources required`);
    for(const [index,source] of (item.sources??[]).entries()){
      if(source.id!==index+1||!/^https:\/\//.test(source.url)||!['title','author','date','locator','note'].every(field=>present(source[field])))errors.push(`${name}: incomplete or misnumbered source`);
    }
    const refs=(value,field)=>{if(!Array.isArray(value)||!value.length||value.some(id=>!Number.isInteger(id)||id<1||id>(item.sources?.length??0)))errors.push(`${name}/${field}: invalid source reference`);};
    const sectionIds=new Set(['story','specifications','armament','crew','timeline','sources']);
    if((item.sections?.length??0)<3)errors.push(`${name}: incomplete narrative`);
    for(const section of item.sections??[]){
      if(!/^[a-z][a-z0-9-]*$/.test(section.id)||sectionIds.has(section.id)||section.id.startsWith('source-'))errors.push(`${name}: invalid or reserved section ID`);
      sectionIds.add(section.id);
      if(!present(section.title)||!section.paragraphs?.length||section.paragraphs.some(paragraph=>!present(paragraph)))errors.push(`${name}: empty section`);
      refs(section.refs,section.id);
    }
    if((item.specifications?.length??0)<4)errors.push(`${name}: insufficient specifications`);
    for(const row of item.specifications??[]){if(!present(row.label)||!present(row.value)||typeof row.note!=='string')errors.push(`${name}: incomplete specification`);refs(row.refs,'specifications');}
    if((item.timeline?.length??0)<3)errors.push(`${name}: incomplete timeline`);
    for(const event of item.timeline??[]){if(!Number.isInteger(event.year)||!['date','title','text'].every(field=>present(event[field])))errors.push(`${name}: incomplete timeline event`);refs(event.refs,'timeline');}
    if(!Array.isArray(item.crew)||!Array.isArray(item.armament))errors.push(`${name}: missing crew or armament array`);
    for(const member of item.crew??[]){if(!present(member.name)||!present(member.role)||(member.personSlug!==null&&!people.has(member.personSlug)))errors.push(`${name}: invalid associated person`);refs(member.refs,'crew');}
    for(const installation of item.armament??[]){
      if(item.kind!=='ship'||bySlug.get(installation.weaponSlug)?.kind!=='weapon')errors.push(`${name}: missing or invalid weapon relationship ${installation.weaponSlug}`);
      if(installation.count!==null&&(!Number.isInteger(installation.count)||installation.count<1))errors.push(`${name}: invalid gun count`);
      if(!present(installation.period)||!present(installation.note))errors.push(`${name}: undated or unexplained installation`);
      refs(installation.refs,'armament');
    }
    if(!Array.isArray(item.images)||!item.images.length)errors.push(`${name}: no verified illustration`);
    for(const picture of item.images??[]){
      if(!/^\/images\/(hardware|essays)\/[a-z0-9-]+\.webp$/.test(picture.file)||!assetsExist(picture.file))errors.push(`${name}: missing image ${picture.file}`);
      if(!['alt','caption','credit','license'].every(field=>present(picture[field]))||!/^https:\/\//.test(picture.sourceUrl))errors.push(`${name}: incomplete image provenance`);
      if(!Number.isInteger(picture.width)||!Number.isInteger(picture.height)||picture.width<1||picture.height<1)errors.push(`${name}: invalid image dimensions`);
    }
    for(const [field,target] of Object.entries({relatedNotes:notes,relatedEssays:essays,relatedPeople:people,relatedPlaces:places,relatedSources:sources})){
      if(!Array.isArray(item[field])||item[field].some(slug=>!target.has(slug))||new Set(item[field]).size!==item[field].length)errors.push(`${name}: invalid ${field}`);
    }
    if(!Array.isArray(item.limitations)||item.limitations.some(value=>!present(value)))errors.push(`${name}: invalid source limitations`);
  }
  return errors;
}
